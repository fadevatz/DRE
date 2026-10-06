// Serviço otimizado para cálculo fiscal de Receita Bruta, Deduções e CMV
// Prioriza o consumo da view 'vw_dre_faturamento_cmv' criada no MariaDB para máxima velocidade.
// Caso a view não esteja disponível, possui fallback automático para as tabelas fiscais de origem.

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
async function fetchFromView(pool, { filialId, dtInicio, dtFim, filterByFilial }) {
  const whereClauses = [];
  const params = [];

  if (filterByFilial) {
    whereClauses.push('filial_id = ?');
    params.push(filialId);
  }

  if (dtInicio && dtInicio.trim() !== '') {
    whereClauses.push('data_movimento >= ?');
    params.push(dtInicio.trim().split('T')[0]);
  }

  if (dtFim && dtFim.trim() !== '') {
    whereClauses.push('data_movimento <= ?');
    params.push(dtFim.trim().split('T')[0]);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const sql = `
    SELECT 
      tipo, 
      origem, 
      COALESCE(SUM(valor), 0.00) AS total_valor, 
      COALESCE(SUM(valor_icms), 0.00) AS total_icms, 
      COALESCE(SUM(valor_icms_st), 0.00) AS total_icms_st, 
      COUNT(*) AS qtd_lancamentos
    FROM vw_dre_faturamento_cmv
    ${whereSql}
    GROUP BY tipo, origem
    ORDER BY tipo, total_valor DESC
  `;

  const [rows] = await pool.query(sql, params);

  const itensReceita = [];
  const itensDeducoes = [];
  const itensCmv = [];

  let totalIcmsView = 0;
  let totalIcmsStView = 0;

  for (const row of rows) {
    const val = Number(row.total_valor || 0);
    totalIcmsView += Number(row.total_icms || 0);
    totalIcmsStView += Number(row.total_icms_st || 0);

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

  // Adiciona ICMS apurado das receitas caso exista na view
  if (totalIcmsView > 0) {
    itensDeducoes.push({
      codigo: '2.02.003',
      descricao: 'ICMS sobre Vendas (Destacado nas Receitas)',
      total_valor: totalIcmsView,
      qtd_lancamentos: 1
    });
  }

  if (totalIcmsStView > 0) {
    itensDeducoes.push({
      codigo: '2.02.003',
      descricao: 'ICMS Substituição Tributária (ICMS-ST sobre Vendas)',
      total_valor: totalIcmsStView,
      qtd_lancamentos: 1
    });
  }

  return { itensReceita, itensDeducoes, itensCmv };
}

// 2. Fallback caso a view não exista ou falhe
async function fetchFromRawTables(pool, { filialId, dtInicio, dtFim, filterByFilial }) {
  const buildDateWhere = (field) => {
    let clauses = '';
    const localParams = [];
    if (dtInicio && dtInicio.trim() !== '') {
      clauses += ` AND ${field} >= ?`;
      localParams.push(`${dtInicio.trim().split('T')[0]} 00:00:00`);
    }
    if (dtFim && dtFim.trim() !== '') {
      clauses += ` AND ${field} <= ?`;
      localParams.push(`${dtFim.trim().split('T')[0]} 23:59:59`);
    }
    return { clauses, localParams };
  };

  const itensReceita = [];
  const itensDeducoes = [];
  const itensCmv = [];

  // ECF
  try {
    const dWhere = buildDateWhere('r02.data_mov');
    const p = filterByFilial ? [filialId, ...dWhere.localParams] : [...dWhere.localParams];
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(r02.venda_bruta), 0.00) as valor, COUNT(*) as qtd
      FROM paf_req25_r02 AS r02
      WHERE r02.apagado = 'N'
        ${filterByFilial ? 'AND r02.filial_id = ?' : ''}
        ${dWhere.clauses}
    `, p);
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.001', descricao: 'Cupons ECF (Redução Z)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // SAT / CF-e
  try {
    const dWhere = buildDateWhere('s.dt_emissao');
    const p = filterByFilial ? [filialId, ...dWhere.localParams] : [...dWhere.localParams];
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(si.valor_total_bruto + si.valor_despesas + si.valor_rateio_despesas), 0.00) as valor,
             COUNT(DISTINCT s.sat_cfe_id) as qtd
      FROM sat_cfe AS s
      JOIN sat_cfe_item AS si ON s.sat_cfe_id = si.sat_cfe_id
      WHERE s.tipo_ambiente = 1
        AND s.apagado = 'N'
        ${filterByFilial ? 'AND s.filial_id = ?' : ''}
        ${dWhere.clauses}
    `, p);
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.007', descricao: 'Cupons SAT/CF-e', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // NF-e Venda
  try {
    const dWhere = buildDateWhere('nf.data_emissao');
    const p = filterByFilial ? [filialId, ...dWhere.localParams] : [...dWhere.localParams];
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(nf.total_produtos + nf.valor_frete + nf.valor_seguro + nf.outras_depesas + nf.valor_icms_subst), 0.00) as valor,
             COUNT(*) as qtd
      FROM nota_fiscal AS nf
      WHERE nf.tipo_nota = 'V'
        AND ((nf.modelo = '55' AND nf.ambiente_nfe = 1 AND nf.status_nfe = 'P') OR (nf.modelo = '01'))
        AND nf.cfop NOT IN ('5.551', '5.552', '5.553', '5.554', '5.555', '6.551', '6.552', '6.553', '6.554', '6.555')
        AND nf.apagado = 'N'
        AND nf.conferida = 'S'
        ${filterByFilial ? 'AND nf.filial_id = ?' : ''}
        ${dWhere.clauses}
    `, p);
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.004', descricao: 'NF/NF-e de venda (Mod. 55 e 01)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // NFC-e
  try {
    const dWhere = buildDateWhere('nf.data_emissao');
    const p = filterByFilial ? [filialId, ...dWhere.localParams] : [...dWhere.localParams];
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
        ${filterByFilial ? 'AND nf.filial_id = ?' : ''}
        ${dWhere.clauses}
    `, p);
    const val = Number(rows[0]?.valor || 0);
    if (val > 0) {
      itensReceita.push({ codigo: '1.01.003', descricao: 'NFC-e (Mod. 65)', total_valor: val, qtd_lancamentos: Number(rows[0]?.qtd || 0) });
    }
  } catch (e) {}

  // CMV
  try {
    const dWhere = buildDateWhere('m.data_hora');
    const p = filterByFilial ? [filialId, ...dWhere.localParams] : [...dWhere.localParams];
    const [rowsCmv] = await pool.query(`
      SELECT COALESCE(SUM(m.quanti_uni * m.pmc), 0.00) AS valor, COUNT(*) as qtd
      FROM movment AS m
      WHERE m.cancelado = 'N'
        AND m.apagado = 'N'
        AND m.oper IN (2, 3)
        AND ((m.entrega = 'N') OR (m.dtchegada_entrega IS NOT NULL))
        ${filterByFilial ? 'AND m.filial_id = ?' : ''}
        ${dWhere.clauses}
    `, p);
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

  const filterByFilial = isFilialRestricted(filialId);
  let result = null;

  // 1. Tentar pela VIEW vw_dre_faturamento_cmv (Super Rápida)
  try {
    result = await fetchFromView(pool, { filialId, dtInicio, dtFim, filterByFilial });
  } catch (errView) {
    console.warn('View vw_dre_faturamento_cmv não encontrada ou com erro, usando fallback:', errView.message);
  }

  // 2. Se a view não retornou (ou falhou), executar o fallback pelas tabelas
  if (!result) {
    try {
      result = await fetchFromRawTables(pool, { filialId, dtInicio, dtFim, filterByFilial });
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
