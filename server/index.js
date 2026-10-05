const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getPool, getStatus, getConfig, saveConfig, testConnection } = require('./db');
const { planocontasMock, pagarMock, filiaisMock } = require('./mockData');
const { DRE_STRUCTURE, classifyAccount } = require('./dreClassifier');

// Regra de Negócio: filial_id 1 - Escritorio vê informações de todas as lojas
function shouldFilterByFilial(filialId) {
  if (!filialId || filialId === 'todas' || String(filialId) === '1') {
    return false; // Não filtra filial, consolida todas as lojas!
  }
  return true;
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper para tratar datas em string YYYY-MM-DD
function parseDateParam(dateStr, defaultStr) {
  if (!dateStr || dateStr.trim() === '') return defaultStr;
  return dateStr;
}

// Retorna se deve usar banco de dados real ou mock fallback
function isDbAvailable() {
  const status = getStatus();
  return status.connected && status.tablesFound && status.tablesFound.pagar;
}

// 1. Status da conexão
app.get('/api/status', (req, res) => {
  const status = getStatus();
  res.json({
    ...status,
    isUsingMock: !isDbAvailable()
  });
});

// 2. Obter configuração do MariaDB
app.get('/api/database/config', (req, res) => {
  res.json(getConfig());
});

// 3. Testar conexão com MariaDB
app.post('/api/database/test', async (req, res) => {
  const result = await testConnection(req.body);
  res.json(result);
});

// 4. Salvar configuração e conectar
app.post('/api/database/config', async (req, res) => {
  try {
    const success = await saveConfig(req.body);
    const status = getStatus();
    res.json({
      success,
      status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Listar filiais disponíveis
app.get('/api/filiais', async (req, res) => {
  try {
    if (isDbAvailable()) {
      const pool = getPool();
      try {
        const [rows] = await pool.query(
          'SELECT filial_id, nome FROM filial ORDER BY filial_id ASC'
        );
        if (rows && rows.length > 0) {
          return res.json(rows.map(r => ({
            filial_id: r.filial_id,
            nome: r.nome || (r.filial_id === 1 ? 'Escritorio' : `Filial #${r.filial_id}`)
          })));
        }
      } catch (errFilial) {
        console.warn('Consulta na tabela filial falhou ou tabela inexistente:', errFilial.message);
      }

      // Fallback em pagar se filial não existir
      const [rowsPagar] = await pool.query(
        'SELECT DISTINCT filial_id FROM pagar WHERE apagado = "N" ORDER BY filial_id ASC'
      );
      return res.json(rowsPagar.map(r => ({
        filial_id: r.filial_id,
        nome: r.filial_id === 1 ? 'Escritorio' : `Filial #${r.filial_id}`
      })));
    }
    // Mock
    return res.json(filiaisMock);
  } catch (err) {
    console.error('Erro em /api/filiais:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Indicadores de Topo (Cards KPI fiéis ao layout do painel)
app.get('/api/kpis', async (req, res) => {
  try {
    const { regime = 'competencia', dt_inicio, dt_fim, filial_id, busca } = req.query;

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      // Filtro de Filial (filial_id 1 - Escritorio vê todas as lojas)
      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('p.filial_id = ?');
        params.push(filial_id);
      }

      // Filtro de Busca
      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      // Filtro de Período e Regime
      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
        if (dt_inicio) {
          whereClauses.push('p.dt_pgto >= ?');
          params.push(dt_inicio);
        }
        if (dt_fim) {
          whereClauses.push('p.dt_pgto <= ?');
          params.push(dt_fim);
        }
      } else {
        // Competência
        if (dt_inicio) {
          whereClauses.push('COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro) >= ?');
          params.push(dt_inicio);
        }
        if (dt_fim) {
          whereClauses.push('COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro) <= ?');
          params.push(dt_fim);
        }
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const sql = `
        SELECT
          COUNT(*) as total_titulos,
          SUM(COALESCE(p.valor, 0)) as total_valor,
          SUM(COALESCE(p.valor_pago, 0)) as total_pago,
          SUM(COALESCE(p.descontos, 0)) as total_descontos,
          SUM(COALESCE(p.acrescimos, 0)) as total_acrescimos,
          SUM(COALESCE(p.taxa_boleto, 0)) as total_taxa_boleto,
          SUM(CASE WHEN p.dt_pgto IS NOT NULL AND p.valor_pago > 0 THEN 1 ELSE 0 END) as qtd_pagos,
          SUM(CASE WHEN p.dt_pgto IS NULL OR p.valor_pago = 0 THEN 1 ELSE 0 END) as qtd_abertos,
          SUM(CASE WHEN (p.dt_pgto IS NULL OR p.valor_pago = 0) AND p.dtvenc < CURDATE() THEN COALESCE(p.valor, 0) ELSE 0 END) as total_vencido,
          SUM(CASE WHEN (p.dt_pgto IS NULL OR p.valor_pago = 0) AND p.dtvenc >= CURDATE() THEN COALESCE(p.valor, 0) ELSE 0 END) as total_a_vencer
        FROM pagar p
        ${whereSql}
      `;

      const [rows] = await pool.query(sql, params);
      const data = rows[0] || {};

      const totalTitulos = Number(data.total_titulos || 0);
      const totalValor = Number(regime === 'caixa' ? data.total_pago : data.total_valor || 0);
      const totalPago = Number(data.total_pago || 0);
      const totalDescontos = Number(data.total_descontos || 0);
      const totalAcrescimos = Number(data.total_acrescimos || 0);
      const totalTaxaBoleto = Number(data.total_taxa_boleto || 0);
      const qtdPagos = Number(data.qtd_pagos || 0);
      const qtdAbertos = Number(data.qtd_abertos || 0);
      const totalVencido = Number(data.total_vencido || 0);
      const totalAVencer = Number(data.total_a_vencer || 0);

      const ticketMedio = totalTitulos > 0 ? totalValor / totalTitulos : 0;
      const pctPago = totalValor > 0 ? (totalPago / totalValor) * 100 : 0;

      return res.json({
        totalGeral: {
          valor: totalValor,
          qtd: totalTitulos,
          ticketMedio,
          totalDoc: Number(data.total_valor || 0)
        },
        pagos: {
          valor: totalPago,
          qtd: qtdPagos,
          percentual: pctPago,
          descontos: totalDescontos
        },
        pendentes: {
          valor: regime === 'caixa' ? 0 : Math.max(0, totalValor - totalPago),
          qtd: qtdAbertos,
          vencidos: totalVencido,
          aVencer: totalAVencer
        },
        acrescimosETaxas: {
          valor: totalAcrescimos + totalTaxaBoleto,
          acrescimos: totalAcrescimos,
          taxasBoleto: totalTaxaBoleto
        }
      });
    }

    // Processamento Mock
    let filtered = pagarMock.filter(p => p.apagado === 'N');
    if (shouldFilterByFilial(filial_id)) {
      filtered = filtered.filter(p => p.filial_id == filial_id);
    }
    if (busca && busca.trim() !== '') {
      const q = busca.toLowerCase();
      filtered = filtered.filter(p =>
        (p.historico && p.historico.toLowerCase().includes(q)) ||
        (p.nome_razao_cedente && p.nome_razao_cedente.toLowerCase().includes(q)) ||
        (String(p.NF).includes(q))
      );
    }
    if (regime === 'caixa') {
      filtered = filtered.filter(p => p.dt_pgto && (!dt_inicio || p.dt_pgto >= dt_inicio) && (!dt_fim || p.dt_pgto <= dt_fim));
    } else {
      filtered = filtered.filter(p => {
        const d = p.dt_competencia || p.dt_emissao;
        return (!dt_inicio || d >= dt_inicio) && (!dt_fim || d <= dt_fim);
      });
    }

    const totalTitulos = filtered.length;
    const totalValor = filtered.reduce((acc, p) => acc + (regime === 'caixa' ? p.valor_pago : p.valor), 0);
    const totalPago = filtered.reduce((acc, p) => acc + (p.dt_pgto ? p.valor_pago : 0), 0);
    const totalDescontos = filtered.reduce((acc, p) => acc + (p.descontos || 0), 0);
    const totalAcrescimos = filtered.reduce((acc, p) => acc + (p.acrescimos || 0), 0);
    const totalTaxas = filtered.reduce((acc, p) => acc + (p.taxa_boleto || 0), 0);
    const qtdPagos = filtered.filter(p => p.dt_pgto).length;
    const qtdAbertos = filtered.filter(p => !p.dt_pgto).length;
    const totalVencido = filtered.filter(p => !p.dt_pgto && p.dtvenc < '2026-10-05').reduce((acc, p) => acc + p.valor, 0);
    const totalAVencer = filtered.filter(p => !p.dt_pgto && p.dtvenc >= '2026-10-05').reduce((acc, p) => acc + p.valor, 0);

    const ticketMedio = totalTitulos > 0 ? totalValor / totalTitulos : 0;
    const pctPago = totalValor > 0 ? (totalPago / totalValor) * 100 : 0;

    return res.json({
      totalGeral: {
        valor: totalValor,
        qtd: totalTitulos,
        ticketMedio,
        totalDoc: totalValor
      },
      pagos: {
        valor: totalPago,
        qtd: qtdPagos,
        percentual: pctPago,
        descontos: totalDescontos
      },
      pendentes: {
        valor: regime === 'caixa' ? 0 : Math.max(0, totalValor - totalPago),
        qtd: qtdAbertos,
        vencidos: totalVencido,
        aVencer: totalAVencer
      },
      acrescimosETaxas: {
        valor: totalAcrescimos + totalTaxas,
        acrescimos: totalAcrescimos,
        taxasBoleto: totalTaxas
      }
    });
  } catch (err) {
    console.error('Erro em /api/kpis:', err);
    res.status(500).json({ error: err.message });
  }
});

function generateStructuredDre(rawRows, regime) {
  // Inicializar seções analíticas baseadas no DRE_STRUCTURE
  const sectionBuckets = {};
  DRE_STRUCTURE.filter(s => !s.isSubtotal).forEach(s => {
    sectionBuckets[s.id] = {
      id: s.id,
      title: s.title,
      type: s.type,
      sign: s.sign,
      total: 0,
      qtdLancamentos: 0,
      contasMap: {}
    };
  });

  // Distribuir cada conta retornada para a sua sessão oficial
  rawRows.forEach(row => {
    const val = Number(row.total_valor || 0);
    const qtd = Number(row.qtd_lancamentos || 0);
    const classification = classifyAccount(row.codigo, row.descricao);
    const targetSectionId = classification.sectionId || '7';

    if (sectionBuckets[targetSectionId]) {
      const bucket = sectionBuckets[targetSectionId];
      bucket.total += val;
      bucket.qtdLancamentos += qtd;

      const codeKey = row.codigo || 'SEM_CODIGO';
      if (!bucket.contasMap[codeKey]) {
        bucket.contasMap[codeKey] = {
          planocontas_id: row.planocontas_id,
          codigo: row.codigo,
          descricao: row.descricao || classification.descricaoPadrao,
          total_valor: 0,
          qtd_lancamentos: 0
        };
      }
      bucket.contasMap[codeKey].total_valor += val;
      bucket.contasMap[codeKey].qtd_lancamentos += qtd;
    }
  });

  // Totais das seções analíticas
  const s1 = sectionBuckets['1']?.total || 0;
  const s2 = sectionBuckets['2']?.total || 0;
  const recLiquida = s1 - s2;
  const s3 = sectionBuckets['3']?.total || 0;
  const resBruto = recLiquida - s3;
  const s4 = sectionBuckets['4']?.total || 0;
  const s5 = sectionBuckets['5']?.total || 0;
  const s6 = sectionBuckets['6']?.total || 0;
  const s7 = sectionBuckets['7']?.total || 0;
  const s8 = sectionBuckets['8']?.total || 0;
  const lajir = resBruto - s4 - s5 - s6 - s7 + s8;
  const s9 = sectionBuckets['9']?.total || 0;
  const s10 = sectionBuckets['10']?.total || 0;
  const lair = lajir - s9 + s10;
  const s11 = sectionBuckets['11']?.total || 0;
  const resLiquido = lair - s11;

  // Base para análise vertical (% AV)
  const totalDespesas = s2 + s3 + s4 + s5 + s6 + s7 + s9 + s11;
  const baseAV = s1 > 0 ? s1 : (totalDespesas > 0 ? totalDespesas : 1);

  // Itens na ordem oficial com subtotais destacados
  const itensDRE = [];

  DRE_STRUCTURE.forEach(item => {
    if (item.isSubtotal) {
      let subtotalVal = 0;
      if (item.id === 'subtotal_receita_liquida') subtotalVal = recLiquida;
      else if (item.id === 'subtotal_resultado_bruto') subtotalVal = resBruto;
      else if (item.id === 'subtotal_lajir') subtotalVal = lajir;
      else if (item.id === 'subtotal_lair') subtotalVal = lair;
      else if (item.id === 'subtotal_resultado_liquido') subtotalVal = resLiquido;

      itensDRE.push({
        id: item.id,
        isSubtotal: true,
        title: item.title,
        total: subtotalVal,
        percentual: (subtotalVal / baseAV) * 100
      });
    } else {
      const b = sectionBuckets[item.id];
      const contas = Object.values(b.contasMap).sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      contas.forEach(c => {
        c.percentual = baseAV > 0 ? (c.total_valor / baseAV) * 100 : 0;
      });

      itensDRE.push({
        id: item.id,
        isSubtotal: false,
        title: item.title,
        type: item.type,
        sign: item.sign,
        total: b.total,
        qtdLancamentos: b.qtdLancamentos,
        percentual: baseAV > 0 ? (b.total / baseAV) * 100 : 0,
        contas
      });
    }
  });

  return {
    regime,
    baseCalculo: s1 > 0 ? 'Receita Bruta' : 'Total de Despesas',
    receitaBruta: s1,
    receitaLiquida: recLiquida,
    resultadoBruto: resBruto,
    lajir,
    lair,
    resultadoLiquido: resLiquido,
    totalDespesas,
    itensDRE
  };
}

// 7. Demonstrativo DRE Estruturado
app.get('/api/dre', async (req, res) => {
  try {
    const { regime = 'competencia', dt_inicio, dt_fim, filial_id, busca } = req.query;

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('p.filial_id = ?');
        params.push(filial_id);
      }
      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
        if (dt_inicio) {
          whereClauses.push('p.dt_pgto >= ?');
          params.push(dt_inicio);
        }
        if (dt_fim) {
          whereClauses.push('p.dt_pgto <= ?');
          params.push(dt_fim);
        }
      } else {
        if (dt_inicio) {
          whereClauses.push('COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro) >= ?');
          params.push(dt_inicio);
        }
        if (dt_fim) {
          whereClauses.push('COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro) <= ?');
          params.push(dt_fim);
        }
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
      const valorField = regime === 'caixa' ? 'p.valor_pago' : 'p.valor';

      const sql = `
        SELECT 
          COALESCE(pc.planocontas_id, 0) as planocontas_id,
          COALESCE(pc.codigo, 'SEM_CODIGO') as codigo,
          COALESCE(pc.descricao, 'Sem Descrição') as descricao,
          COALESCE(pc.totalizador, 'N') as totalizador,
          COALESCE(pc.operacao, 'D') as operacao,
          COALESCE(pc.opdesp, 'S') as opdesp,
          COUNT(p.pagar_id) as qtd_lancamentos,
          SUM(COALESCE(${valorField}, 0)) as total_valor
        FROM pagar p
        LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
        ${whereSql}
        GROUP BY 
          pc.planocontas_id,
          pc.codigo,
          pc.descricao,
          pc.totalizador,
          pc.operacao,
          pc.opdesp
        ORDER BY pc.codigo ASC
      `;

      const [rows] = await pool.query(sql, params);
      const dreResult = generateStructuredDre(rows, regime);
      return res.json(dreResult);
    }

    // Mock DRE
    let filtered = pagarMock.filter(p => p.apagado === 'N');
    if (shouldFilterByFilial(filial_id)) {
      filtered = filtered.filter(p => p.filial_id == filial_id);
    }
    if (busca && busca.trim() !== '') {
      const q = busca.toLowerCase();
      filtered = filtered.filter(p =>
        (p.historico && p.historico.toLowerCase().includes(q)) ||
        (p.nome_razao_cedente && p.nome_razao_cedente.toLowerCase().includes(q)) ||
        (String(p.NF).includes(q))
      );
    }
    if (regime === 'caixa') {
      filtered = filtered.filter(p => p.dt_pgto && (!dt_inicio || p.dt_pgto >= dt_inicio) && (!dt_fim || p.dt_pgto <= dt_fim));
    } else {
      filtered = filtered.filter(p => {
        const d = p.dt_competencia || p.dt_emissao;
        return (!dt_inicio || d >= dt_inicio) && (!dt_fim || d <= dt_fim);
      });
    }

    const map = {};
    filtered.forEach(p => {
      const pc = planocontasMock.find(c => c.planocontas_id === p.planocontas_id) || {
        planocontas_id: p.planocontas_id,
        codigo: '3.07.003',
        descricao: 'OUTRAS',
        totalizador: 'N'
      };

      if (!map[pc.planocontas_id]) {
        map[pc.planocontas_id] = {
          planocontas_id: pc.planocontas_id,
          codigo: pc.codigo,
          descricao: pc.descricao,
          qtd_lancamentos: 0,
          total_valor: 0
        };
      }
      const val = regime === 'caixa' ? p.valor_pago : p.valor;
      map[pc.planocontas_id].total_valor += val;
      map[pc.planocontas_id].qtd_lancamentos += 1;
    });

    const rows = Object.values(map);
    const dreResult = generateStructuredDre(rows, regime);
    res.json(dreResult);
  } catch (err) {
    console.error('Erro em /api/dre:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Gráficos (Evolução Temporal e Categorias)
app.get('/api/graficos', async (req, res) => {
  try {
    const { regime = 'competencia', dt_inicio, dt_fim, filial_id, busca } = req.query;

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('p.filial_id = ?');
        params.push(filial_id);
      }
      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      const dateField = regime === 'caixa' ? 'p.dt_pgto' : 'COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro)';
      const valField = regime === 'caixa' ? 'p.valor_pago' : 'p.valor';

      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
      }

      if (dt_inicio) {
        whereClauses.push(`${dateField} >= ?`);
        params.push(dt_inicio);
      }
      if (dt_fim) {
        whereClauses.push(`${dateField} <= ?`);
        params.push(dt_fim);
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // Série temporal por data
      const [timelineRows] = await pool.query(`
        SELECT 
          DATE_FORMAT(${dateField}, '%d/%m') as data_formatada,
          DATE(${dateField}) as data_pura,
          SUM(COALESCE(${valField}, 0)) as total_valor,
          COUNT(*) as qtd_lancamentos
        FROM pagar p
        ${whereSql}
        GROUP BY DATE(${dateField}), DATE_FORMAT(${dateField}, '%d/%m')
        ORDER BY DATE(${dateField}) ASC
        LIMIT 31
      `, params);

      // Distribuição por Plano de Contas
      const [distRows] = await pool.query(`
        SELECT 
          COALESCE(pc.descricao, 'Outros') as categoria,
          SUM(COALESCE(${valField}, 0)) as total_valor
        FROM pagar p
        LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
        ${whereSql}
        GROUP BY COALESCE(pc.descricao, 'Outros')
        ORDER BY total_valor DESC
        LIMIT 8
      `, params);

      return res.json({
        timeline: timelineRows.map(r => ({
          label: r.data_formatada || 'Sem Data',
          data: Number(r.total_valor || 0),
          qtd: Number(r.qtd_lancamentos || 0)
        })),
        distribution: distRows.map(r => ({
          label: r.categoria,
          value: Number(r.total_valor || 0)
        }))
      });
    }

    // Mock
    const mockTimeline = [
      { label: '01/10', data: 4200.00, qtd: 3 },
      { label: '02/10', data: 16650.00, qtd: 2 },
      { label: '03/10', data: 6800.00, qtd: 1 },
      { label: '04/10', data: 980.00, qtd: 1 },
      { label: '05/10', data: 36020.40, qtd: 4 },
      { label: '06/10', data: 1500.00, qtd: 1 },
      { label: '07/10', data: 2100.00, qtd: 2 }
    ];

    const mockDist = [
      { label: '3. Custo Mercadorias (CMV)', value: 72250.00 },
      { label: '5. Despesas Administrativas', value: 41990.00 },
      { label: '6. Despesas Gerais', value: 11450.80 },
      { label: '2. Deduções e Impostos', value: 10520.50 },
      { label: '4. Despesas Comerciais', value: 9270.00 },
      { label: '9. Despesas Financeiras', value: 1430.20 }
    ];

    res.json({
      timeline: mockTimeline,
      distribution: mockDist
    });
  } catch (err) {
    console.error('Erro em /api/graficos:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Lançamentos detalhados (tabela de conferência / auditoria)
app.get('/api/lancamentos', async (req, res) => {
  try {
    const {
      regime = 'competencia',
      dt_inicio,
      dt_fim,
      filial_id,
      busca,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('p.filial_id = ?');
        params.push(filial_id);
      }
      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
        if (dt_inicio) {
          whereClauses.push('p.dt_pgto >= ?');
          params.push(dt_inicio);
        }
        if (dt_fim) {
          whereClauses.push('p.dt_pgto <= ?');
          params.push(dt_fim);
        }
      } else {
        if (dt_inicio) {
          whereClauses.push('COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro) >= ?');
          params.push(dt_inicio);
        }
        if (dt_fim) {
          whereClauses.push('COALESCE(p.dt_competencia, p.dt_emissao, p.dtcadastro) <= ?');
          params.push(dt_fim);
        }
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // Total count
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM pagar p ${whereSql}`,
        params
      );
      const totalRecords = countResult[0].total;

      // Query paginada
      const queryParams = [...params, parseInt(limit, 10), offset];
      const sql = `
        SELECT 
          p.filial_id,
          p.pagar_id,
          p.NF,
          p.dt_emissao,
          p.dtvenc,
          p.dt_pgto,
          p.dt_competencia,
          p.historico,
          p.nome_razao_cedente,
          p.valor,
          p.valor_pago,
          p.descontos,
          p.acrescimos,
          p.taxa_boleto,
          p.planocontas_id,
          pc.codigo as plano_codigo,
          pc.descricao as plano_descricao
        FROM pagar p
        LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
        ${whereSql}
        ORDER BY p.pagar_id DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await pool.query(sql, queryParams);

      return res.json({
        totalRecords,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        records: rows
      });
    }

    // Mock
    let filtered = pagarMock.filter(p => p.apagado === 'N');
    if (shouldFilterByFilial(filial_id)) {
      filtered = filtered.filter(p => p.filial_id == filial_id);
    }
    if (busca && busca.trim() !== '') {
      const q = busca.toLowerCase();
      filtered = filtered.filter(p =>
        (p.historico && p.historico.toLowerCase().includes(q)) ||
        (p.nome_razao_cedente && p.nome_razao_cedente.toLowerCase().includes(q)) ||
        (String(p.NF).includes(q))
      );
    }
    if (regime === 'caixa') {
      filtered = filtered.filter(p => p.dt_pgto && (!dt_inicio || p.dt_pgto >= dt_inicio) && (!dt_fim || p.dt_pgto <= dt_fim));
    } else {
      filtered = filtered.filter(p => {
        const d = p.dt_competencia || p.dt_emissao;
        return (!dt_inicio || d >= dt_inicio) && (!dt_fim || d <= dt_fim);
      });
    }

    const records = filtered.map(p => {
      const pc = planocontasMock.find(c => c.planocontas_id === p.planocontas_id);
      return {
        ...p,
        plano_codigo: pc ? pc.codigo : '',
        plano_descricao: pc ? pc.descricao : 'Sem classificação'
      };
    });

    res.json({
      totalRecords: records.length,
      page: 1,
      limit: 50,
      records
    });
  } catch (err) {
    console.error('Erro em /api/lancamentos:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Seed opcional para criar as tabelas e dados no MariaDB do usuário caso queira preencher
app.post('/api/database/seed', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(400).json({ success: false, message: 'Banco MariaDB não conectado.' });
    }

    // Criar tabela planocontas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`planocontas\` (
        \`planocontas_id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`codigo\` VARCHAR(50) NULL DEFAULT NULL,
        \`descricao\` VARCHAR(60) NULL DEFAULT NULL,
        \`totalizador\` CHAR(1) NULL DEFAULT 'N',
        \`lojas_leram\` VARCHAR(50) NULL DEFAULT NULL,
        \`apagado\` CHAR(1) NULL DEFAULT 'N',
        \`fornece_id\` INT(11) NULL DEFAULT '0',
        \`dtcadastro\` DATETIME NULL DEFAULT NULL,
        \`cad_usuario_id\` INT(11) NULL DEFAULT NULL,
        \`apag_usuario_id\` INT(11) NULL DEFAULT '0',
        \`operacao\` CHAR(1) NOT NULL DEFAULT 'D',
        \`opdesp\` CHAR(1) NULL DEFAULT 'S',
        \`titulos_id\` INT(11) NULL DEFAULT NULL,
        PRIMARY KEY (\`planocontas_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Criar tabela pagar
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`pagar\` (
        \`filial_id\` INT(11) NOT NULL DEFAULT '0',
        \`pagar_id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`dt_emissao\` DATE NULL DEFAULT NULL,
        \`dtvenc\` DATE NULL DEFAULT NULL,
        \`NF\` BIGINT(20) NULL DEFAULT NULL,
        \`fornece_id\` INT(11) NULL DEFAULT NULL,
        \`historico\` VARCHAR(50) NULL DEFAULT NULL,
        \`valor\` DECIMAL(11,2) NULL DEFAULT '0.00',
        \`valor_pago\` DECIMAL(11,2) NULL DEFAULT '0.00',
        \`dt_pgto\` DATE NULL DEFAULT NULL,
        \`parcela\` TINYINT(4) NULL DEFAULT NULL,
        \`lojas_leram\` VARCHAR(50) NULL DEFAULT NULL,
        \`lojas_leram2\` VARCHAR(50) NULL DEFAULT NULL,
        \`apagado\` CHAR(1) NULL DEFAULT 'N',
        \`despesas\` DECIMAL(11,2) NULL DEFAULT '0.00',
        \`dtcadastro\` DATETIME NULL DEFAULT NULL,
        \`dtalteracao\` DATETIME NULL DEFAULT NULL,
        \`cad_usuario_id\` INT(11) NULL DEFAULT NULL,
        \`alt_usuario_id\` INT(11) NULL DEFAULT NULL,
        \`numcaixa\` INT(11) NULL DEFAULT '0',
        \`planocontas_id\` INT(11) NULL DEFAULT '0',
        \`duplicata\` VARCHAR(30) NULL DEFAULT NULL,
        \`apag_usuario_id\` INT(11) NULL DEFAULT '0',
        \`dafilial_id\` INT(11) NULL DEFAULT '0',
        \`movnumlanc\` BIGINT(20) NULL DEFAULT NULL,
        \`cfop\` VARCHAR(10) NULL DEFAULT NULL,
        \`numlancconfent\` BIGINT(20) NULL DEFAULT '0',
        \`movnumlancdesp\` BIGINT(20) NULL DEFAULT NULL,
        \`fil_baixa_id\` INT(11) NULL DEFAULT NULL,
        \`tipo_titulo\` VARCHAR(20) NOT NULL DEFAULT '',
        \`acrescimos\` DECIMAL(11,2) NOT NULL DEFAULT '0.00',
        \`descontos\` DECIMAL(11,2) NOT NULL DEFAULT '0.00',
        \`valor_doc\` DECIMAL(11,2) NOT NULL DEFAULT '0.00',
        \`barras_boleto\` VARCHAR(100) NOT NULL DEFAULT '',
        \`bancos_id\` CHAR(3) NOT NULL DEFAULT '',
        \`borde_ro\` VARCHAR(10) NULL DEFAULT NULL,
        \`linha_digitavel\` VARCHAR(100) NOT NULL DEFAULT '',
        \`dt_competencia\` DATE NULL DEFAULT NULL,
        \`identf_unico\` VARCHAR(32) NULL DEFAULT NULL,
        \`lancamento_manual\` CHAR(1) NOT NULL DEFAULT 'N',
        \`utiliza_outros_descontos\` CHAR(1) NOT NULL DEFAULT 'N',
        \`data_previsao_pgto\` DATE NOT NULL DEFAULT '2026-01-01',
        \`taxa_boleto\` DECIMAL(9,2) NOT NULL DEFAULT '0.00',
        \`cpf_cnpj_cedente\` VARCHAR(14) NOT NULL DEFAULT '',
        \`nome_razao_cedente\` VARCHAR(40) NOT NULL DEFAULT '',
        \`cpf_cnpj_sacador\` VARCHAR(14) NOT NULL DEFAULT '',
        \`nome_razao_sacador\` VARCHAR(50) NOT NULL DEFAULT '',
        \`categoria_lancamento_id\` INT(11) NULL DEFAULT NULL,
        \`dtvenc_original\` DATE NULL DEFAULT NULL,
        \`dtvenc_original_openbanking\` DATE NULL DEFAULT NULL,
        PRIMARY KEY (\`filial_id\`, \`pagar_id\`),
        INDEX \`idx_ai_pagar_id\` (\`pagar_id\`),
        INDEX \`dt_pgto\` (\`dt_pgto\`),
        INDEX \`dtvenc\` (\`dtvenc\`),
        INDEX \`dt_competencia\` (\`dt_competencia\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Inserir planos de contas mockados se tabela estiver vazia
    const [pcCount] = await pool.query('SELECT COUNT(*) as c FROM planocontas');
    if (pcCount[0].c === 0) {
      for (const pc of planocontasMock) {
        await pool.query(
          'INSERT INTO planocontas (planocontas_id, codigo, descricao, totalizador, operacao, opdesp, apagado) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [pc.planocontas_id, pc.codigo, pc.descricao, pc.totalizador, pc.operacao, pc.opdesp, 'N']
        );
      }
    }

    // Inserir lançamentos se vazio
    const [pCount] = await pool.query('SELECT COUNT(*) as c FROM pagar');
    if (pCount[0].c === 0) {
      for (const p of pagarMock) {
        await pool.query(
          `INSERT INTO pagar (
            filial_id, pagar_id, dt_emissao, dtvenc, NF, fornece_id, historico,
            valor, valor_pago, dt_pgto, dt_competencia, planocontas_id,
            despesas, acrescimos, descontos, valor_doc, taxa_boleto, nome_razao_cedente, apagado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.filial_id, p.pagar_id, p.dt_emissao, p.dtvenc, p.NF, p.fornece_id, p.historico,
            p.valor, p.valor_pago, p.dt_pgto, p.dt_competencia, p.planocontas_id,
            p.despesas, p.acrescimos, p.descontos, p.valor_doc, p.taxa_boleto, p.nome_razao_cedente, p.apagado
          ]
        );
      }
    }

    res.json({ success: true, message: 'Tabelas e registros iniciais criados no MariaDB com sucesso!' });
  } catch (err) {
    console.error('Erro ao popular MariaDB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Servir frontend se compilado
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor DRE Financeiro rodando na porta ${PORT}`);
});

