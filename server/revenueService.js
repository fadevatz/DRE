// Serviço otimizado para cálculo fiscal de Receita Bruta, Deduções e CMV
// Prioriza o consumo da view 'vw_dre_faturamento_cmv' criada no MariaDB para máxima velocidade.
// Caso a view não esteja disponível, possui fallback automático para as tabelas fiscais de origem.

function buildDateRange(dtInicio, dtFim) {
  const dInicio = dtInicio && dtInicio.trim() !== '' 
    ? dtInicio.trim().split('T')[0]
    : '2024-01-01';

  const dFim = dtFim && dtFim.trim() !== '' 
    ? dtFim.trim().split('T')[0]
    : '2026-12-31';

  return { dInicio, dFim };
}

// Regra de filial: Filial 1 (Escritório) ou 'todas' consolida todas as lojas
function isFilialRestricted(filialId) {
  if (!filialId || filialId === 'todas' || String(filialId) === '1') {
    return false;
  }
  return true;
}

// Mapeia origem e tipo da view para código contábil da DRE e descrição amigável
function mapOrigemToConta(tipo, origem) {
  const orig = (origem || '').toUpperCase();

  if (tipo === 'RECEITA_BRUTA') {
    if (orig.includes('ECF')) {
      return { codigo: '1.01.001', descricao: 'Cupons ECF (Redução Z)' };
    }
    if (orig.includes('TALÃO') || orig.includes('TALAO')) {
      return { codigo: '1.01.001', descricao: 'Notas Fiscais de Consumidor (Talão Mod. 02)' };
    }
    if (orig.includes('NFC-E')) {
      return { codigo: '1.01.003', descricao: 'NFC-e (Nota Fiscal Consumidor Eletrônica Mod. 65)' };
    }
    if (orig.includes('NF/NF-E') || orig.includes('VENDA')) {
      return { codigo: '1.01.004', descricao: 'NF/NF-e de Venda (Mod. 55 e 01)' };
    }
    if (orig.includes('RPS')) {
      return { codigo: '1.01.005', descricao: 'RPS (Recibo Provisório de Serviços)' };
    }
    if (orig.includes('SAT')) {
      return { codigo: '1.01.007', descricao: 'Cupons SAT/CF-e' };
    }
    return { codigo: '1.01.004', descricao: origem || 'Receita Bruta de Vendas' };
  }

  if (tipo === 'DEDUCAO') {
    if (orig.includes('DEVOLUÇÃO') || orig.includes('DEVOLUCAO')) {
      return { codigo: '1.02.007', descricao: 'NF/NF-e de Devolução de Clientes' };
    }
    if (orig.includes('CANCELAMENTO') || orig.includes('ESTORNO')) {
      return { codigo: '1.02.007', descricao: `Cancelamentos (${origem})` };
    }
    if (orig.includes('DESCONTO')) {
      return { codigo: '3.06.008', descricao: `Descontos Concedidos (${origem})` };
    }
    if (orig.includes('DAS') || orig.includes('SIMPLES')) {
      return { codigo: '2.02.007', descricao: 'DAS Simples Nacional / Tributos Diretos' };
    }
    if (orig.includes('ICMS')) {
      return { codigo: '2.02.003', descricao: 'ICMS sobre Vendas' };
    }
    if (orig.includes('PIS')) {
      return { codigo: '2.02.004', descricao: 'PIS/PASEP sobre Vendas' };
    }
    if (orig.includes('COFINS')) {
      return { codigo: '2.02.005', descricao: 'COFINS sobre Vendas' };
    }
    return { codigo: '1.02.007', descricao: origem || 'Deduções sobre Vendas' };
  }

  if (tipo === 'CMV') {
    return { 
      codigo: '2.01.001', 
      descricao: orig.includes('PMC') 
        ? 'Custo das Mercadorias Vendidas (CMV - PMC Estoque)' 
        : (origem || 'Custo das Mercadorias Vendidas') 
    };
  }

  return { codigo: '9.99.999', descricao: origem };
}

