// Classificador oficial do Plano de Contas para as Sessões da DRE

const DRE_STRUCTURE = [
  {
    id: '1',
    order: 1,
    title: '1. RECEITA BRUTA',
    type: 'receita',
    sign: 1,
    accounts: [
      { codigo: '1.01.001', descricao: 'DINHEIRO' },
      { codigo: '1.01.002', descricao: 'CHEQUE' },
      { codigo: '1.01.003', descricao: 'CARTAO DEBITO' },
      { codigo: '1.01.004', descricao: 'CARTAO CREDITO' },
      { codigo: '1.01.005', descricao: 'CONVÊNIOS' },
      { codigo: '1.01.006', descricao: 'DIFERENCA DE CAIXA' },
      { codigo: '1.01.007', descricao: 'PBMS' }
    ]
  },
  {
    id: '2',
    order: 2,
    title: '2. DEDUÇÕES E ABATIMENTOS',
    type: 'deducao',
    sign: -1,
    accounts: [
      { codigo: '1.02.007', descricao: 'DEVOLUCOES' },
      { codigo: '3.06.008', descricao: 'DESCONTOS CONCEDIDOS EM RECEBIMENTO' },
      { codigo: '2.02.003', descricao: 'ICMS' },
      { codigo: '2.02.004', descricao: 'PIS' },
      { codigo: '2.02.005', descricao: 'COFINS' },
      { codigo: '2.02.007', descricao: 'DAS SIMPLES' }
    ]
  },
  {
    id: 'subtotal_receita_liquida',
    order: 3,
    isSubtotal: true,
    title: '(=) RECEITA LÍQUIDA',
    formula: ['1', '-', '2']
  },
  {
    id: '3',
    order: 4,
    title: '3. CUSTO DAS MERCADORIAS VENDIDAS (CMV)',
    type: 'custo',
    sign: -1,
    accounts: [
      { codigo: '3.01.001', descricao: 'CUSTO DAS MERCADORIAS VENDIDAS (CMV)' },
      { codigo: '3.05.022', descricao: 'FRETE' }
    ]
  },
  {
    id: 'subtotal_resultado_bruto',
    order: 5,
    isSubtotal: true,
    title: '(=) RESULTADO BRUTO',
    formula: ['subtotal_receita_liquida', '-', '3']
  },
  {
    id: '4',
    order: 6,
    title: '4. DESPESAS COMERCIAIS',
    type: 'despesa',
    sign: -1,
    accounts: [
      { codigo: '2.03.004', descricao: 'TAXA DE CARTAO DE CREDITO' },
      { codigo: '2.03.005', descricao: 'TAXA DE CONVÊNIO TERCERIZADOS' },
      { codigo: '2.04.001', descricao: 'COMISSAO VENDEDORES' },
      { codigo: '3.02.018', descricao: 'PANFLETAGEM' },
      { codigo: '3.03.001', descricao: 'ALUGUEL POS CARTAO' },
      { codigo: '3.03.005', descricao: 'PBMS, EPHARMA' },
      { codigo: '3.03.010', descricao: 'TELECHEQUE' },
      { codigo: '3.05.003', descricao: 'LOCUTOR' },
      { codigo: '3.05.007', descricao: 'MARKETING' },
      { codigo: '3.05.012', descricao: 'MOTO TAXI + FRETE ENTREGA' },
      { codigo: '3.05.013', descricao: 'PROMOCAO E PROPAGANDA' },
      { codigo: '3.05.015', descricao: 'ENFEITES' },
      { codigo: '3.05.018', descricao: 'ETIQUETAS, BOBINAS E SACOALS' },
      { codigo: '3.05.023', descricao: 'BRINDES' }
    ]
  },
  {
    id: '5',
    order: 7,
    title: '5. DESPESAS ADMINISTRATIVAS',
    type: 'despesa',
    sign: -1,
    accounts: [
      { codigo: '3.02.001', descricao: 'ALIMENTACAO' },
      { codigo: '3.02.002', descricao: 'LANCHE' },
      { codigo: '3.02.004', descricao: 'MULTA RECISÓRIA' },
      { codigo: '3.02.005', descricao: 'SINDICATO FUNCIONARIOS' },
      { codigo: '3.02.006', descricao: 'VALE TRANSPORTE' },
      { codigo: '3.02.007', descricao: '13º SALARIOS' },
      { codigo: '3.02.008', descricao: 'FERIAS' },
      { codigo: '3.02.009', descricao: 'SALARIOS' },
      { codigo: '3.02.010', descricao: 'INSS' },
      { codigo: '3.02.011', descricao: 'FGTS' },
      { codigo: '3.02.012', descricao: 'PPRA, PCMSO E EXAMES' },
      { codigo: '3.02.013', descricao: 'AVISO PREVIO' },
      { codigo: '3.02.014', descricao: 'PLANO SAUDE/MED OCUP.' },
      { codigo: '3.02.015', descricao: 'PENSAO ALIMENTICIA' },
      { codigo: '3.02.016', descricao: 'UNIFORME' },
      { codigo: '3.02.017', descricao: 'DARF FOLHA PAGAMENTO' },
      { codigo: '3.02.019', descricao: 'GRCS' },
      { codigo: '3.02.020', descricao: 'HORA EXTRAS' },
      { codigo: '3.03.002', descricao: 'CONTADOR' },
      { codigo: '3.03.003', descricao: 'SINDICATOS, ASCOFERJ,ACIAT' },
      { codigo: '3.03.004', descricao: 'MANUTENCAO SOFWARE + HARDWARE' },
      { codigo: '3.03.006', descricao: 'ADVOGADO' },
      { codigo: '3.03.007', descricao: 'CDL' },
      { codigo: '3.04.001', descricao: 'RETIRADA SOCIO 1' },
      { codigo: '3.04.002', descricao: 'RETIRADA SOCIO 2' },
      { codigo: '3.05.009', descricao: 'MATERIAL DE ESCRITORIO' },
      { codigo: '3.05.019', descricao: 'SISTEMA' },
      { codigo: '3.05.024', descricao: 'MATERIAL DE INFORMATICA' }
    ]
  },
  {
    id: '6',
    order: 8,
    title: '6. DESPESAS GERAIS',
    type: 'despesa',
    sign: -1,
    accounts: [
      { codigo: '3.03.008', descricao: 'VIGIA' },
      { codigo: '3.03.009', descricao: 'SEGURO PREDIO' },
      { codigo: '3.03.011', descricao: 'ANVISA' },
      { codigo: '2.02.008', descricao: 'CRF/VIGILANCIA' },
      { codigo: '3.05.001', descricao: 'ENERGIA ELETRICA' },
      { codigo: '3.05.002', descricao: 'UTENSILIOS' },
      { codigo: '3.05.004', descricao: 'AGUA' },
      { codigo: '3.05.005', descricao: 'TELEFONIA' },
      { codigo: '3.05.006', descricao: 'MATERIAL DE LIMPEZA' },
      { codigo: '3.05.008', descricao: 'MANUTENCAO DE INSTALACAO' },
      { codigo: '3.05.010', descricao: 'TAXAS, LICENCAS E CONTRIBUICÕES' },
      { codigo: '3.05.011', descricao: 'ALUGUEL E IPTU' },
      { codigo: '3.05.014', descricao: 'GASOLINA' },
      { codigo: '3.05.016', descricao: 'MATERIAL DE CONSTRUCAO' },
      { codigo: '3.05.017', descricao: 'CORREIOS' },
      { codigo: '3.05.021', descricao: 'MATERIAL ELETRICO' },
      { codigo: '3.05.025', descricao: 'CARTORIO' },
      { codigo: '3.05.026', descricao: 'C.R.F. - CONSELHO REGIONAL FARMACIA' },
      { codigo: '3.05.027', descricao: 'RECARGA DOS EXTINTORES' }
    ]
  },
  {
    id: '7',
    order: 9,
    title: '7. OUTRAS DESPESAS',
    type: 'despesa',
    sign: -1,
    accounts: [
      { codigo: '3.06.006', descricao: 'PERDAS DE CHEQUE / CARTAO' },
      { codigo: '3.06.007', descricao: 'DIFERENCA DE CAIXA' },
      { codigo: '3.07.003', descricao: 'OUTRAS' }
    ]
  },
  {
    id: '8',
    order: 10,
    title: '8. OUTRAS RECEITAS',
    type: 'receita',
    sign: 1,
    accounts: [
      { codigo: '1.02.001', descricao: 'VERBAS DE FORNECEDORES' },
      { codigo: '1.02.002', descricao: 'DIVERSAS' },
      { codigo: '1.02.003', descricao: 'FICHAS' },
      { codigo: '1.02.004', descricao: 'RECARGA' },
      { codigo: '1.02.005', descricao: 'RECEBIMENTO FARMAPLUS' },
      { codigo: '1.02.006', descricao: 'CURSOS / APLICACAO SALAO' }
    ]
  },
  {
    id: 'subtotal_lajir',
    order: 11,
    isSubtotal: true,
    title: '(=) RESULTADO ANTES DAS DESP. E REC. FINANCEIRAS (LAJIR)',
    formula: ['subtotal_resultado_bruto', '-', '4', '-', '5', '-', '6', '-', '7', '+', '8']
  },
  {
    id: '9',
    order: 12,
    title: '9. DESPESAS FINANCEIRAS',
    type: 'despesa_financeira',
    sign: -1,
    accounts: [
      { codigo: '3.06.002', descricao: 'JUROS CHEQUE ESPECIAL' },
      { codigo: '3.06.003', descricao: 'TARIFAS BANCARIAS' },
      { codigo: '3.06.009', descricao: 'TAXA DE ANTECIPACAO' },
      { codigo: '3.06.010', descricao: 'BB GIRO RAPIDO / EMPRESTIMO' },
      { codigo: '3.06.011', descricao: 'CONSORCIO' },
      { codigo: '3.06.012', descricao: 'JUROS COM PAGAMENTOS' }
    ]
  },
  {
    id: '10',
    order: 13,
    title: '10. RECEITAS FINANCEIRAS',
    type: 'receita_financeira',
    sign: 1,
    accounts: [
      { codigo: '1.03.002', descricao: 'DESCONTOS OBTIDOS EM PAGAMENTO' },
      { codigo: '1.03.003', descricao: 'MULTA POR RECEBIMENTO EM ATRASO' },
      { codigo: '1.03.004', descricao: 'JUROS POR RECEBIMENTO EM ATRASO' },
      { codigo: '1.03.005', descricao: 'APLICACÕES BANCARIAS' },
      { codigo: '1.03.006', descricao: 'ANTECIPACAO CARTAO/CHEQUE' },
      { codigo: '1.03.007', descricao: 'OUTRAS' },
      { codigo: '1.03.008', descricao: 'RECUPERACAO DE CHEQUE' }
    ]
  },
  {
    id: 'subtotal_lair',
    order: 14,
    isSubtotal: true,
    title: '(=) RESULTADO ANTES DO IRPJ/CSLL (LAIR)',
    formula: ['subtotal_lajir', '-', '9', '+', '10']
  },
  {
    id: '11',
    order: 15,
    title: '11. PROVISÕES IRPJ/CSLL',
    type: 'imposto_lucro',
    sign: -1,
    accounts: [
      { codigo: '2.02.006', descricao: 'I.R.P.J / C.S.L.L' }
    ]
  },
  {
    id: 'subtotal_resultado_liquido',
    order: 16,
    isSubtotal: true,
    title: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO / PREJUÍZO)',
    formula: ['subtotal_lair', '-', '11']
  }
];

