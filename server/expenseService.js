// Serviço para consumo da view oficial 'vw_dre_despesas_analitico' no MariaDB
// No regime de competência, consolida automaticamente Contas a Pagar, Movimentação Bancária e Sangrias (FINADM).
// Novas contas adicionadas ao plano de contas associadas aos grupos da DRE são refletidas dinamicamente.

function isFilialRestricted(filialId) {
  if (!filialId || filialId === 'todas' || String(filialId) === '1') {
    return false; // Filial 1 (Escritório) consolida todas as lojas
  }
  return true;
}

// Mapeia o grupo_id (item_id da tabela dre_item) e grupo_descricao para a seção da DRE
function mapGrupoToSection(grupoId, grupoDescricao) {
  const gId = Number(grupoId);
  const desc = String(grupoDescricao || '').toUpperCase();

  // 4. DESPESAS COMERCIAIS
  if (gId === 6 || desc.includes('COMERCIA')) {
    return '4';
  }
  // 5. DESPESAS ADMINISTRATIVAS
  if (gId === 7 || desc.includes('ADMINISTRA')) {
    return '5';
  }
  // 6. DESPESAS GERAIS
  if (gId === 8 || desc.includes('GERAIS')) {
    return '6';
  }
  // 7. OUTRAS DESPESAS
  if (gId === 9 || desc.includes('OUTRAS DESPESAS')) {
    return '7';
  }
  // 8. OUTRAS RECEITAS OPERACIONAIS
  if (gId === 10 || desc.includes('OUTRAS RECEITAS')) {
    return '8';
  }
  // 9. DESPESAS FINANCEIRAS
  if (gId === 12 || desc.includes('DESPESAS FINANCEIRAS')) {
    return '9';
  }
  // 10. RECEITAS FINANCEIRAS
  if (gId === 13 || desc.includes('RECEITAS FINANCEIRAS')) {
    return '10';
  }
  // 11. PROVISÕES IRPJ/CSLL
  if (gId === 15 || desc.includes('IRPJ') || desc.includes('CSLL')) {
    return '11';
  }

  // Grupos 1, 2, 3, 18, 19, 20, 21 referem-se a Receitas, CMV ou Deduções tributárias
  // que já são apurados diretamente pela view fiscal vw_dre_faturamento_cmv
  return null;
}

async function getExpensesFromView(pool, { filialId, dtInicio, dtFim, busca = '', planosExcluidos = [] }) {
  try {
    const whereClauses = [
      // Grupos operacionais de despesas e receitas da DRE
      'v.grupo_id IN (6, 7, 8, 9, 10, 12, 13, 15)'
    ];
    const params = [];

    if (isFilialRestricted(filialId)) {
      whereClauses.push('v.filial_id = ?');
      params.push(filialId);
    }

    if (dtInicio && dtInicio.trim() !== '') {
      whereClauses.push('v.data_movimento >= ?');
      params.push(dtInicio.trim().split('T')[0]);
    }

    if (dtFim && dtFim.trim() !== '') {
      whereClauses.push('v.data_movimento <= ?');
      params.push(dtFim.trim().split('T')[0]);
    }

    if (busca && busca.trim() !== '') {
      whereClauses.push('(v.conta_descricao LIKE ? OR v.conta_codigo LIKE ?)');
      const p = `%${busca.trim()}%`;
      params.push(p, p);
    }

    if (Array.isArray(planosExcluidos) && planosExcluidos.length > 0) {
      whereClauses.push(`v.planocontas_id NOT IN (${planosExcluidos.map(() => '?').join(',')})`);
      params.push(...planosExcluidos);
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const sql = `
      SELECT 
        v.grupo_id,
        v.grupo_ordem,
        v.grupo_descricao,
        v.planocontas_id,
        v.conta_codigo,
        v.conta_descricao,
        v.conta_formatada,
        COALESCE(SUM(v.valor), 0.00) AS total_valor,
        COUNT(*) AS qtd_lancamentos
      FROM vw_dre_despesas_analitico AS v
      ${whereSql}
      GROUP BY 
        v.grupo_id,
        v.grupo_ordem,
        v.grupo_descricao,
        v.planocontas_id,
        v.conta_codigo,
        v.conta_descricao,
        v.conta_formatada
      ORDER BY v.grupo_ordem, v.conta_codigo ASC
    `;

    const [rows] = await pool.query(sql, params);
    return rows.map(r => ({
      grupo_id: r.grupo_id,
      grupo_descricao: r.grupo_descricao,
      sectionId: mapGrupoToSection(r.grupo_id, r.grupo_descricao) || '7',
      planocontas_id: r.planocontas_id,
      codigo: r.conta_codigo,
      descricao: r.conta_descricao,
      total_valor: Number(r.total_valor || 0),
      qtd_lancamentos: Number(r.qtd_lancamentos || 0)
    }));
  } catch (err) {
    console.warn('Aviso: Consulta na view vw_dre_despesas_analitico falhou:', err.message);
    return null;
  }
}

module.exports = {
  getExpensesFromView,
  mapGrupoToSection
};