// 1. Consulta rápida diretamente na View 'vw_dre_faturamento_cmv'
async function fetchFromView(pool, { filialId, dInicio, dFim, filterByFilial }) {
  let sql = `
    SELECT 
      tipo, 
      origem, 
      COALESCE(SUM(valor), 0.00) AS total_valor, 
      COUNT(*) AS qtd_lancamentos
    FROM vw_dre_faturamento_cmv
    WHERE data_movimento BETWEEN ? AND ?
  `;
  const params = [dInicio, dFim];

  if (filterByFilial) {
    sql += ` AND filial_id = ? `;
    params.push(filialId);
  }

  sql += `
    GROUP BY tipo, origem
    ORDER BY tipo, total_valor DESC
  `;

  const [rows] = await pool.query(sql, params);

  const itensReceita = [];
  const itensDeducoes = [];
  const itensCmv = [];

  for (const row of rows) {
    const val = Number(row.total_valor || 0);
    if (val <= 0) continue;

    const mapped = mapOrigemToConta(row.tipo, row.origem);
    const item = {
      codigo: mapped.codigo,
      descricao: mapped.descricao,
      total_valor: val,
      qtd_lancamentos: Number(row.qtd_lancamentos || 0)
    };

    if (row.tipo === 'RECEITA_BRUTA') {
      itensReceita.push(item);
    } else if (row.tipo === 'DEDUCAO') {
      itensDeducoes.push(item);
    } else if (row.tipo === 'CMV') {
      itensCmv.push(item);
    }
  }

  return { itensReceita, itensDeducoes, itensCmv };
}

