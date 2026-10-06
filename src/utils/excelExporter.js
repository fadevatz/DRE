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
