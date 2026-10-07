// Serviço para geração do Demonstrativo DRE Mês a Mês (Visão 12 Meses)
// Estrutura idêntica à planilha oficial da Drogaria SC

const VALOR_DEPRECIACAO_FIXA = 3085.68;

function shouldFilterByFilial(filialId) {
  if (!filialId || filialId === 'todas' || String(filialId) === '1') {
    return false; // Filial 1 (Escritório) consolida todas as lojas
  }
  return true;
}

/**
 * Mapeia grupo_id da view de despesas para as seções oficiais da DRE
 */
function mapGrupoToKey(grupoId, grupoDescricao) {
  const gId = Number(grupoId);
  const desc = String(grupoDescricao || '').toUpperCase();

  if (gId === 6 || desc.includes('COMERCIA')) return 'comerciais';
  if (gId === 7 || desc.includes('ADMINISTRA')) return 'administrativas';
  if (gId === 8 || desc.includes('GERAIS')) return 'gerais';
  if (gId === 9 || desc.includes('OUTRAS DESPESAS')) return 'outras_despesas';
  if (gId === 10 || desc.includes('OUTRAS RECEITAS')) return 'outras_receitas';
  if (gId === 12 || desc.includes('DESPESAS FINANCEIRAS')) return 'financeiras_desp';
  if (gId === 13 || desc.includes('RECEITAS FINANCEIRAS')) return 'financeiras_rec';
  return 'outras_despesas';
}

