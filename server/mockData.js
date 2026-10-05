// Dados realistas de acordo com o plano de contas e estrutura oficial informada
const planocontasMock = [
  // 1. RECEITA BRUTA
  { planocontas_id: 1, codigo: '1.01.001', descricao: 'DINHEIRO', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 2, codigo: '1.01.002', descricao: 'CHEQUE', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 3, codigo: '1.01.003', descricao: 'CARTAO DEBITO', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 4, codigo: '1.01.004', descricao: 'CARTAO CREDITO', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 5, codigo: '1.01.005', descricao: 'CONVÊNIOS', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 6, codigo: '1.01.006', descricao: 'DIFERENCA DE CAIXA', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 7, codigo: '1.01.007', descricao: 'PBMS', totalizador: 'N', operacao: 'C', opdesp: 'N' },

  // 2. DEDUÇÕES E ABATIMENTOS
  { planocontas_id: 8, codigo: '1.02.007', descricao: 'DEVOLUCOES', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 9, codigo: '3.06.008', descricao: 'DESCONTOS CONCEDIDOS EM RECEBIMENTO', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 10, codigo: '2.02.003', descricao: 'ICMS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 11, codigo: '2.02.004', descricao: 'PIS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 12, codigo: '2.02.005', descricao: 'COFINS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 13, codigo: '2.02.007', descricao: 'DAS SIMPLES', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 3. CMV
  { planocontas_id: 14, codigo: '2.01.001', descricao: 'DUPLICATAS DE ENTRADA', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 15, codigo: '2.01.002', descricao: 'DUPLICATAS DE RECARGA E FICHAS BALANCA', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 16, codigo: '3.05.022', descricao: 'FRETE', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 4. DESPESAS COMERCIAIS
  { planocontas_id: 17, codigo: '2.03.004', descricao: 'TAXA DE CARTAO DE CREDITO', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 18, codigo: '2.03.005', descricao: 'TAXA DE CONVÊNIO TERCERIZADOS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 19, codigo: '2.04.001', descricao: 'COMISSAO VENDEDORES', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 20, codigo: '3.02.018', descricao: 'PANFLETAGEM', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 21, codigo: '3.03.001', descricao: 'ALUGUEL POS CARTAO', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 22, codigo: '3.05.007', descricao: 'MARKETING', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 23, codigo: '3.05.018', descricao: 'ETIQUETAS, BOBINAS E SACOALS', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 5. DESPESAS ADMINISTRATIVAS
  { planocontas_id: 24, codigo: '3.02.001', descricao: 'ALIMENTACAO', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 25, codigo: '3.02.006', descricao: 'VALE TRANSPORTE', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 26, codigo: '3.02.009', descricao: 'SALARIOS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 27, codigo: '3.02.010', descricao: 'INSS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 28, codigo: '3.02.011', descricao: 'FGTS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 29, codigo: '3.03.002', descricao: 'CONTADOR', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 30, codigo: '3.04.001', descricao: 'RETIRADA SOCIO 1', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 31, codigo: '3.05.019', descricao: 'SISTEMA', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 6. DESPESAS GERAIS
  { planocontas_id: 32, codigo: '3.05.001', descricao: 'ENERGIA ELETRICA', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 33, codigo: '3.05.004', descricao: 'AGUA', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 34, codigo: '3.05.005', descricao: 'TELEFONIA', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 35, codigo: '3.05.006', descricao: 'MATERIAL DE LIMPEZA', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 36, codigo: '3.05.011', descricao: 'ALUGUEL E IPTU', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 7. OUTRAS DESPESAS
  { planocontas_id: 37, codigo: '3.07.003', descricao: 'OUTRAS', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 8. OUTRAS RECEITAS
  { planocontas_id: 38, codigo: '1.02.001', descricao: 'VERBAS DE FORNECEDORES', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 39, codigo: '1.02.004', descricao: 'RECARGA', totalizador: 'N', operacao: 'C', opdesp: 'N' },

  // 9. DESPESAS FINANCEIRAS
  { planocontas_id: 40, codigo: '3.06.002', descricao: 'JUROS CHEQUE ESPECIAL', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 41, codigo: '3.06.003', descricao: 'TARIFAS BANCARIAS', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 42, codigo: '3.06.009', descricao: 'TAXA DE ANTECIPACAO', totalizador: 'N', operacao: 'D', opdesp: 'S' },
  { planocontas_id: 43, codigo: '3.06.012', descricao: 'JUROS COM PAGAMENTOS', totalizador: 'N', operacao: 'D', opdesp: 'S' },

  // 10. RECEITAS FINANCEIRAS
  { planocontas_id: 44, codigo: '1.03.002', descricao: 'DESCONTOS OBTIDOS EM PAGAMENTO', totalizador: 'N', operacao: 'C', opdesp: 'N' },
  { planocontas_id: 45, codigo: '1.03.005', descricao: 'APLICACÕES BANCARIAS', totalizador: 'N', operacao: 'C', opdesp: 'N' },

  // 11. PROVISÕES IRPJ/CSLL
  { planocontas_id: 46, codigo: '2.02.006', descricao: 'I.R.P.J / C.S.L.L', totalizador: 'N', operacao: 'D', opdesp: 'S' }
];

const pagarMock = [
  // CMV
  {
    filial_id: 1,
    pagar_id: 2001,
    dt_emissao: '2026-09-25',
    dtvenc: '2026-10-10',
    NF: 45092,
    fornece_id: 101,
    historico: 'Compra Medicamentos Genéricos',
    valor: 48500.00,
    valor_pago: 48500.00,
    dt_pgto: '2026-10-02',
    dt_competencia: '2026-09-25',
    planocontas_id: 14, // 2.01.001 - DUPLICATAS DE ENTRADA
    despesas: 0,
    acrescimos: 0,
    descontos: 500.00,
    valor_doc: 48500.00,
    taxa_boleto: 3.50,
    nome_razao_cedente: 'DISTRIBUIDORA SANTA CRUZ S/A',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2002,
    dt_emissao: '2026-10-01',
    dtvenc: '2026-10-18',
    NF: 45180,
    fornece_id: 102,
    historico: 'Aquisição Perfumaria e Higiene',
    valor: 22300.00,
    valor_pago: 0.00,
    dt_pgto: null,
    dt_competencia: '2026-10-01',
    planocontas_id: 14, // 2.01.001 - DUPLICATAS DE ENTRADA
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 22300.00,
    taxa_boleto: 3.50,
    nome_razao_cedente: 'PROFARMA DISTRIBUIDORA',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2003,
    dt_emissao: '2026-10-02',
    dtvenc: '2026-10-05',
    NF: 8901,
    fornece_id: 103,
    historico: 'Frete Distribuidora Matriz',
    valor: 1450.00,
    valor_pago: 1450.00,
    dt_pgto: '2026-10-04',
    dt_competencia: '2026-10-02',
    planocontas_id: 16, // 3.05.022 - FRETE
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 1450.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'TRANSPORTE RAPIDO LTDA',
    apagado: 'N'
  },

  // DEDUÇÕES E TRIBUTOS
  {
    filial_id: 1,
    pagar_id: 2004,
    dt_emissao: '2026-09-30',
    dtvenc: '2026-10-20',
    NF: 7701,
    fornece_id: 104,
    historico: 'Guia DAS Simples Nacional 09/2026',
    valor: 9840.50,
    valor_pago: 0.00,
    dt_pgto: null,
    dt_competencia: '2026-09-30',
    planocontas_id: 13, // 2.02.007 - DAS SIMPLES
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 9840.50,
    taxa_boleto: 0,
    nome_razao_cedente: 'RECEITA FEDERAL DO BRASIL',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2005,
    dt_emissao: '2026-10-03',
    dtvenc: '2026-10-03',
    NF: 1102,
    fornece_id: 105,
    historico: 'Devolução de Mercadorias / Clientes',
    valor: 680.00,
    valor_pago: 680.00,
    dt_pgto: '2026-10-03',
    dt_competencia: '2026-10-03',
    planocontas_id: 8, // 1.02.007 - DEVOLUCOES
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 680.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'CLIENTE BALCÃO DIVERSOS',
    apagado: 'N'
  },

  // DESPESAS COMERCIAIS
  {
    filial_id: 1,
    pagar_id: 2006,
    dt_emissao: '2026-09-30',
    dtvenc: '2026-10-05',
    NF: 3391,
    fornece_id: 106,
    historico: 'Taxas Adquirência Cielo / Rede',
    valor: 3420.00,
    valor_pago: 3420.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 17, // 2.03.004 - TAXA DE CARTAO DE CREDITO
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 3420.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'CIELO S.A.',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2007,
    dt_emissao: '2026-10-01',
    dtvenc: '2026-10-08',
    NF: 9912,
    fornece_id: 107,
    historico: 'Comissão Vendedores Balcão',
    valor: 4600.00,
    valor_pago: 4600.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 19, // 2.04.001 - COMISSAO VENDEDORES
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 4600.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'EQUIPE DE VENDAS',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2008,
    dt_emissao: '2026-09-28',
    dtvenc: '2026-10-06',
    NF: 5541,
    fornece_id: 108,
    historico: 'Bobinas Fiscais e Sacolas Personalizadas',
    valor: 1250.00,
    valor_pago: 1250.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-28',
    planocontas_id: 23, // 3.05.018 - ETIQUETAS, BOBINAS E SACOALS
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 1250.00,
    taxa_boleto: 3.00,
    nome_razao_cedente: 'GRAFICA E EMBALAGENS BRASIL',
    apagado: 'N'
  },

  // DESPESAS ADMINISTRATIVAS
  {
    filial_id: 1,
    pagar_id: 2009,
    dt_emissao: '2026-10-01',
    dtvenc: '2026-10-05',
    NF: 1201,
    fornece_id: 109,
    historico: 'Salários Funcionários Farmácia',
    valor: 26800.00,
    valor_pago: 26800.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 26, // 3.02.009 - SALARIOS
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 26800.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'FOLHA DE PAGAMENTO',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2010,
    dt_emissao: '2026-10-01',
    dtvenc: '2026-10-07',
    NF: 1202,
    fornece_id: 109,
    historico: 'Guia FGTS Funcionários',
    valor: 2140.00,
    valor_pago: 2140.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 28, // 3.02.011 - FGTS
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 2140.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'CAIXA ECONOMICA FEDERAL',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2011,
    dt_emissao: '2026-10-01',
    dtvenc: '2026-10-05',
    NF: 9012,
    fornece_id: 110,
    historico: 'Pró-Labore Sócio Diretor',
    valor: 8000.00,
    valor_pago: 8000.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 30, // 3.04.001 - RETIRADA SOCIO 1
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 8000.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'SOCIO DIRETOR',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2012,
    dt_emissao: '2026-09-10',
    dtvenc: '2026-10-05',
    NF: 6621,
    fornece_id: 111,
    historico: 'Honorários Contabilidade Mensal',
    valor: 3200.00,
    valor_pago: 3200.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 29, // 3.03.002 - CONTADOR
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 3200.00,
    taxa_boleto: 3.00,
    nome_razao_cedente: 'ESCRITORIO DE CONTABILIDADE',
    apagado: 'N'
  },
  {
    filial_id: 2,
    pagar_id: 2013,
    dt_emissao: '2026-10-01',
    dtvenc: '2026-10-12',
    NF: 3341,
    fornece_id: 112,
    historico: 'Licença Software Farmácia / ERP Cloud',
    valor: 1850.00,
    valor_pago: 1850.00,
    dt_pgto: '2026-10-02',
    dt_competencia: '2026-10-01',
    planocontas_id: 31, // 3.05.019 - SISTEMA
    despesas: 0,
    acrescimos: 0,
    descontos: 50.00,
    valor_doc: 1850.00,
    taxa_boleto: 2.80,
    nome_razao_cedente: 'LINX / FARMA SISTEMAS',
    apagado: 'N'
  },

  // DESPESAS GERAIS
  {
    filial_id: 1,
    pagar_id: 2014,
    dt_emissao: '2026-09-20',
    dtvenc: '2026-10-08',
    NF: 8871,
    fornece_id: 113,
    historico: 'Aluguel do Ponto Comercial Farmácia',
    valor: 7500.00,
    valor_pago: 7500.00,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-20',
    planocontas_id: 36, // 3.05.011 - ALUGUEL E IPTU
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 7500.00,
    taxa_boleto: 4.20,
    nome_razao_cedente: 'IMOBILIARIA CENTRAL',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2015,
    dt_emissao: '2026-09-28',
    dtvenc: '2026-10-15',
    NF: 9942,
    fornece_id: 114,
    historico: 'Energia Elétrica Loja 01',
    valor: 3410.80,
    valor_pago: 0.00,
    dt_pgto: null,
    dt_competencia: '2026-09-28',
    planocontas_id: 32, // 3.05.001 - ENERGIA ELETRICA
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 3410.80,
    taxa_boleto: 0,
    nome_razao_cedente: 'ENERGISA / LIGHT',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2016,
    dt_emissao: '2026-10-02',
    dtvenc: '2026-10-04',
    NF: 7812,
    fornece_id: 115,
    historico: 'Material de Limpeza e Álcool 70%',
    valor: 540.00,
    valor_pago: 540.00,
    dt_pgto: '2026-10-04',
    dt_competencia: '2026-10-02',
    planocontas_id: 35, // 3.05.006 - MATERIAL DE LIMPEZA
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 540.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'HIGIENE EXPRESS DISTRIBUIDORA',
    apagado: 'N'
  },

  // DESPESAS FINANCEIRAS
  {
    filial_id: 1,
    pagar_id: 2017,
    dt_emissao: '2026-09-30',
    dtvenc: '2026-10-05',
    NF: 9021,
    fornece_id: 116,
    historico: 'Tarifas de Manutenção de Conta e Cobrança',
    valor: 980.20,
    valor_pago: 980.20,
    dt_pgto: '2026-10-05',
    dt_competencia: '2026-09-30',
    planocontas_id: 41, // 3.06.003 - TARIFAS BANCARIAS
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 980.20,
    taxa_boleto: 0,
    nome_razao_cedente: 'BANCO DO BRASIL S.A.',
    apagado: 'N'
  },
  {
    filial_id: 1,
    pagar_id: 2018,
    dt_emissao: '2026-10-02',
    dtvenc: '2026-10-02',
    NF: 9022,
    fornece_id: 116,
    historico: 'Juros Cheque Especial / Encargos Giro',
    valor: 450.00,
    valor_pago: 450.00,
    dt_pgto: '2026-10-02',
    dt_competencia: '2026-10-02',
    planocontas_id: 40, // 3.06.002 - JUROS CHEQUE ESPECIAL
    despesas: 0,
    acrescimos: 0,
    descontos: 0,
    valor_doc: 450.00,
    taxa_boleto: 0,
    nome_razao_cedente: 'BANCO BRADESCO S.A.',
    apagado: 'N'
  }
];

const filiaisMock = [
  { filial_id: 1, nome: 'Escritorio' },
  { filial_id: 2, nome: 'Farmacia Filial 02 - Centro' },
  { filial_id: 3, nome: 'Farmacia Filial 03 - Shopping' }
];

module.exports = {
  planocontasMock,
  pagarMock,
  filiaisMock
};
