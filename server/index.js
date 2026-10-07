const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getPool, getStatus } = require('./db');
const { planocontasMock, pagarMock, filiaisMock } = require('./mockData');
const { DRE_STRUCTURE, classifyAccount } = require('./dreClassifier');
const { getFiscalRevenueAndCmv } = require('./revenueService');
const { getExpensesFromView, mapGrupoToSection } = require('./expenseService');
const { validateCredentials, generateToken, verifyToken, requireAuth } = require('./auth');

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

// Anti-cache e logs para todas as chamadas da API
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  console.log(`[API ${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.url}`);
  next();
});

// 0. Autenticação: Login seguro
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe usuário e senha.'
      });
    }

    const isValid = validateCredentials(username, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos. Verifique suas credenciais.'
      });
    }

    const token = generateToken(username);
    return res.json({
      success: true,
      message: 'Autenticado com sucesso!',
      token,
      user: {
        name: 'Administrador',
        username: 'Administrador'
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ success: false, message: 'Erro interno ao autenticar.' });
  }
});

// 0.1 Verificar validade da sessão atual
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }
  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.json({ valid: false });
  }
  return res.json({
    valid: true,
    user: {
      name: 'Administrador',
      username: decoded.username
    }
  });
});

// Proteger todas as demais rotas da API com requireAuth
app.use('/api', requireAuth);

// Helper para tratar datas em string YYYY-MM-DD
function parseDateParam(dateStr, defaultStr) {
  if (!dateStr || dateStr.trim() === '') return defaultStr;
  return dateStr;
}

// Helper para converter planos excluídos em lista de inteiros
function parsePlanosExcluidos(param) {
  if (!param) return [];
  if (Array.isArray(param)) return param.map(Number).filter(n => !isNaN(n) && n > 0);
  return String(param)
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
}

// Retorna se deve usar banco de dados real ou mock fallback
function isDbAvailable() {
  const status = getStatus();
  return status.connected && status.tablesFound && status.tablesFound.pagar;
}

// 1. Status da conexão segura
app.get('/api/status', (req, res) => {
  const status = getStatus();
  res.json({
    connected: status.connected,
    message: status.message,
    lastCheck: status.lastCheck,
    isUsingMock: !isDbAvailable()
  });
});