// 2. Fallback caso a view não exista ou falhe
async function fetchFromRawTables(pool, { filialId, dInicio, dFim, filterByFilial }) {
  const filialClause = (fieldName) => {
    return filterByFilial ? `AND ${fieldName} = ?` : '';
  };

  const getParams = (extraParams = []) => {
    const params = [];
    if (filterByFilial) params.push(filialId);
    params.push(`${dInicio} 00:00:00`, `${dFim} 23:59:59`);
    return [...params, ...extraParams];
  };

  const itensReceita = [];
  const itensDeducoes = [];
  const itensCmv = [];

  // ECF
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(r02.venda_bruta), 0.00) as valor, COUNT(*) as qtd
      FROM paf_req25_r02 AS r02
      WHERE r02.apagado = 'N'
        ${filialClause('r02.filial_id')}
        AND r02.data_mov BETWEEN ? AND ?
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.001', descricao: 'Cupons ECF (Redução Z)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // SAT / CF-e
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(si.valor_total_bruto + si.valor_despesas + si.valor_rateio_despesas), 0.00) as valor,
             COUNT(DISTINCT s.sat_cfe_id) as qtd
      FROM sat_cfe AS s
      JOIN sat_cfe_item AS si ON s.sat_cfe_id = si.sat_cfe_id
      WHERE s.tipo_ambiente = 1
        AND s.apagado = 'N'
        ${filialClause('s.filial_id')}
        AND s.dt_emissao BETWEEN DATE(?) AND DATE(?)
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.007', descricao: 'Cupons SAT/CF-e', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // NF-e Venda
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_produtos + nf.valor_frete + nf.valor_seguro + nf.outras_depesas + nf.valor_icms_subst), 0.00) as valor,
             COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.tipo_nota = 'V'
        AND ((nf.modelo = '55' AND nf.ambiente_nfe = 1 AND nf.status_nfe = 'P') OR (nf.modelo = '01'))
        AND nf.cfop NOT IN ('5.551', '5.552', '5.553', '5.554', '5.555', '6.551', '6.552', '6.553', '6.554', '6.555')
        AND nf.apagado = 'N'
        AND nf.conferida = 'S'
        ${filialClause('nf.filial_id')}
        AND nf.data_emissao BETWEEN ? AND ?
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.004', descricao: 'NF/NF-e de venda (Mod. 55 e 01)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // Talão
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_produtos + nf.valor_frete + nf.valor_seguro + nf.outras_depesas + nf.valor_icms_subst), 0.00) as valor,
             COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.modelo = '02'
        AND nf.tipo_nota = 'V'
        AND nf.cfop IN ('5.102', '5.403', '5.405', '5.933')
        AND nf.apagado = 'N'
        AND nf.conferida = 'S'
        ${filialClause('nf.filial_id')}
        AND nf.data_emissao BETWEEN ? AND ?
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.001', descricao: 'Notas fiscais de consumidor (talão Mod. 02)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // NFC-e
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_produtos + nf.valor_frete + nf.valor_seguro + nf.outras_depesas), 0.00) as valor,
             COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.modelo = '65'
        AND (nf.status_nfe = 'E' OR nf.status_nfe = 'P')
        AND nf.tipo_nota = 'F'
        AND nf.ambiente_nfe = 1
        AND nf.apagado = 'N'
        AND nf.conferida = 'S'
        ${filialClause('nf.filial_id')}
        AND nf.data_emissao BETWEEN ? AND ?
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.003', descricao: 'NFC-e (Mod. 65)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // RPS
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(ri.vl_total_bruto + ri.vl_rateio_taxa_entrega), 0.00) as valor,
             COUNT(DISTINCT r.rps_id) as qtd
      FROM rps AS r
      JOIN rps_item AS ri ON r.filial_id = ri.filial_id AND r.rps_id = ri.rps_id
      WHERE r.apagado = 'N'
        ${filialClause('r.filial_id')}
        AND r.dt_hr_emissao BETWEEN ? AND ?
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.005', descricao: 'RPS (Recibo Provisório de Serviços)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // Devoluções
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_produtos + nf.valor_frete + nf.valor_seguro + nf.outras_depesas - nf.total_desconto - (nf.total_cofins + nf.valor_icms + nf.total_fcp + nf.valor_issqn + nf.total_pis)), 0.00) as valor,
             COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.apagado = 'N'
        AND nf.cancelada = 'N'
        AND nf.conferida = 'S'
        AND nf.tipo_nota = 'C'
        AND ((nf.modelo = '55' AND nf.ambiente_nfe = 1 AND nf.status_nfe = 'P') OR (nf.modelo = '01'))
        ${filialClause('nf.filial_id')}
        AND nf.data_emissao BETWEEN ? AND ?
    `, getParams());
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensDeducoes.push({ codigo: '1.02.007', descricao: 'NF/NF-e de Devolução cliente', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // Descontos / Cancelamentos NF-e
  try {
    const [rowsDescNFe] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_desconto), 0.00) as valor, COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.tipo_nota IN ('V', 'F')
        AND nf.apagado = 'N' AND nf.conferida = 'S' AND nf.cancelada = 'N'
        ${filialClause('nf.filial_id')}
        AND nf.data_emissao BETWEEN ? AND ?
    `, getParams());
    const valDesc = Number(rowsDescNFe[0]?.valor || 0);
    if (valDesc > 0) {
      itensDeducoes.push({ codigo: '3.06.008', descricao: 'Descontos Concedidos em Notas/NFC-e', total_valor: valDesc, qtd_lancamentos: Number(rowsDescNFe[0]?.qtd || 0) });
    }

    const [rowsCancNFe] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_produtos + nf.valor_frete + nf.valor_seguro + nf.outras_depesas), 0.00) as valor, COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.tipo_nota IN ('V', 'F')
        AND nf.cancelada = 'S'
        AND nf.apagado = 'N' AND nf.conferida = 'S'
        ${filialClause('nf.filial_id')}
        AND nf.data_emissao BETWEEN ? AND ?
    `, getParams());
    const valCanc = Number(rowsCancNFe[0]?.valor || 0);
    if (valCanc > 0) {
      itensDeducoes.push({ codigo: '1.02.007', descricao: 'Cancelamentos NF-e / NFC-e', total_valor: valCanc, qtd_lancamentos: Number(rowsCancNFe[0]?.qtd || 0) });
    }
  } catch (e) {}

  // Descontos / Cancelamentos SAT
  try {
    const [rowsDescSat] = await pool.query(`
      SELECT COALESCE(SUM(s.total_descontos), 0.00) as valor, COUNT(*) as qtd
      FROM sat_cfe AS s
      WHERE s.tipo_ambiente = 1 AND s.apagado = 'N' AND s.cancelado = 'N'
        ${filialClause('s.filial_id')}
        AND s.dt_emissao BETWEEN DATE(?) AND DATE(?)
    `, getParams());
    const valDescSat = Number(rowsDescSat[0]?.valor || 0);
    if (valDescSat > 0) {
      itensDeducoes.push({ codigo: '3.06.008', descricao: 'Descontos SAT/CF-e', total_valor: valDescSat, qtd_lancamentos: Number(rowsDescSat[0]?.qtd || 0) });
    }

    const [rowsCancSat] = await pool.query(`
      SELECT COALESCE(SUM(s.total_cfe), 0.00) as valor, COUNT(*) as qtd
      FROM sat_cfe AS s
      WHERE s.tipo_ambiente = 1 AND s.apagado = 'N' AND s.cancelado = 'S'
        ${filialClause('s.filial_id')}
        AND s.dt_emissao BETWEEN DATE(?) AND DATE(?)
    `, getParams());
    const valCancSat = Number(rowsCancSat[0]?.valor || 0);
    if (valCancSat > 0) {
      itensDeducoes.push({ codigo: '1.02.007', descricao: 'Cancelamentos SAT/CF-e', total_valor: valCancSat, qtd_lancamentos: Number(rowsCancSat[0]?.qtd || 0) });
    }
  } catch (e) {}

  // DAS
  try {
    const [rowsDas] = await pool.query(`
      SELECT COALESCE(SUM(p.valor_doc), 0.00) as valor, COUNT(*) as qtd
      FROM pagar AS p
      JOIN planocontas AS pc ON pc.planocontas_id = p.planocontas_id AND pc.operacao = 'D' AND pc.totalizador = 'S'
      JOIN filial AS f ON f.filial_id = p.dafilial_id
      WHERE p.valor_doc > 0.0
        AND p.planocontas_id IN (32, 33, 34, 36)
        AND p.apagado = 'N'
        AND f.cod_regime_tribut IN ('SN', 'SE')
        ${filialClause('p.dafilial_id')}
        AND p.dt_emissao BETWEEN ? AND ?
    `, getParams());
    const valDas = Number(rowsDas[0]?.valor || 0);
    if (valDas > 0) {
      itensDeducoes.push({ codigo: '2.02.007', descricao: 'DAS Simples Nacional / Impostos Diretos', total_valor: valDas, qtd_lancamentos: Number(rowsDas[0]?.qtd || 0) });
    }
  } catch (e) {}

  // CMV
  try {
    const [rowsCmv] = await pool.query(`
      SELECT COALESCE(SUM(m.quanti_uni * m.pmc), 0.00) AS valor, COUNT(*) as qtd
      FROM movment AS m
      WHERE m.cancelado = 'N'
        AND m.apagado = 'N'
        AND m.oper IN (2, 3)
        AND ((m.entrega = 'N') OR (m.dtchegada_entrega IS NOT NULL))
        ${filialClause('m.filial_id')}
        AND m.data_hora BETWEEN ? AND ?
    `, getParams());
    const valCmv = Number(rowsCmv[0]?.valor || 0);
    if (valCmv > 0) {
      itensCmv.push({
        codigo: '2.01.001',
        descricao: 'Custo das Mercadorias Vendidas (CMV - Movimento Estoque)',
        total_valor: valCmv,
        qtd_lancamentos: Number(rowsCmv[0]?.qtd || 0)
      });
    }
  } catch (e) {}

  return { itensReceita, itensDeducoes, itensCmv };
}

async function getFiscalRevenueAndCmv(pool, { filialId, dtInicio, dtFim }) {
  if (!pool) return null;

  const { dInicio, dFim } = buildDateRange(dtInicio, dtFim);
  const filterByFilial = isFilialRestricted(filialId);

  let result = null;

  // 1. Tentar pela VIEW vw_dre_faturamento_cmv (Super Rápida)
  try {
    result = await fetchFromView(pool, { filialId, dInicio, dFim, filterByFilial });
  } catch (errView) {
    console.warn('View vw_dre_faturamento_cmv não encontrada ou com erro, usando fallback:', errView.message);
  }

  // 2. Se a view não retornou (ou falhou), executar o fallback pelas tabelas
  if (!result) {
    try {
      result = await fetchFromRawTables(pool, { filialId, dInicio, dFim, filterByFilial });
    } catch (errRaw) {
      console.error('Erro no fallback de faturamento e CMV:', errRaw.message);
      return null;
    }
  }

  const itensReceita = result.itensReceita || [];
  const itensDeducoes = result.itensDeducoes || [];
  const itensCmv = result.itensCmv || [];

  const totalReceitaBruta = itensReceita.reduce((acc, i) => acc + i.total_valor, 0);
  const totalDeducoes = itensDeducoes.reduce((acc, i) => acc + i.total_valor, 0);
  const totalReceitaLiquida = totalReceitaBruta - totalDeducoes;
  const totalCmv = itensCmv.reduce((acc, i) => acc + i.total_valor, 0);
  const totalResultadoBruto = totalReceitaLiquida - totalCmv;

  return {
    itensReceita,
    itensDeducoes,
    itensCmv,
    totalReceitaBruta,
    totalDeducoes,
    totalReceitaLiquida,
    totalCmv,
    totalResultadoBruto
  };
}

module.exports = {
  getFiscalRevenueAndCmv,
  mapOrigemToConta
};
