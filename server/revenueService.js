// Serviço para cálculo fiscal de Receita Bruta, Deduções e CMV baseado nas movimentações fiscais

function buildDateRange(dtInicio, dtFim) {
  const dInicio = dtInicio && dtInicio.trim() !== '' 
    ? `${dtInicio.trim().split('T')[0]} 00:00:00` 
    : '2025-01-01 00:00:00';

  const dFim = dtFim && dtFim.trim() !== '' 
    ? `${dtFim.trim().split('T')[0]} 23:59:59` 
    : '2026-12-31 23:59:59';

  return { dInicio, dFim };
}

// Verifica se deve filtrar por filial específica (filial 1 - Escritorio vê todas as lojas)
function isFilialRestricted(filialId) {
  if (!filialId || filialId === 'todas' || String(filialId) === '1') {
    return false;
  }
  return true;
}

async function getFiscalRevenueAndCmv(pool, { filialId, dtInicio, dtFim }) {
  if (!pool) return null;

  const { dInicio, dFim } = buildDateRange(dtInicio, dtFim);
  const filterByFilial = isFilialRestricted(filialId);

  // Helper para construir cláusula de filial
  const filialClause = (fieldName) => {
    return filterByFilial ? `AND ${fieldName} = ?` : '';
  };

  const getParams = (extraParams = []) => {
    const params = [];
    if (filterByFilial) params.push(filialId);
    params.push(dInicio, dFim);
    return [...params, ...extraParams];
  };

  const itensReceita = [];
  const itensDeducoes = [];
  const itensCmv = [];

  // =========================================================================
  // 1. RECEITA BRUTA
  // =========================================================================

  // 1.1 Cupons ECF
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
  } catch (err) {
    console.warn('Erro ao consultar ECF:', err.message);
  }

  // 1.2 Cupons SAT / CF-e
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
  } catch (err) {
    console.warn('Erro ao consultar SAT/CF-e:', err.message);
  }

  // 1.3 NF/NF-e de Venda (Mod 55 e 01)
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
  } catch (err) {
    console.warn('Erro ao consultar NF-e Venda:', err.message);
  }

  // 1.4 Notas de Talão (Mod 02)
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
  } catch (err) {
    console.warn('Erro ao consultar Talão:', err.message);
  }

  // 1.5 NFC-e (Mod. 65)
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
  } catch (err) {
    console.warn('Erro ao consultar NFC-e:', err.message);
  }

  // 1.6 RPS (Recibo de Serviços)
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
  } catch (err) {
    console.warn('Erro ao consultar RPS:', err.message);
  }

  // =========================================================================
  // 2. DEDUÇÕES E ABATIMENTOS
  // =========================================================================

  // 2.1 Devolução de Clientes (Mod 55/01 - Tipo C)
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
  } catch (err) {
    console.warn('Erro ao consultar Devoluções:', err.message);
  }

  // 2.2 Descontos e Cancelamentos NFC-e / NF-e
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
  } catch (err) {
    console.warn('Erro ao consultar Descontos/Cancelamentos NF-e:', err.message);
  }

  // 2.3 Descontos e Cancelamentos SAT/CF-e
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
  } catch (err) {
    console.warn('Erro ao consultar SAT Descontos/Cancelamentos:', err.message);
  }

  // 2.4 DAS / Impostos Diretos Simples Nacional
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
  } catch (err) {
    console.warn('Erro ao consultar DAS:', err.message);
  }

  // =========================================================================
  // 3. CUSTO DAS MERCADORIAS VENDIDAS (CMV)
  // =========================================================================
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
  } catch (err) {
    console.warn('Erro ao consultar CMV:', err.message);
  }

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
  getFiscalRevenueAndCmv
};