// 2. Listar planos de contas cadastrados no sistema
app.get('/api/planos-contas', async (req, res) => {
  try {
    if (isDbAvailable()) {
      const pool = getPool();
      try {
        const [rows] = await pool.query(`
          SELECT 
            planocontas_id, 
            codigo, 
            descricao, 
            totalizador, 
            operacao
          FROM planocontas
          WHERE apagado = 'N' 
            AND codigo IS NOT NULL 
            AND TRIM(codigo) != ''
          ORDER BY codigo ASC
        `);
        if (rows && rows.length > 0) {
          return res.json(rows);
        }
      } catch (errPc) {
        console.warn('Consulta na tabela planocontas falhou:', errPc.message);
      }
    }
    // Mock
    return res.json(planocontasMock);
  } catch (err) {
    console.error('Erro em /api/planos-contas:', err);
    res.status(500).json({ error: err.message });
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
    const { regime = 'competencia', dt_inicio, dt_fim, filial_id, busca, planos_excluidos } = req.query;
    const planosExcluidosList = parsePlanosExcluidos(planos_excluidos);

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      // Filtro de Filial (filial_id 1 - Escritorio vê todas as lojas)
      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('COALESCE(p.dafilial_id, p.filial_id) = ?');
        params.push(filial_id);
      }

      // Filtro de Planos de Contas Excluídos
      if (planosExcluidosList.length > 0) {
        whereClauses.push(`p.planocontas_id NOT IN (${planosExcluidosList.map(() => '?').join(',')})`);
        params.push(...planosExcluidosList);
      }

      // Filtro de Busca
      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR f.nome LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      // Filtro de Período e Regime: Competência usa dt_emissao, Caixa busca em pagar por dt_pgto
      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
        whereClauses.push('COALESCE(p.valor_pago, 0) > 0');
        if (dt_inicio && dt_inicio.trim() !== '') {
          whereClauses.push('DATE(p.dt_pgto) >= ?');
          params.push(dt_inicio.trim().split('T')[0]);
        }
        if (dt_fim && dt_fim.trim() !== '') {
          whereClauses.push('DATE(p.dt_pgto) <= ?');
          params.push(dt_fim.trim().split('T')[0]);
        }
      } else {
        // Competência (filtro oficial por dt_emissao)
        if (dt_inicio && dt_inicio.trim() !== '') {
          whereClauses.push('DATE(COALESCE(p.dt_emissao, p.dtcadastro)) >= ?');
          params.push(dt_inicio.trim().split('T')[0]);
        }
        if (dt_fim && dt_fim.trim() !== '') {
          whereClauses.push('DATE(COALESCE(p.dt_emissao, p.dtcadastro)) <= ?');
          params.push(dt_fim.trim().split('T')[0]);
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

      let fiscalData = null;
      try {
        fiscalData = await getFiscalRevenueAndCmv(pool, {
          filialId: filial_id,
          dtInicio: dt_inicio,
          dtFim: dt_fim
        });
      } catch (errFiscal) {
        console.warn('Erro ao obter dados fiscais para KPIs:', errFiscal.message);
      }

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

      const faturamentoBruto = fiscalData ? fiscalData.totalReceitaBruta : 0;
      const receitaLiquida = fiscalData ? fiscalData.totalReceitaLiquida : 0;
      const cmvTotal = fiscalData ? fiscalData.totalCmv : 0;
      const resultadoBruto = fiscalData ? fiscalData.totalResultadoBruto : 0;

      const ticketMedio = totalTitulos > 0 ? (faturamentoBruto > 0 ? faturamentoBruto / totalTitulos : totalValor / totalTitulos) : 0;
      const pctPago = totalValor > 0 ? (totalPago / totalValor) * 100 : 0;

      return res.json({
        totalGeral: {
          valor: faturamentoBruto > 0 ? faturamentoBruto : totalValor,
          isReceitaBruta: faturamentoBruto > 0,
          qtd: totalTitulos,
          ticketMedio,
          totalDoc: Number(data.total_valor || 0),
          receitaLiquida,
          resultadoBruto,
          cmvTotal
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
      filtered = filtered.filter(p => p.dt_pgto && Number(p.valor_pago || 0) > 0 && (!dt_inicio || p.dt_pgto >= dt_inicio) && (!dt_fim || p.dt_pgto <= dt_fim));
    } else {
      filtered = filtered.filter(p => {
        const d = p.dt_emissao || p.dt_competencia;
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

function generateStructuredDre(rawRows, regime, fiscalData = null, expenseRows = null) {
  // Inicializar seções analíticas baseadas no DRE_STRUCTURE
  const sectionBuckets = {};
  DRE_STRUCTURE.filter(s => !s.isSubtotal).forEach(s => {
    const isFixed = s.id === 'depreciacao' || Boolean(s.fixedValue);
    const fixedVal = Number(s.fixedValue || 0);
    sectionBuckets[s.id] = {
      id: s.id,
      title: s.title,
      type: s.type,
      sign: s.sign,
      total: isFixed ? fixedVal : 0,
      qtdLancamentos: isFixed ? 1 : 0,
      contasMap: isFixed ? {
        'DPR.001': {
          planocontas_id: 0,
          codigo: 'DPR.001',
          descricao: 'DEPRECIAÇÃO FIXA MENSAL',
          total_valor: fixedVal,
          qtd_lancamentos: 1
        }
      } : {}
    };
  });

  // Se regime for competência e houver despesas apuradas pela view 'vw_dre_despesas_analitico':
  // As despesas operacionais da DRE (Comerciais, Administrativas, Gerais, Financeiras, etc.)
  // são alimentadas DIRETAMENTE da view, garantindo que qualquer novo plano de contas cadastrado
  // e associado à estrutura da DRE no ERP apareça automaticamente sem alteração de código!
  if (regime === 'competencia' && expenseRows && expenseRows.length > 0) {
    expenseRows.forEach(row => {
      const val = Number(row.total_valor || 0);
      const qtd = Number(row.qtd_lancamentos || 0);
      const targetSectionId = row.sectionId || '7';

      if (sectionBuckets[targetSectionId]) {
        const bucket = sectionBuckets[targetSectionId];
        bucket.total += val;
        bucket.qtdLancamentos += qtd;

        const codeKey = row.codigo || 'SEM_CODIGO';
        if (!bucket.contasMap[codeKey]) {
          bucket.contasMap[codeKey] = {
            planocontas_id: row.planocontas_id,
            codigo: row.codigo,
            descricao: row.descricao,
            total_valor: 0,
            qtd_lancamentos: 0
          };
        }
        bucket.contasMap[codeKey].total_valor += val;
        bucket.contasMap[codeKey].qtd_lancamentos += qtd;
      }
    });
  } else {
    // Regime de Caixa ou fallback se a view não estiver disponível:
    // Distribuir cada conta retornada de 'pagar' para a sua sessão oficial
    rawRows.forEach(row => {
      const val = Number(row.total_valor || 0);
      const qtd = Number(row.qtd_lancamentos || 0);
      
      // 1. Priorizar associação direta do banco (dre_item / dre_item_associacao)
      let targetSectionId = null;
      if (row.dre_item_id) {
        targetSectionId = mapGrupoToSection(row.dre_item_id, row.dre_grupo_descricao);
      }
      // 2. Fallback baseado no classificador de contas
      if (!targetSectionId) {
        const classification = classifyAccount(row.codigo, row.descricao);
        targetSectionId = classification.sectionId || '7';
      }

      // REGRA DE NEGÓCIO CONTÁBIL:
      // A Sessão 1 (Receita Bruta) e a Sessão 2 (Deduções da Receita Bruta / Impostos sobre Vendas)
      // vêm exclusivamente das movimentações fiscais. Guias a pagar (como 2.02.003 - ICMS DeSTDA)
      // não entram na Seção 2 da DRE como deduções do faturamento.
      if (
        targetSectionId === '1' ||
        targetSectionId === '2' ||
        row.codigo === '2.02.003' ||
        row.planocontas_id === 32 ||
        String(row.codigo || '').startsWith('2.02.')
      ) {
        return;
      }

      // 3. Os planos de contas 2.01.001 (DUPLICATAS DE ENTRADA) e 2.01.002 (DUPLICATAS DE RECARGA)
      //    NÃO pertencem ao Custo das Mercadorias Vendidas (CMV - Seção 3).
      //    No ERP, 2.01.001 é associado a Despesas Comerciais (Seção 4) e 2.01.002 a Outras Despesas (Seção 7).
      if (row.codigo === '2.01.001' && targetSectionId === '3') {
        targetSectionId = '4'; // 4. DESPESAS COMERCIAIS
      } else if (row.codigo === '2.01.002' && targetSectionId === '3') {
        targetSectionId = '7'; // 7. OUTRAS DESPESAS
      }

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
  }

  // Integrar dados fiscais de movimentação (Receita Bruta, Deduções e CMV)
  if (fiscalData) {
    if (fiscalData.itensReceita && fiscalData.itensReceita.length > 0) {
      fiscalData.itensReceita.forEach(item => {
        sectionBuckets['1'].total += item.total_valor;
        sectionBuckets['1'].qtdLancamentos += item.qtd_lancamentos;
        sectionBuckets['1'].contasMap[item.descricao] = {
          codigo: item.codigo,
          descricao: item.descricao,
          total_valor: item.total_valor,
          qtd_lancamentos: item.qtd_lancamentos
        };
      });
    }

    if (fiscalData.itensDeducoes && fiscalData.itensDeducoes.length > 0) {
      fiscalData.itensDeducoes.forEach(item => {
        sectionBuckets['2'].total += item.total_valor;
        sectionBuckets['2'].qtdLancamentos += item.qtd_lancamentos;
        sectionBuckets['2'].contasMap[item.descricao] = {
          codigo: item.codigo,
          descricao: item.descricao,
          total_valor: item.total_valor,
          qtd_lancamentos: item.qtd_lancamentos
        };
      });
    }

    if (fiscalData.itensCmv && fiscalData.itensCmv.length > 0) {
      fiscalData.itensCmv.forEach(item => {
        sectionBuckets['3'].total += item.total_valor;
        sectionBuckets['3'].qtdLancamentos += item.qtd_lancamentos;
        sectionBuckets['3'].contasMap[item.descricao] = {
          codigo: item.codigo,
          descricao: item.descricao,
          total_valor: item.total_valor,
          qtd_lancamentos: item.qtd_lancamentos
        };
      });
    }
  }

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
  const valorDepreciacao = sectionBuckets['depreciacao']?.total || 3085.68;
  const s9 = sectionBuckets['9']?.total || 0;
  const s10 = sectionBuckets['10']?.total || 0;
  const lair = lajir - valorDepreciacao - s9 + s10;
  const s11 = sectionBuckets['11']?.total || 0;
  const resLiquido = lair - s11;

  // Base para análise vertical (% AV)
  const totalDespesas = s2 + s3 + s4 + s5 + s6 + s7 + valorDepreciacao + s9 + s11;
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
    depreciacao: valorDepreciacao,
    lair,
    resultadoLiquido: resLiquido,
    totalDespesas,
    itensDRE
  };
}

// 7. Demonstrativo DRE Estruturado
app.get('/api/dre', async (req, res) => {
  try {
    const { regime = 'competencia', dt_inicio, dt_fim, filial_id, busca, planos_excluidos } = req.query;
    const planosExcluidosList = parsePlanosExcluidos(planos_excluidos);

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('COALESCE(p.dafilial_id, p.filial_id) = ?');
        params.push(filial_id);
      }

      // Filtro de Planos de Contas Excluídos
      if (planosExcluidosList.length > 0) {
        whereClauses.push(`p.planocontas_id NOT IN (${planosExcluidosList.map(() => '?').join(',')})`);
        params.push(...planosExcluidosList);
      }

      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      // Filtro de Período e Regime na DRE: Competência por dt_emissao, Caixa por dt_pgto
      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
        whereClauses.push('COALESCE(p.valor_pago, 0) > 0');
        if (dt_inicio && dt_inicio.trim() !== '') {
          whereClauses.push('DATE(p.dt_pgto) >= ?');
          params.push(dt_inicio.trim().split('T')[0]);
        }
        if (dt_fim && dt_fim.trim() !== '') {
          whereClauses.push('DATE(p.dt_pgto) <= ?');
          params.push(dt_fim.trim().split('T')[0]);
        }
      } else {
        // Competência (filtro oficial por dt_emissao)
        if (dt_inicio && dt_inicio.trim() !== '') {
          whereClauses.push('DATE(COALESCE(p.dt_emissao, p.dtcadastro)) >= ?');
          params.push(dt_inicio.trim().split('T')[0]);
        }
        if (dt_fim && dt_fim.trim() !== '') {
          whereClauses.push('DATE(COALESCE(p.dt_emissao, p.dtcadastro)) <= ?');
          params.push(dt_fim.trim().split('T')[0]);
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
          COALESCE(di.item_id, 0) as dre_item_id,
          di.descricao as dre_grupo_descricao,
          COUNT(p.pagar_id) as qtd_lancamentos,
          SUM(COALESCE(${valorField}, 0)) as total_valor
        FROM pagar p
        LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
        LEFT JOIN dre_item_associacao dia ON dia.id = pc.planocontas_id AND dia.apagado = 'N'
        LEFT JOIN dre_item di ON di.item_id = dia.item_id AND di.apagado = 'N'
        ${whereSql}
        GROUP BY 
          pc.planocontas_id,
          pc.codigo,
          pc.descricao,
          pc.totalizador,
          pc.operacao,
          pc.opdesp,
          di.item_id,
          di.descricao
        ORDER BY pc.codigo ASC
      `;

      // 1. Consultar dados fiscais de Receita Bruta, Deduções e CMV das movimentações
      let fiscalData = null;
      try {
        fiscalData = await getFiscalRevenueAndCmv(pool, {
          filialId: filial_id,
          dtInicio: dt_inicio,
          dtFim: dt_fim
        });
      } catch (errFiscal) {
        console.warn('Falha ao calcular dados fiscais:', errFiscal.message);
      }

      // 2. No regime de competência, consultar despesas analíticas da view oficial 'vw_dre_despesas_analitico'
      let expenseRows = null;
      if (regime === 'competencia') {
        try {
          expenseRows = await getExpensesFromView(pool, {
            filialId: filial_id,
            dtInicio: dt_inicio,
            dtFim: dt_fim,
            busca,
            planosExcluidos: planosExcluidosList
          });
        } catch (errExp) {
          console.warn('Falha ao consultar view vw_dre_despesas_analitico:', errExp.message);
        }
      }

      // 3. Consultar despesas da tabela pagar (usado para Caixa ou fallback de competência)
      const [rows] = await pool.query(sql, params);
      const dreResult = generateStructuredDre(rows, regime, fiscalData, expenseRows);
      return res.json(dreResult);
    }

    // Mock DRE
    let filtered = pagarMock.filter(p => p.apagado === 'N');
    if (shouldFilterByFilial(filial_id)) {
      filtered = filtered.filter(p => p.filial_id == filial_id);
    }
    if (planosExcluidosList.length > 0) {
      filtered = filtered.filter(p => !planosExcluidosList.includes(p.planocontas_id));
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
      filtered = filtered.filter(p => p.dt_pgto && Number(p.valor_pago || 0) > 0 && (!dt_inicio || p.dt_pgto >= dt_inicio) && (!dt_fim || p.dt_pgto <= dt_fim));
    } else {
      filtered = filtered.filter(p => {
        const d = p.dt_emissao || p.dt_competencia;
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
    const { regime = 'competencia', dt_inicio, dt_fim, filial_id, busca, planos_excluidos } = req.query;
    const planosExcluidosList = parsePlanosExcluidos(planos_excluidos);

    if (isDbAvailable()) {
      const pool = getPool();
      let whereClauses = ['p.apagado = "N"'];
      let params = [];

      if (shouldFilterByFilial(filial_id)) {
        whereClauses.push('COALESCE(p.dafilial_id, p.filial_id) = ?');
        params.push(filial_id);
      }

      // Filtro de Planos de Contas Excluídos
      if (planosExcluidosList.length > 0) {
        whereClauses.push(`p.planocontas_id NOT IN (${planosExcluidosList.map(() => '?').join(',')})`);
        params.push(...planosExcluidosList);
      }

      if (busca && busca.trim() !== '') {
        whereClauses.push('(p.historico LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      if (regime === 'caixa') {
        whereClauses.push('p.dt_pgto IS NOT NULL');
        whereClauses.push('COALESCE(p.valor_pago, 0) > 0');
      }

      const dateField = regime === 'caixa'
        ? 'DATE(p.dt_pgto)'
        : 'DATE(COALESCE(p.dt_emissao, p.dtcadastro))';
      const valField = regime === 'caixa' ? 'p.valor_pago' : 'p.valor';

      if (dt_inicio && dt_inicio.trim() !== '') {
        whereClauses.push(`${dateField} >= ?`);
        params.push(dt_inicio.trim().split('T')[0]);
      }
      if (dt_fim && dt_fim.trim() !== '') {
        whereClauses.push(`${dateField} <= ?`);
        params.push(dt_fim.trim().split('T')[0]);
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
      filtro_plano = 'todos',
      sem_plano,
      planos_excluidos,
      page = 1,
      limit = 50,
      export: isExport = 'false'
    } = req.query;

    const planosExcluidosList = parsePlanosExcluidos(planos_excluidos);
    const apenasSemPlano = filtro_plano === 'sem_plano' || sem_plano === 'true' || sem_plano === '1';
    const apenasComPlano = filtro_plano === 'com_plano';
    const isExportMode = isExport === 'true' || isExport === '1';

    const reqLimit = isExportMode ? Math.min(50000, parseInt(limit, 10) || 50000) : Math.max(1, Math.min(1000, parseInt(limit, 10) || 50));
    const reqPage = Math.max(1, parseInt(page, 10));
    const offset = isExportMode ? 0 : (reqPage - 1) * reqLimit;

    if (isDbAvailable()) {
      const pool = getPool();
      let baseWhereClauses = ['p.apagado = "N"'];
      let baseParams = [];

      if (shouldFilterByFilial(filial_id)) {
        baseWhereClauses.push('COALESCE(p.dafilial_id, p.filial_id) = ?');
        baseParams.push(filial_id);
      }

      // Filtro de Planos de Contas Excluídos
      if (planosExcluidosList.length > 0) {
        baseWhereClauses.push(`p.planocontas_id NOT IN (${planosExcluidosList.map(() => '?').join(',')})`);
        baseParams.push(...planosExcluidosList);
      }

      if (busca && busca.trim() !== '') {
        baseWhereClauses.push('(p.historico LIKE ? OR f.nome LIKE ? OR p.nome_razao_cedente LIKE ? OR p.NF LIKE ?)');
        const searchParam = `%${busca.trim()}%`;
        baseParams.push(searchParam, searchParam, searchParam, searchParam);
      }

      // Filtro de Período e Regime em Lançamentos: Competência por dt_emissao, Caixa por dt_pgto
      if (regime === 'caixa') {
        baseWhereClauses.push('p.dt_pgto IS NOT NULL');
        baseWhereClauses.push('COALESCE(p.valor_pago, 0) > 0');
        if (dt_inicio && dt_inicio.trim() !== '') {
          baseWhereClauses.push('DATE(p.dt_pgto) >= ?');
          baseParams.push(dt_inicio.trim().split('T')[0]);
        }
        if (dt_fim && dt_fim.trim() !== '') {
          baseWhereClauses.push('DATE(p.dt_pgto) <= ?');
          baseParams.push(dt_fim.trim().split('T')[0]);
        }
      } else {
        // Competência (filtro oficial por dt_emissao)
        if (dt_inicio && dt_inicio.trim() !== '') {
          baseWhereClauses.push('DATE(COALESCE(p.dt_emissao, p.dtcadastro)) >= ?');
          baseParams.push(dt_inicio.trim().split('T')[0]);
        }
        if (dt_fim && dt_fim.trim() !== '') {
          baseWhereClauses.push('DATE(COALESCE(p.dt_emissao, p.dtcadastro)) <= ?');
          baseParams.push(dt_fim.trim().split('T')[0]);
        }
      }

      const baseWhereSql = baseWhereClauses.length > 0 ? 'WHERE ' + baseWhereClauses.join(' AND ') : '';

      // 1. Obter contadores consolidados do período para a interface (Total, Sem Plano e Com Plano)
      const [countsResult] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN (p.planocontas_id IS NULL OR p.planocontas_id = 0 OR pc.codigo IS NULL OR TRIM(pc.codigo) = '') THEN 1 ELSE 0 END) as sem_plano,
          SUM(CASE WHEN (p.planocontas_id IS NOT NULL AND p.planocontas_id > 0 AND pc.codigo IS NOT NULL AND TRIM(pc.codigo) != '') THEN 1 ELSE 0 END) as com_plano
        FROM pagar p 
        LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
        LEFT JOIN fornece f ON p.fornece_id = f.fornece_id
        ${baseWhereSql}`,
        baseParams
      );

      const totalCountGeral = Number(countsResult[0]?.total || 0);
      const semPlanoCountGeral = Number(countsResult[0]?.sem_plano || 0);
      const comPlanoCountGeral = Number(countsResult[0]?.com_plano || 0);

      // 2. Cláusula específica para a seleção ativa
      let finalWhereClauses = [...baseWhereClauses];
      let finalParams = [...baseParams];

      if (apenasSemPlano) {
        finalWhereClauses.push('(p.planocontas_id IS NULL OR p.planocontas_id = 0 OR pc.codigo IS NULL OR TRIM(pc.codigo) = "")');
      } else if (apenasComPlano) {
        finalWhereClauses.push('(p.planocontas_id IS NOT NULL AND p.planocontas_id > 0 AND pc.codigo IS NOT NULL AND TRIM(pc.codigo) != "")');
      }

      const finalWhereSql = finalWhereClauses.length > 0 ? 'WHERE ' + finalWhereClauses.join(' AND ') : '';

      let totalRecords = totalCountGeral;
      if (apenasSemPlano) totalRecords = semPlanoCountGeral;
      else if (apenasComPlano) totalRecords = comPlanoCountGeral;

      // 3. Query paginada / exportação
      const queryParams = [...finalParams, reqLimit, offset];
      const sql = `
        SELECT 
          COALESCE(p.dafilial_id, p.filial_id) as filial_id,
          p.pagar_id,
          p.NF,
          p.dt_emissao,
          p.dtvenc,
          p.dt_pgto,
          p.dt_competencia,
          p.historico,
          p.fornece_id,
          COALESCE(NULLIF(TRIM(f.nome), ''), NULLIF(TRIM(p.nome_razao_cedente), ''), 'Fornecedor não informado') as fornecedor_nome,
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
        LEFT JOIN fornece f ON p.fornece_id = f.fornece_id
        LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
        ${finalWhereSql}
        ORDER BY p.pagar_id DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await pool.query(sql, queryParams);

      return res.json({
        totalRecords,
        counts: {
          total: totalCountGeral,
          semPlano: semPlanoCountGeral,
          comPlano: comPlanoCountGeral
        },
        page: reqPage,
        limit: reqLimit,
        records: rows
      });
    }

    // Mock
    let filtered = pagarMock.filter(p => p.apagado === 'N');
    if (shouldFilterByFilial(filial_id)) {
      filtered = filtered.filter(p => p.filial_id == filial_id);
    }
    if (planosExcluidosList.length > 0) {
      filtered = filtered.filter(p => !planosExcluidosList.includes(p.planocontas_id));
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
      filtered = filtered.filter(p => p.dt_pgto && Number(p.valor_pago || 0) > 0 && (!dt_inicio || p.dt_pgto >= dt_inicio) && (!dt_fim || p.dt_pgto <= dt_fim));
    } else {
      filtered = filtered.filter(p => {
        const d = p.dt_emissao || p.dt_competencia;
        return (!dt_inicio || d >= dt_inicio) && (!dt_fim || d <= dt_fim);
      });
    }

    const mockTotal = filtered.length;
    const mockSemPlano = filtered.filter(p => !p.planocontas_id || p.planocontas_id === 0).length;
    const mockComPlano = mockTotal - mockSemPlano;

    if (apenasSemPlano) {
      filtered = filtered.filter(p => !p.planocontas_id || p.planocontas_id === 0);
    } else if (apenasComPlano) {
      filtered = filtered.filter(p => p.planocontas_id && p.planocontas_id > 0);
    }

    const records = filtered.map(p => {
      const pc = planocontasMock.find(c => c.planocontas_id === p.planocontas_id);
      return {
        ...p,
        plano_codigo: pc ? pc.codigo : '',
        plano_descricao: pc ? pc.descricao : 'Sem classificação'
      };
    });

    const paginatedRecords = isExportMode ? records : records.slice(offset, offset + reqLimit);

    res.json({
      totalRecords: records.length,
      counts: {
        total: mockTotal,
        semPlano: mockSemPlano,
        comPlano: mockComPlano
      },
      page: reqPage,
      limit: reqLimit,
      records: paginatedRecords
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
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor DRE Financeiro rodando na porta ${PORT}`);
});