// Mapeamento rápido por código (limpo)
const CODE_TO_SECTION = {};

DRE_STRUCTURE.forEach(section => {
  if (section.accounts) {
    section.accounts.forEach(acc => {
      const cleanCode = acc.codigo.trim().toUpperCase();
      CODE_TO_SECTION[cleanCode] = {
        sectionId: section.id,
        sectionTitle: section.title,
        sectionSign: section.sign,
        sectionType: section.type,
        descricaoPadrao: acc.descricao
      };
    });
  }
});

// Função para identificar a sessão de uma conta com tolerância a formatos
function classifyAccount(codigo, descricao) {
  if (!codigo && !descricao) {
    return {
      sectionId: '7',
      sectionTitle: '7. OUTRAS DESPESAS',
      sectionSign: -1,
      sectionType: 'despesa'
    };
  }

  const cleanCode = String(codigo || '').trim().toUpperCase();
  if (CODE_TO_SECTION[cleanCode]) {
    return CODE_TO_SECTION[cleanCode];
  }

  // Tenta match aproximado pelo código ou descrição
  const descUpper = String(descricao || '').toUpperCase();

  // Receitas
  if (descUpper.includes('DINHEIRO') || descUpper.includes('CARTAO DEBITO') || descUpper.includes('CARTAO CREDITO') || descUpper.includes('CONVÊNIO')) {
    return CODE_TO_SECTION['1.01.001'] || { sectionId: '1', sectionTitle: '1. RECEITA BRUTA', sectionSign: 1, sectionType: 'receita' };
  }
  if (descUpper.includes('DEVOLUCAO') || descUpper.includes('ICMS') || descUpper.includes('PIS') || descUpper.includes('COFINS') || descUpper.includes('DAS SIMPLES')) {
    return { sectionId: '2', sectionTitle: '2. DEDUÇÕES E ABATIMENTOS', sectionSign: -1, sectionType: 'deducao' };
  }
  if (descUpper.includes('FRETE')) {
    return { sectionId: '3', sectionTitle: '3. CUSTO DAS MERCADORIAS VENDIDAS (CMV)', sectionSign: -1, sectionType: 'custo' };
  }
  if (descUpper.includes('TAXA') && (descUpper.includes('CARTAO') || descUpper.includes('POS')) || descUpper.includes('COMISSAO') || descUpper.includes('MARKETING') || descUpper.includes('PROPAGANDA')) {
    return { sectionId: '4', sectionTitle: '4. DESPESAS COMERCIAIS', sectionSign: -1, sectionType: 'despesa' };
  }
  if (descUpper.includes('SALARIO') || descUpper.includes('FOLHA') || descUpper.includes('INSS') || descUpper.includes('FGTS') || descUpper.includes('CONTADOR') || descUpper.includes('SOCIO') || descUpper.includes('PRO-LABORE')) {
    return { sectionId: '5', sectionTitle: '5. DESPESAS ADMINISTRATIVAS', sectionSign: -1, sectionType: 'despesa' };
  }
  if (descUpper.includes('ENERGIA') || descUpper.includes('ALUGUEL') || descUpper.includes('AGUA') || descUpper.includes('TELEFONE') || descUpper.includes('LIMPEZA')) {
    return { sectionId: '6', sectionTitle: '6. DESPESAS GERAIS', sectionSign: -1, sectionType: 'despesa' };
  }
  if (descUpper.includes('JUROS') || descUpper.includes('TARIFA') || descUpper.includes('EMPRESTIMO') || descUpper.includes('CONSORCIO')) {
    return { sectionId: '9', sectionTitle: '9. DESPESAS FINANCEIRAS', sectionSign: -1, sectionType: 'despesa_financeira' };
  }
  if (descUpper.includes('DESCONTO OBTIDO') || descUpper.includes('APLICACAO BANCARIA')) {
    return { sectionId: '10', sectionTitle: '10. RECEITAS FINANCEIRAS', sectionSign: 1, sectionType: 'receita_financeira' };
  }
  if (descUpper.includes('IRPJ') || descUpper.includes('CSLL')) {
    return { sectionId: '11', sectionTitle: '11. PROVISÕES IRPJ/CSLL', sectionSign: -1, sectionType: 'imposto_lucro' };
  }

  // Fallback baseado no primeiro dígito do código
  if (cleanCode.startsWith('1')) {
    return { sectionId: '1', sectionTitle: '1. RECEITA BRUTA', sectionSign: 1, sectionType: 'receita' };
  }
  if (cleanCode.startsWith('3.01')) {
    return { sectionId: '3', sectionTitle: '3. CUSTO DAS MERCADORIAS VENDIDAS (CMV)', sectionSign: -1, sectionType: 'custo' };
  }
  if (cleanCode.startsWith('2.02')) {
    return { sectionId: '2', sectionTitle: '2. DEDUÇÕES E ABATIMENTOS', sectionSign: -1, sectionType: 'deducao' };
  }
  if (cleanCode.startsWith('2')) {
    return { sectionId: '4', sectionTitle: '4. DESPESAS COMERCIAIS', sectionSign: -1, sectionType: 'despesa' };
  }
  if (cleanCode.startsWith('3.02') || cleanCode.startsWith('3.03') || cleanCode.startsWith('3.04')) {
    return { sectionId: '5', sectionTitle: '5. DESPESAS ADMINISTRATIVAS', sectionSign: -1, sectionType: 'despesa' };
  }
  if (cleanCode.startsWith('3.05')) {
    return { sectionId: '6', sectionTitle: '6. DESPESAS GERAIS', sectionSign: -1, sectionType: 'despesa' };
  }
  if (cleanCode.startsWith('3.06')) {
    return { sectionId: '9', sectionTitle: '9. DESPESAS FINANCEIRAS', sectionSign: -1, sectionType: 'despesa_financeira' };
  }

  return {
    sectionId: '7',
    sectionTitle: '7. OUTRAS DESPESAS',
    sectionSign: -1,
    sectionType: 'despesa'
  };
}

module.exports = {
  DRE_STRUCTURE,
  CODE_TO_SECTION,
  classifyAccount
};

