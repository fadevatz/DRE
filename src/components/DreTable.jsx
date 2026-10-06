import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileSpreadsheet, Layers, ArrowDownRight, ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { exportDreToExcel } from '../utils/excelExporter';

function formatMoney(value) {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function DreTable({ dreData, regime }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const current = prev[sectionId] !== false;
      return {
        ...prev,
        [sectionId]: !current
      };
    });
  };

  const expandAll = () => {
    if (!dreData || !dreData.itensDRE) return;
    const all = {};
    dreData.itensDRE.filter(i => !i.isSubtotal).forEach(i => { all[i.id] = true; });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    if (!dreData || !dreData.itensDRE) return;
    const all = {};
    dreData.itensDRE.filter(i => !i.isSubtotal).forEach(i => { all[i.id] = false; });
    setExpandedSections(all);
  };

  const handleExport = async () => {
    if (!dreData || !dreData.itensDRE || dreData.itensDRE.length === 0 || isExporting) return;
    try {
      setIsExporting(true);
      await exportDreToExcel(dreData, regime);
    } catch (err) {
      console.error('Erro ao exportar DRE para Excel:', err);
      alert('Erro ao gerar planilha Excel: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const itens = dreData?.itensDRE || [];

  if (itens.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">Nenhum dado encontrado para o período</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Ajuste as datas ou filtros para visualizar os dados consolidados do DRE.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Barra de Cabeçalho da Tabela */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Demonstração do Resultado do Exercício (DRE)
            </h3>
            <p className="text-xs text-slate-500">
              Estrutura Oficial de 11 Sessões Contábeis em Regime de{' '}
              <strong className="text-blue-600 font-semibold uppercase">{regime}</strong> • Base Análise Vertical: <strong>{dreData.baseCalculo}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Expandir todas as sessões analíticas"
          >
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Expandir Tudo</span>
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Recolher todas as sessões analíticas"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span>Recolher Tudo</span>
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 font-semibold text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            title="Exportar planilha DRE com o mesmo layout e cores do painel"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabela Estruturada com 11 Sessões e Subtotais */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-6 w-36">Código</th>
              <th className="py-3 px-6">Estrutura DRE / Plano de Contas</th>
              <th className="py-3 px-6 text-center w-28">Títulos</th>
              <th className="py-3 px-6 text-right w-44">Valor Total</th>
              <th className="py-3 px-6 text-right w-36">% AV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {itens.map((item) => {
              // 1. Linhas de SUB-TOTAL / TOTALIZADORES
              if (item.isSubtotal) {
                const isLucro = item.total >= 0;
                return (
                  <tr
                    key={item.id}
                    className={`font-bold transition-colors border-y-2 select-none ${
                      item.id === 'subtotal_resultado_liquido'
                        ? isLucro
                          ? 'bg-emerald-50/90 text-emerald-950 border-emerald-400'
                          : 'bg-rose-50/90 text-rose-950 border-rose-400'
                        : 'bg-slate-100/90 text-slate-900 border-slate-300'
                    }`}
                  >
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-500">
                      (=)
                    </td>
                    <td className="py-3.5 px-6 font-extrabold uppercase tracking-wide text-xs sm:text-sm">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-6 text-center text-xs text-slate-400">
                      -
                    </td>
                    <td className={`py-3.5 px-6 text-right font-extrabold text-sm sm:text-base ${
                      item.id === 'subtotal_resultado_liquido'
                        ? isLucro ? 'text-emerald-700' : 'text-rose-700'
                        : isLucro ? 'text-slate-900' : 'text-rose-600'
                    }`}>
                      {formatMoney(item.total)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className={`text-xs font-bold ${isLucro ? 'text-slate-800' : 'text-rose-600'}`}>
                        {(item.percentual || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              }

              // 2. Linhas de SESSÃO ANALÍTICA (1 a 11)
              const isExpanded = expandedSections[item.id] !== false; // padrão aberto
              const isReceita = item.type === 'receita' || item.type === 'receita_financeira';
              const hasContas = item.contas && item.contas.length > 0;

              return (
                <React.Fragment key={item.id}>
                  <tr
                    onClick={() => hasContas && toggleSection(item.id)}
                    className={`font-semibold transition-colors select-none ${
                      hasContas ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
                    } ${
                      isReceita ? 'bg-sky-50/30' : 'bg-white'
                    }`}
                  >
                    <td className="py-3 px-6 font-mono text-xs text-blue-700 font-bold">
                      <div className="flex items-center gap-1.5">
                        {hasContas && (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )
                        )}
                        <span>{item.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-slate-800 font-bold uppercase tracking-tight text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.sign === -1 ? (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-normal lowercase border border-rose-100">
                            (dedução/custo)
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-normal lowercase border border-emerald-100">
                            (entrada)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center text-xs font-semibold text-slate-500">
                      {item.qtdLancamentos || 0}
                    </td>
                    <td className={`py-3 px-6 text-right font-bold text-sm ${
                      item.total > 0
                        ? isReceita ? 'text-emerald-700' : 'text-slate-900'
                        : 'text-slate-400'
                    }`}>
                      {item.sign === -1 && item.total > 0 ? `- ${formatMoney(item.total)}` : formatMoney(item.total)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-xs text-slate-600">
                          {(item.percentual || 0).toFixed(1)}%
                        </span>
                        <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isReceita ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, Math.abs(item.percentual || 0))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Linhas Filhas Analíticas de cada Conta */}
                  {isExpanded && hasContas &&
                    item.contas.map((conta, idx) => (
                      <tr
                        key={`${item.id}_${conta.codigo || 'semcod'}_${conta.planocontas_id || idx}_${idx}`}
                        className="hover:bg-blue-50/40 transition-colors text-xs bg-slate-50/40"
                      >
                        <td className="py-2.5 px-6 pl-12 text-slate-500 font-mono">
                          {conta.codigo}
                        </td>
                        <td className="py-2.5 px-6 text-slate-700 font-medium">
                          {conta.descricao}
                        </td>
                        <td className="py-2.5 px-6 text-center text-slate-400">
                          {conta.qtd_lancamentos}
                        </td>
                        <td className="py-2.5 px-6 text-right font-medium text-slate-800">
                          {item.sign === -1 ? `- ${formatMoney(conta.total_valor)}` : formatMoney(conta.total_valor)}
                        </td>
                        <td className="py-2.5 px-6 text-right text-slate-500">
                          <span className="text-xs">
                            {(conta.percentual || 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
