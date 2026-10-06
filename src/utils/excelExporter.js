import ExcelJS from 'exceljs';

export async function exportDreToExcel(dreData, regime) {
  if (!dreData || !dreData.itensDRE || dreData.itensDRE.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Drogaria SC - Sistema Financeiro';
  workbook.lastModifiedBy = 'Maikon Fonseca';
  workbook.created = new Date();
  workbook.modified = new Date();

  const regimeNome = regime === 'competencia' ? 'Competência' : 'Caixa';
  const dataHojeStr = new Date().toLocaleDateString('pt-BR');
  const horaHojeStr = new Date().toLocaleTimeString('pt-BR');
  const sheetName = `DRE_${regimeNome.toUpperCase()}`;

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // Configuração de largura das colunas
  worksheet.columns = [
    { key: 'codigo', width: 14 },
    { key: 'descricao', width: 55 },
    { key: 'titulos', width: 14 },
    { key: 'valor', width: 22 },
    { key: 'percentual', width: 14 }
  ];

  // 1. BANNER INSTITUCIONAL - DROGARIA SC
  worksheet.mergeCells('A1:E1');
  const titleRow1 = worksheet.getCell('A1');
  titleRow1.value = 'DROGARIA SC • SOMOS CUIDADO';
  titleRow1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow1.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF369C86' } // Verde Drogaria SC
  };
  worksheet.getRow(1).height = 32;

  // 2. SUBTÍTULO DRE
  worksheet.mergeCells('A2:E2');
  const titleRow2 = worksheet.getCell('A2');
  titleRow2.value = `DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE) • REGIME DE ${regimeNome.toUpperCase()}`;
  titleRow2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  titleRow2.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  worksheet.getRow(2).height = 24;

  // 3. METADADOS E AUDITORIA
  worksheet.mergeCells('A3:E3');
  const metaRow = worksheet.getCell('A3');
  metaRow.value = `Base da Análise Vertical: ${dreData.baseCalculo || 'Receita Bruta'} | Relatório emitido em: ${dataHojeStr} às ${horaHojeStr}`;
  metaRow.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  metaRow.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(3).height = 18;

  // Linha 4 em branco (respiro)
  worksheet.getRow(4).height = 10;

  // 4. CABEÇALHO DA TABELA
  const headerRow = worksheet.getRow(5);
  headerRow.values = [
    'Código',
    'Estrutura DRE / Plano de Contas',
    'Títulos',
    'Valor Total (R$)',
    '% AV'
  ];
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle' };

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Azul escuro / Slate
    };
    if (colNumber === 1 || colNumber === 3) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if (colNumber === 4 || colNumber === 5) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  let currentRowIdx = 6;

  // 5. CORPO DA DRE
  dreData.itensDRE.forEach((item) => {
    if (item.isSubtotal) {
      // LINHAS DE SUBTOTAL (=)
      const isResultadoLiquido = item.id === 'subtotal_resultado_liquido';
      const isLucro = Number(item.total || 0) >= 0;

      const row = worksheet.getRow(currentRowIdx);
      row.values = [
        '(=)',
        item.title,
        '-',
        Number(item.total || 0),
        Number((item.percentual || 0) / 100)
      ];
      row.height = isResultadoLiquido ? 26 : 22;

      let fgColor = 'FFE2E8F0'; // Slate suave
      let fontColor = 'FF0F172A';
      let borderStyle = 'thin';

      if (isResultadoLiquido) {
        fgColor = isLucro ? 'FFDCFCE7' : 'FFFFE4E6'; // Verde claro para lucro, Rosa claro para prejuízo
        fontColor = isLucro ? 'FF14532D' : 'FF9F1239';
        borderStyle = 'medium';
      }

      row.font = {
        name: 'Calibri',
        size: isResultadoLiquido ? 11.5 : 10.5,
        bold: true,
        color: { argb: fontColor }
      };

      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fgColor }
        };
        cell.border = {
          top: { style: borderStyle, color: { argb: 'FF94A3B8' } },
          bottom: { style: borderStyle, color: { argb: 'FF94A3B8' } }
        };

        if (colNumber === 1 || colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 4) {
          cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (colNumber === 5) {
          cell.numFmt = '0.0%';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });

      currentRowIdx++;
    } else {
      // SESSÃO PRINCIPAL (1 a 11)
      const isReceita = item.type === 'receita' || item.type === 'receita_financeira';
      const valorFinal = item.sign === -1 && item.total > 0 ? -Number(item.total || 0) : Number(item.total || 0);

      const row = worksheet.getRow(currentRowIdx);
      row.values = [
        item.id,
        item.title,
        Number(item.qtdLancamentos || 0),
        valorFinal,
        Number((item.percentual || 0) / 100)
      ];
      row.height = 22;

      row.font = {
        name: 'Calibri',
        size: 10.5,
        bold: true,
        color: { argb: isReceita ? 'FF065F46' : 'FF1E293B' }
      };

      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isReceita ? 'FFF0FDF4' : 'FFF8FAFC' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colNumber === 1 || colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 4) {
          cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (colNumber === 5) {
          cell.numFmt = '0.0%';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });

      currentRowIdx++;

      // CONTAS FILHAS ANALÍTICAS
      if (item.contas && item.contas.length > 0) {
        item.contas.forEach((conta) => {
          const childRow = worksheet.getRow(currentRowIdx);
          const childVal = item.sign === -1 && conta.total_valor > 0 ? -Number(conta.total_valor || 0) : Number(conta.total_valor || 0);

          childRow.values = [
            conta.codigo || '',
            `      ${conta.descricao || 'Conta'}`,
            Number(conta.qtd_lancamentos || 0),
            childVal,
            Number((conta.percentual || 0) / 100)
          ];
          childRow.height = 19;

          childRow.font = {
            name: 'Calibri',
            size: 9.5,
            color: { argb: 'FF334155' }
          };

          childRow.eachCell((cell, colNumber) => {
            cell.border = {
              bottom: { style: 'hair', color: { argb: 'FFF1F5F9' } }
            };

            if (colNumber === 1) {
              cell.font = { name: 'Consolas', size: 9, color: { argb: 'FF64748B' } };
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            } else if (colNumber === 3) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else if (colNumber === 4) {
              cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0.00';
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            } else if (colNumber === 5) {
              cell.numFmt = '0.0%';
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
          });

          currentRowIdx++;
        });
      }
    }
  });

  // Linha final de rodapé
  const footerRow = worksheet.getRow(currentRowIdx);
  worksheet.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const footerCell = worksheet.getCell(`A${currentRowIdx}`);
  footerCell.value = 'Relatório gerado automaticamente pelo Sistema Financeiro • Drogaria SC';
  footerCell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  footerRow.height = 20;

  // Gerar buffer e acionar download no navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `DRE_Drogaria_SC_${regimeNome.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function exportLancamentosToExcel({
  lancamentos = [],
  regime = 'competencia',
  filialNome = '1 - Escritório (Todas as Lojas)',
  filtroPlano = 'todos',
  dtInicio = '',
  dtFim = '',
  busca = ''
}) {
  if (!lancamentos || lancamentos.length === 0) {
    alert('Nenhum lançamento disponível para exportação com os filtros atuais.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Drogaria SC - Sistema Financeiro';
  workbook.lastModifiedBy = 'Maikon Fonseca';
  workbook.created = new Date();
  workbook.modified = new Date();

  const regimeNome = regime === 'caixa' ? 'Caixa' : 'Competência';
  const dataHojeStr = new Date().toLocaleDateString('pt-BR');
  const horaHojeStr = new Date().toLocaleTimeString('pt-BR');

  let filtroDesc = 'Todos os Lançamentos';
  if (filtroPlano === 'sem_plano') filtroDesc = 'Apenas Sem Plano de Contas Definido (Pendentes)';
  else if (filtroPlano === 'com_plano') filtroDesc = 'Apenas Com Plano de Contas Definido';

  let periodoStr = 'Todo o Histórico';
  if (dtInicio && dtFim) {
    periodoStr = `De ${dtInicio.split('-').reverse().join('/')} até ${dtFim.split('-').reverse().join('/')}`;
  } else if (dtInicio) {
    periodoStr = `A partir de ${dtInicio.split('-').reverse().join('/')}`;
  } else if (dtFim) {
    periodoStr = `Até ${dtFim.split('-').reverse().join('/')}`;
  }

  const worksheet = workbook.addWorksheet('Lançamentos Analíticos', {
    views: [{ showGridLines: true }]
  });

  // Configuração das colunas
  worksheet.columns = [
    { key: 'filial', width: 10 },
    { key: 'pagar_id', width: 12 },
    { key: 'nf', width: 14 },
    { key: 'fornecedor', width: 38 },
    { key: 'historico', width: 34 },
    { key: 'plano_codigo', width: 16 },
    { key: 'plano_descricao', width: 34 },
    { key: 'dt_competencia', width: 15 },
    { key: 'dtvenc', width: 15 },
    { key: 'dt_pgto', width: 15 },
    { key: 'valor', width: 20 },
    { key: 'valor_pago', width: 20 },
    { key: 'descontos', width: 16 },
    { key: 'acrescimos', width: 16 },
    { key: 'taxa_boleto', width: 16 },
    { key: 'status', width: 14 }
  ];

  // 1. BANNER INSTITUCIONAL
  worksheet.mergeCells('A1:P1');
  const titleRow1 = worksheet.getCell('A1');
  titleRow1.value = 'DROGARIA SC • SOMOS CUIDADO';
  titleRow1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow1.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF369C86' } // Verde Drogaria SC
  };
  worksheet.getRow(1).height = 32;

  // 2. SUBTÍTULO
  worksheet.mergeCells('A2:P2');
  const titleRow2 = worksheet.getCell('A2');
  titleRow2.value = `RELATÓRIO ANALÍTICO DE TÍTULOS A PAGAR • REGIME DE ${regimeNome.toUpperCase()}`;
  titleRow2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  titleRow2.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  worksheet.getRow(2).height = 24;

  // 3. METADADOS E AUDITORIA
  worksheet.mergeCells('A3:P3');
  const metaRow = worksheet.getCell('A3');
  metaRow.value = `Filial: ${filialNome} | Período: ${periodoStr} | Filtro: ${filtroDesc} | Total: ${lancamentos.length} títulos | Exportado em: ${dataHojeStr} às ${horaHojeStr}`;
  metaRow.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  metaRow.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(3).height = 18;

  // Linha 4 em branco
  worksheet.getRow(4).height = 10;

  // 4. CABEÇALHOS DAS COLUNAS
  const headerRow = worksheet.getRow(5);
  headerRow.values = [
    'Filial',
    'ID Título',
    'Nota Fiscal',
    'Fornecedor / Cedente',
    'Histórico da Despesa',
    'Cód. Plano',
    'Descrição Plano de Contas',
    'Competência',
    'Vencimento',
    'Pagamento',
    'Valor Título',
    'Valor Pago',
    'Descontos',
    'Acréscimos',
    'Taxa Boleto',
    'Situação'
  ];
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle' };

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate Escuro
    };
    if ([1, 2, 3, 8, 9, 10, 16].includes(colNumber)) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if ([11, 12, 13, 14, 15].includes(colNumber)) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const formatDateCell = (d) => {
    if (!d) return '-';
    const parts = String(d).split('T')[0].split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  };

  let currentRowIdx = 6;
  let totalValor = 0;
  let totalValorPago = 0;
  let totalDescontos = 0;
  let totalAcrescimos = 0;
  let totalTaxaBoleto = 0;

  lancamentos.forEach((r, idx) => {
    const row = worksheet.getRow(currentRowIdx);
    const isPago = r.dt_pgto && Number(r.valor_pago || 0) > 0;
    const isVencido = !isPago && r.dtvenc && String(r.dtvenc).split('T')[0] < new Date().toISOString().split('T')[0];
    const statusText = isPago ? 'Pago' : isVencido ? 'Vencido' : 'Aberto';

    const semPlano = !r.plano_codigo || String(r.plano_codigo).trim() === '' || r.plano_codigo === 'SEM_CODIGO';

    const vTotal = Number(r.valor || 0);
    const vPago = Number(r.valor_pago || 0);
    const vDesc = Number(r.descontos || 0);
    const vAcres = Number(r.acrescimos || 0);
    const vTaxa = Number(r.taxa_boleto || 0);

    totalValor += vTotal;
    totalValorPago += vPago;
    totalDescontos += vDesc;
    totalAcrescimos += vAcres;
    totalTaxaBoleto += vTaxa;

    row.values = [
      `#${r.filial_id}`,
      r.pagar_id,
      r.NF || '-',
      r.fornecedor_nome || r.nome_razao_cedente || 'Fornecedor não informado',
      r.historico || '-',
      semPlano ? 'SEM PLANO' : r.plano_codigo,
      semPlano ? 'PENDENTE DE CLASSIFICAÇÃO' : (r.plano_descricao || '-'),
      formatDateCell(r.dt_competencia || r.dt_emissao),
      formatDateCell(r.dtvenc),
      formatDateCell(r.dt_pgto),
      vTotal,
      vPago,
      vDesc,
      vAcres,
      vTaxa,
      statusText
    ];

    row.height = 20;

    // Zebra suave nas linhas
    const isEven = idx % 2 === 0;
    const defaultBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF334155' } };

      // Se for sem plano de contas, destacar as colunas de plano com fundo âmbar/amarelo suave
      if (semPlano && (colNumber === 6 || colNumber === 7)) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' } // Amarelo suave
        };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: defaultBg }
        };
      }

      if ([1, 2, 3, 8, 9, 10, 16].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([11, 12, 13, 14, 15].includes(colNumber)) {
        cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Estilo de status
      if (colNumber === 16) {
        if (statusText === 'Pago') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
        } else if (statusText === 'Vencido') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
        } else {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
        }
      }
    });

    currentRowIdx++;
  });

  // LINHA DE TOTALIZADORES
  const totalRow = worksheet.getRow(currentRowIdx);
  totalRow.values = [
    'TOTAL GERAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `${lancamentos.length} Títulos`,
    totalValor,
    totalValorPago,
    totalDescontos,
    totalAcrescimos,
    totalTaxaBoleto,
    ''
  ];
  totalRow.height = 24;

  worksheet.mergeCells(`A${currentRowIdx}:I${currentRowIdx}`);

  totalRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' } // Cinza ardósia claro de destaque
    };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }
    };

    if (colNumber === 1) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if (colNumber === 10) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if ([11, 12, 13, 14, 15].includes(colNumber)) {
      cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  currentRowIdx++;

  // Linha final institucional
  const footerRow = worksheet.getRow(currentRowIdx);
  worksheet.mergeCells(`A${currentRowIdx}:P${currentRowIdx}`);
  const footerCell = worksheet.getCell(`A${currentRowIdx}`);
  footerCell.value = 'Relatório gerado automaticamente pelo Sistema Financeiro • Drogaria SC';
  footerCell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  footerRow.height = 20;

  // Download no navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const sufixoFiltro = filtroPlano === 'sem_plano' ? '_SEM_PLANO' : filtroPlano === 'com_plano' ? '_COM_PLANO' : '';
  anchor.download = `Lancamentos_Analiticos_Drogaria_SC${sufixoFiltro}_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