async function getMonthlyDreData(pool, { ano = 2026, regime = 'competencia', filialId, planosExcluidos = [] }) {
  const anoInt = parseInt(ano, 10) || 2026;
  const mesesHeader = [
    `JAN/${anoInt}`, `FEV/${anoInt}`, `MAR/${anoInt}`, `ABR/${anoInt}`,
    `MAI/${anoInt}`, `JUN/${anoInt}`, `JUL/${anoInt}`, `AGO/${anoInt}`,
    `SET/${anoInt}`, `OUT/${anoInt}`, `NOV/${anoInt}`, `DEZ/${anoInt}`
  ];

  // Estrutura de acumulação por mês (1..12 -> array de 12 posições)
  const createMonthsArray = () => new Array(12).fill(0);

  // Baldes por grupo
  const grupos = {
    receita_bruta: {
      titulo: 'RECEITA BRUTA',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    deducoes: {
      titulo: 'DEDUÇÕES E ABATIMENTOS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    cmv: {
      titulo: 'CUSTO DAS MERCADORIAS VENDIDAS (CMV)',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    comerciais: {
      titulo: 'DESPESAS COMERCIAIS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    administrativas: {
      titulo: 'DESPESAS ADMINISTRATIVAS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    gerais: {
      titulo: 'DESPESAS GERAIS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    outras_despesas: {
      titulo: 'OUTRAS DESPESAS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    outras_receitas: {
      titulo: 'OUTRAS RECEITAS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    financeiras_desp: {
      titulo: 'DESPESAS FINANCEIRAS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    },
    financeiras_rec: {
      titulo: 'RECEITAS FINANCEIRAS',
      isGroupHeader: true,
      subitens: {},
      meses: createMonthsArray()
    }
  };

  if (pool) {
    // 1. FATURAMENTO, DEDUÇÕES E CMV (view fiscal 'vw_dre_faturamento_cmv')
    try {
      let fatWhere = ['YEAR(v.data_movimento) = ?'];
      let fatParams = [anoInt];

      if (shouldFilterByFilial(filialId)) {
        fatWhere.push('v.filial_id = ?');
        fatParams.push(filialId);
      }

      const [fatRows] = await pool.query(`
        SELECT 
          MONTH(v.data_movimento) as mes,
          v.tipo,
          v.origem,
          SUM(v.valor) as total
        FROM vw_dre_faturamento_cmv v
        WHERE ${fatWhere.join(' AND ')}
        GROUP BY MONTH(v.data_movimento), v.tipo, v.origem
        ORDER BY mes ASC, v.tipo
      `, fatParams);

      fatRows.forEach(row => {
        const mIdx = Number(row.mes) - 1;
        if (mIdx < 0 || mIdx > 11) return;
        const val = Number(row.total || 0);
        const origem = row.origem || 'Outros';

        if (row.tipo === 'RECEITA_BRUTA') {
          grupos.receita_bruta.meses[mIdx] += val;
          if (!grupos.receita_bruta.subitens[origem]) {
            grupos.receita_bruta.subitens[origem] = { titulo: origem, meses: createMonthsArray() };
          }
          grupos.receita_bruta.subitens[origem].meses[mIdx] += val;
        } else if (row.tipo === 'DEDUCAO') {
          grupos.deducoes.meses[mIdx] += val;
          if (!grupos.deducoes.subitens[origem]) {
            grupos.deducoes.subitens[origem] = { titulo: origem, meses: createMonthsArray() };
          }
          grupos.deducoes.subitens[origem].meses[mIdx] += val;
        } else if (row.tipo === 'CMV') {
          grupos.cmv.meses[mIdx] += val;
          if (!grupos.cmv.subitens[origem]) {
            grupos.cmv.subitens[origem] = { titulo: origem, meses: createMonthsArray() };
          }
          grupos.cmv.subitens[origem].meses[mIdx] += val;
        }
      });
    } catch (errFat) {
      console.warn('Erro ao consultar faturamento mensal:', errFat.message);
    }

    // 2. DESPESAS OPERACIONAIS
    if (regime === 'competencia') {
      try {
        let expWhere = [
          'YEAR(v.data_movimento) = ?',
          'v.grupo_id IN (6, 7, 8, 9, 10, 12, 13, 15)'
        ];
        let expParams = [anoInt];

        if (shouldFilterByFilial(filialId)) {
          expWhere.push('v.filial_id = ?');
          expParams.push(filialId);
        }

        if (Array.isArray(planosExcluidos) && planosExcluidos.length > 0) {
          expWhere.push(`v.planocontas_id NOT IN (${planosExcluidos.map(() => '?').join(',')})`);
          expParams.push(...planosExcluidos);
        }

        const [expRows] = await pool.query(`
          SELECT 
            MONTH(v.data_movimento) as mes,
            v.grupo_id,
            v.grupo_descricao,
            v.planocontas_id,
            v.conta_codigo,
            v.conta_descricao,
            v.conta_formatada,
            SUM(v.valor) as total
          FROM vw_dre_despesas_analitico v
          WHERE ${expWhere.join(' AND ')}
          GROUP BY MONTH(v.data_movimento), v.grupo_id, v.planocontas_id
          ORDER BY v.grupo_id ASC, v.conta_codigo ASC
        `, expParams);

        expRows.forEach(row => {
          const mIdx = Number(row.mes) - 1;
          if (mIdx < 0 || mIdx > 11) return;
          const val = Number(row.total || 0);

          // REGRA DE NEGÓCIO CONTÁBIL:
          // Contas do grupo 2.02 (Impostos sobre Vendas / DAS / ICMS / ISS) já são apuradas
          // na Seção de Deduções e Abatimentos da Receita Bruta.
          // NÃO DEVEM ser duplicadas dentro de Despesas Operacionais (Comerciais, Administrativas, Outras Despesas).
          if (
            String(row.conta_codigo || '').startsWith('2.02.') ||
            row.planocontas_id === 32 ||
            (row.conta_descricao && row.conta_descricao.toUpperCase().includes('DAS SIMPLES'))
          ) {
            return;
          }

          let gKey = mapGrupoToKey(row.grupo_id, row.grupo_descricao);
          if (row.conta_codigo === '2.01.001' || row.conta_codigo === '2.01.002') {
            gKey = 'comerciais';
          }

          const contaLabel = row.conta_formatada || `${row.conta_codigo || 'S/C'} - ${row.conta_descricao || 'Outros'}`;

          if (grupos[gKey]) {
            grupos[gKey].meses[mIdx] += val;
            if (!grupos[gKey].subitens[contaLabel]) {
              grupos[gKey].subitens[contaLabel] = {
                codigo: row.conta_codigo,
                descricao: row.conta_descricao,
                titulo: contaLabel,
                meses: createMonthsArray()
              };
            }
            grupos[gKey].subitens[contaLabel].meses[mIdx] += val;
          }
        });
      } catch (errExpView) {
        console.warn('Erro ao consultar despesas da view mensal:', errExpView.message);
      }
    } else {
      // Regime de Caixa: consulta a tabela pagar filtrando por dt_pgto
      try {
        let caixaWhere = [
          'p.apagado = "N"',
          'p.dt_pgto IS NOT NULL',
          'COALESCE(p.valor_pago, 0) > 0',
          'YEAR(p.dt_pgto) = ?'
        ];
        let caixaParams = [anoInt];

        if (shouldFilterByFilial(filialId)) {
          caixaWhere.push('COALESCE(p.dafilial_id, p.filial_id) = ?');
          caixaParams.push(filialId);
        }

        if (Array.isArray(planosExcluidos) && planosExcluidos.length > 0) {
          caixaWhere.push(`p.planocontas_id NOT IN (${planosExcluidos.map(() => '?').join(',')})`);
          caixaParams.push(...planosExcluidos);
        }

        const [caixaRows] = await pool.query(`
          SELECT 
            MONTH(p.dt_pgto) as mes,
            COALESCE(di.item_id, 0) as grupo_id,
            COALESCE(di.descricao, 'OUTRAS DESPESAS') as grupo_descricao,
            COALESCE(pc.codigo, 'S/C') as conta_codigo,
            COALESCE(pc.descricao, 'Outros') as conta_descricao,
            CONCAT(COALESCE(pc.codigo, 'S/C'), ' - ', COALESCE(pc.descricao, 'Outros')) as conta_formatada,
            SUM(COALESCE(p.valor_pago, 0)) as total
          FROM pagar p
          LEFT JOIN planocontas pc ON p.planocontas_id = pc.planocontas_id
          LEFT JOIN dre_item_associacao dia ON dia.id = pc.planocontas_id AND dia.apagado = 'N'
          LEFT JOIN dre_item di ON di.item_id = dia.item_id AND di.apagado = 'N'
          WHERE ${caixaWhere.join(' AND ')}
          GROUP BY MONTH(p.dt_pgto), p.planocontas_id
          ORDER BY pc.codigo ASC
        `, caixaParams);

        caixaRows.forEach(row => {
          const mIdx = Number(row.mes) - 1;
          if (mIdx < 0 || mIdx > 11) return;
          const val = Number(row.total || 0);

          // REGRA DE NEGÓCIO CONTÁBIL:
          // Contas do grupo 2.02 (Impostos sobre Vendas / DAS / ICMS / ISS) já são apuradas
          // na Seção de Deduções e Abatimentos da Receita Bruta.
          // NÃO DEVEM ser duplicadas dentro de Despesas Operacionais (Comerciais, Administrativas, Outras Despesas).
          if (
            String(row.conta_codigo || '').startsWith('2.02.') ||
            row.planocontas_id === 32 ||
            (row.conta_descricao && row.conta_descricao.toUpperCase().includes('DAS SIMPLES'))
          ) {
            return;
          }

          let gKey = 'outras_despesas';
          if (row.grupo_id) {
            gKey = mapGrupoToKey(row.grupo_id, row.grupo_descricao);
          }
          if (row.conta_codigo === '2.01.001' || row.conta_codigo === '2.01.002') {
            gKey = 'comerciais';
          }

          const contaLabel = row.conta_formatada;
          if (grupos[gKey]) {
            grupos[gKey].meses[mIdx] += val;
            if (!grupos[gKey].subitens[contaLabel]) {
              grupos[gKey].subitens[contaLabel] = {
                codigo: row.conta_codigo,
                descricao: row.conta_descricao,
                titulo: contaLabel,
                meses: createMonthsArray()
              };
            }
            grupos[gKey].subitens[contaLabel].meses[mIdx] += val;
          }
        });
      } catch (errCaixa) {
        console.warn('Erro ao consultar despesas no caixa mensal:', errCaixa.message);
      }
    }
  }

  // 3. Montar Linhas Finais Estruturadas (com cálculos de Subtotais idênticos à planilha enviada)
  const linhas = [];

  const somaArray = (arr) => arr.reduce((acc, v) => acc + (v || 0), 0);

  // Helper para adicionar grupo com suas sublinhas analíticas
  const addGrupoComSublinhas = (grupo, tipo = 'despesa') => {
    const totalAno = somaArray(grupo.meses);
    linhas.push({
      id: grupo.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      tipo: 'grupo',
      isSubtotal: false,
      titulo: grupo.titulo,
      meses: grupo.meses,
      totalAno
    });

    const subKeys = Object.keys(grupo.subitens).sort();
    subKeys.forEach(k => {
      const sub = grupo.subitens[k];
      const totSub = somaArray(sub.meses);
      linhas.push({
        id: `sub_${k.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        tipo: 'analitico',
        isSubtotal: false,
        titulo: sub.titulo,
        meses: sub.meses,
        totalAno: totSub
      });
    });
  };

  // 1. RECEITA BRUTA
  addGrupoComSublinhas(grupos.receita_bruta, 'receita');

  // 2. DEDUÇÕES E ABATIMENTOS
  addGrupoComSublinhas(grupos.deducoes, 'deducao');

  // 3. RECEITA LÍQUIDA (Subtotal = Receita Bruta - Deduções)
  const mesesRecLiquida = createMonthsArray();
  for (let i = 0; i < 12; i++) {
    mesesRecLiquida[i] = grupos.receita_bruta.meses[i] - grupos.deducoes.meses[i];
  }
  linhas.push({
    id: 'receita_liquida',
    tipo: 'subtotal',
    isSubtotal: true,
    titulo: 'RECEITA LÍQUIDA',
    meses: mesesRecLiquida,
    totalAno: somaArray(mesesRecLiquida)
  });

  // 4. CUSTO DAS MERCADORIAS VENDIDAS (CMV)
  addGrupoComSublinhas(grupos.cmv, 'cmv');

  // 5. RESULTADO BRUTO (Subtotal = Receita Líquida - CMV)
  const mesesResBruto = createMonthsArray();
  for (let i = 0; i < 12; i++) {
    mesesResBruto[i] = mesesRecLiquida[i] - grupos.cmv.meses[i];
  }
  linhas.push({
    id: 'resultado_bruto',
    tipo: 'subtotal',
    isSubtotal: true,
    titulo: 'RESULTADO BRUTO',
    meses: mesesResBruto,
    totalAno: somaArray(mesesResBruto)
  });

  // 6. DESPESAS COMERCIAIS
  addGrupoComSublinhas(grupos.comerciais, 'despesa');

  // 7. DESPESAS ADMINISTRATIVAS
  addGrupoComSublinhas(grupos.administrativas, 'despesa');

  // 8. DESPESAS GERAIS
  addGrupoComSublinhas(grupos.gerais, 'despesa');

  // 9. OUTRAS DESPESAS
  addGrupoComSublinhas(grupos.outras_despesas, 'despesa');

  // 10. OUTRAS RECEITAS
  addGrupoComSublinhas(grupos.outras_receitas, 'receita');

  // 11. RESULTADO ANTES DAS DESPESAS E RECEITAS FINANCEIRAS (LAJIR)
  const mesesLajir = createMonthsArray();
  for (let i = 0; i < 12; i++) {
    mesesLajir[i] =
      mesesResBruto[i] -
      grupos.comerciais.meses[i] -
      grupos.administrativas.meses[i] -
      grupos.gerais.meses[i] -
      grupos.outras_despesas.meses[i] +
      grupos.outras_receitas.meses[i];
  }
  linhas.push({
    id: 'lajir',
    tipo: 'subtotal',
    isSubtotal: true,
    titulo: 'RESULTADO ANTES DAS DESP. E REC. FINANCEIRAS (LAJIR)',
    meses: mesesLajir,
    totalAno: somaArray(mesesLajir)
  });

  // 12. DEPRECIAÇÃO FIXA (R$ 3.085,68 para cada mês com movimentação ou completo)
  const mesesDepreciacao = createMonthsArray();
  for (let i = 0; i < 12; i++) {
    // Aplica depreciação mensal
    mesesDepreciacao[i] = VALOR_DEPRECIACAO_FIXA;
  }
  linhas.push({
    id: 'depreciacao',
    tipo: 'fixo',
    isSubtotal: false,
    titulo: 'DEPRECIAÇÃO FIXA MENSAL',
    meses: mesesDepreciacao,
    totalAno: somaArray(mesesDepreciacao)
  });

  // 13. DESPESAS FINANCEIRAS
  addGrupoComSublinhas(grupos.financeiras_desp, 'despesa');

  // 14. RECEITAS FINANCEIRAS
  addGrupoComSublinhas(grupos.financeiras_rec, 'receita');

  // 15. RESULTADO LÍQUIDO
  const mesesResLiquido = createMonthsArray();
  for (let i = 0; i < 12; i++) {
    mesesResLiquido[i] =
      mesesLajir[i] -
      mesesDepreciacao[i] -
      grupos.financeiras_desp.meses[i] +
      grupos.financeiras_rec.meses[i];
  }
  linhas.push({
    id: 'resultado_liquido',
    tipo: 'subtotal_final',
    isSubtotal: true,
    titulo: 'RESULTADO LÍQUIDO',
    meses: mesesResLiquido,
    totalAno: somaArray(mesesResLiquido)
  });

  return {
    ano: anoInt,
    regime,
    filialId: filialId || '1',
    mesesHeader,
    linhas
  };
}

module.exports = {
  getMonthlyDreData
};

