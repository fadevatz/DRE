import React, { useState } from 'react';
import { Calendar, Download, Eye, EyeOff, Layers, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 0.005) return '0,00';

  const formatted = Math.abs(num).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (num < 0) {
    return `(${formatted})`;
  }
  return formatted;
}

export default function DreMensalTable({
  dreMensalData,
  ano,
  onChangeAno,
  regime,
  loading,
  onExportExcel
}) {
  const [expandAll, setExpandAll] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroupCollapse = (grupoId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [grupoId]: !prev[grupoId]
    }));
  };

  const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const linhas = dreMensalData?.linhas || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
      {/* Barra de Controles da Visão Mensal */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lado Esquerdo: Título e Seletor de Ano */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>DRE Mês a Mês • Visão Anual ({ano})</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Regime {regime === 'caixa' ? 'Caixa' : 'Competência'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrativo consolidado mês a mês nos 12 meses do exercício
            </p>
          </div>

          {/* Seletor de Exercício / Ano */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 text-xs font-semibold ml-0 sm:ml-4 shadow-2xs">
            <span className="text-slate-400 px-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ano:</span>
            </span>
            {[2026, 2025, 2024].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => onChangeAno && onChangeAno(y)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  Number(ano) === y
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito: Ações (Expandir/Recolher e Exportar Excel) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setExpandAll(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Alternar visibilidade das contas analíticas"
          >
            {expandAll ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
            <span>{expandAll ? 'Modo Sintético' : 'Modo Analítico'}</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Exportar planilha Excel idêntica ao modelo da foto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Excel Mês a Mês</span>
          </button>
        </div>
      </div>

      {/* Tabela Mês a Mês Estilizada Idêntica à Planilha do Usuário */}
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-20">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Calculando demonstrativo mês a mês...</span>
            </div>
          </div>
        )}

        <table className="w-full text-xs border-collapse text-left min-w-[1300px]">
          {/* Cabeçalho das Colunas */}
          <thead>
            <tr className="bg-[#1e293b] text-white font-bold uppercase tracking-wider text-[11px] border-b border-slate-800 sticky top-0 z-10">
              <th className="py-3 px-4 min-w-[320px] border-r border-slate-700 sticky left-0 bg-[#1e293b] z-20">
                CONTA / DESCRIÇÃO
              </th>
              {mesesAbrev.map((m, idx) => (
                <th key={idx} className="py-3 px-3 text-right min-w-[95px] border-r border-slate-700 font-mono">
                  {m}/{ano}
                </th>
              ))}
              <th className="py-3 px-4 text-right min-w-[125px] bg-[#0f172a] text-emerald-400 font-mono font-black">
                TOTAL ANO
              </th>
            </tr>
          </thead>

          {/* Corpo com Linhas do DRE */}
          <tbody className="divide-y divide-slate-100 font-mono">
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400 font-sans text-sm">
                  Nenhum dado apurado para o ano de {ano}.
                </td>
              </tr>
            ) : (
              linhas.map((linha, index) => {
                const isAnalitico = linha.tipo === 'analitico';
                const isGrupo = linha.tipo === 'grupo';
                const isSubtotal = linha.isSubtotal;
                const isResultadoLiquido = linha.id === 'resultado_liquido';

                // Ocultar analítico se modo sintético ativado
                if (isAnalitico && !expandAll) {
                  return null;
                }

                // Estilos de linha baseados na imagem
                let rowBgClass = 'hover:bg-slate-50/70 transition-colors';
                let textClass = 'text-slate-700';
                let fontClass = 'font-normal';

                if (isResultadoLiquido) {
                  rowBgClass = 'bg-slate-200/90 font-black border-y-2 border-slate-900';
                  textClass = linha.totalAno < 0 ? 'text-rose-700' : 'text-slate-900';
                  fontClass = 'font-extrabold text-[12.5px]';
                } else if (isSubtotal) {
                  rowBgClass = 'bg-slate-100/90 font-bold border-y border-slate-300';
                  textClass = linha.totalAno < 0 ? 'text-rose-700' : 'text-slate-900';
                  fontClass = 'font-bold text-[12px]';
                } else if (isGrupo) {
                  rowBgClass = 'bg-slate-50/90 font-semibold border-t border-slate-200';
                  textClass = 'text-slate-800';
                  fontClass = 'font-bold';
                } else if (isAnalitico) {
                  textClass = 'text-slate-600 italic';
                  fontClass = 'font-normal text-[11px]';
                }

                return (
                  <tr key={linha.id || index} className={`${rowBgClass} leading-tight`}>
                    {/* Coluna Descrição (Fixa na rolagem lateral) */}
                    <td className={`py-2 px-4 border-r border-slate-200/80 sticky left-0 font-sans z-10 ${
                      isResultadoLiquido
                        ? 'bg-slate-200 font-black'
                        : isSubtotal
                        ? 'bg-slate-100 font-bold'
                        : isGrupo
                        ? 'bg-slate-50 font-bold'
                        : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isAnalitico && (
                          <span className="w-4 inline-block shrink-0 text-slate-300 text-center">•</span>
                        )}
                        <span className={`truncate ${fontClass} ${textClass}`} title={linha.titulo}>
                          {linha.titulo}
                        </span>
                      </div>
                    </td>

                    {/* 12 Colunas de Meses */}
                    {(linha.meses || []).map((valMes, mIdx) => {
                      const isNegative = valMes < 0;
                      return (
                        <td
                          key={mIdx}
                          className={`py-2 px-3 text-right border-r border-slate-200/60 ${fontClass} ${
                            isNegative ? 'text-rose-600 font-semibold' : textClass
                          }`}
                        >
                          {formatCurrency(valMes)}
                        </td>
                      );
                    })}

                    {/* Coluna Total Ano */}
                    <td className={`py-2 px-4 text-right font-black ${
                      isResultadoLiquido
                        ? (linha.totalAno < 0 ? 'text-rose-700 bg-slate-300/60' : 'text-slate-950 bg-slate-300/60')
                        : isSubtotal
                        ? (linha.totalAno < 0 ? 'text-rose-700 bg-slate-200/50' : 'text-slate-900 bg-slate-200/50')
                        : isGrupo
                        ? 'text-slate-900 bg-slate-100/50'
                        : 'text-slate-800 bg-slate-50/50'
                    }`}>
                      {formatCurrency(linha.totalAno)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé Informativo */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Estrutura contábil oficial Drogaria SC • Valores negativos indicados entre parênteses (ex: (1.234,56)).</span>
        </div>
        <div className="font-semibold text-slate-600">
          Exercício: {ano} • {regime === 'caixa' ? 'Data de Pagamento (dt_pgto)' : 'Competência Oficial'}
        </div>
      </div>
    </div>
  );
}
