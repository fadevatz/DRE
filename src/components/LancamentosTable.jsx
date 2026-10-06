import React from 'react';
import {
  Table,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2
} from 'lucide-react';

function formatMoney(value) {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function LancamentosTable({
  lancamentos,
  totalRecords,
  counts = {},
  filtroPlano = 'todos',
  onFiltroPlanoChange,
  page,
  limit,
  onPageChange,
  regime,
  onExportExcel,
  isExporting = false
}) {
  const records = lancamentos || [];
  const totalPages = Math.ceil((totalRecords || 0) / limit);

  const totalGeral = counts.total ?? totalRecords ?? 0;
  const semPlanoCount = counts.semPlano ?? 0;
  const comPlanoCount = counts.comPlano ?? Math.max(0, totalGeral - semPlanoCount);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden mt-6">
      {/* 1. Barra Superior com Informações e Ações */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">
              Detalhamento de Títulos a Pagar
            </h3>
            {semPlanoCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                {semPlanoCount} sem plano
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registros diretos da tabela <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">pagar</code> com cruzamento em <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">planocontas</code>
          </p>
        </div>

        {/* 2. Filtros Rápidos de Plano de Contas e Botão Exportar Excel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Filtro de Plano de Contas */}
          <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-lg border border-slate-300/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onFiltroPlanoChange && onFiltroPlanoChange('todos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filtroPlano === 'todos'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Todos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filtroPlano === 'todos' ? 'bg-slate-100 text-slate-700 font-bold' : 'bg-slate-300/60 text-slate-600'}`}>
                {totalGeral}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFiltroPlanoChange && onFiltroPlanoChange('sem_plano')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filtroPlano === 'sem_plano'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
              }`}
              title="Filtrar títulos sem conta contábil vinculada"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${filtroPlano === 'sem_plano' ? 'text-white' : 'text-amber-600'}`} />
              <span>Sem Plano de Contas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filtroPlano === 'sem_plano' ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {semPlanoCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFiltroPlanoChange && onFiltroPlanoChange('com_plano')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filtroPlano === 'com_plano'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Filtrar títulos com plano de contas preenchido"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${filtroPlano === 'com_plano' ? 'text-white' : 'text-emerald-600'}`} />
              <span>Com Plano</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filtroPlano === 'com_plano' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-300/60 text-slate-600'}`}>
                {comPlanoCount}
              </span>
            </button>
          </div>

          {/* Botão Exportar Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting || totalRecords === 0}
            className="inline-flex items-center gap-1.5 bg-[#369C86] hover:bg-[#2d8572] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
            title="Exportar todos os lançamentos filtrados para planilha Excel (.xlsx)"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exportando...</span>
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

      {/* 3. Tabela de Lançamentos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 w-16">Filial</th>
              <th className="py-3 px-4 w-20">ID / NF</th>
              <th className="py-3 px-4">Fornecedor / Cedente</th>
              <th className="py-3 px-4">Histórico</th>
              <th className="py-3 px-4">Plano de Contas</th>
              <th className="py-3 px-4 text-center">Competência</th>
              <th className="py-3 px-4 text-center">Vencimento</th>
              <th className="py-3 px-4 text-center">Pagamento</th>
              <th className="py-3 px-4 text-right">Valor Título</th>
              <th className="py-3 px-4 text-right">Valor Pago</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {records.length > 0 ? (
              records.map((r) => {
                const isPago = r.dt_pgto && Number(r.valor_pago || 0) > 0;
                const isVencido = !isPago && r.dtvenc && String(r.dtvenc).split('T')[0] < new Date().toISOString().split('T')[0];
                const semPlano = !r.plano_codigo || String(r.plano_codigo).trim() === '' || r.plano_codigo === 'SEM_CODIGO';

                return (
                  <tr
                    key={`${r.filial_id}-${r.pagar_id}`}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      semPlano ? 'bg-amber-50/25 border-l-3 border-l-amber-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-500">
                      #{r.filial_id}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      <span className="font-semibold text-slate-900">{r.pagar_id}</span>
                      {r.NF ? <span className="block text-[10px] text-slate-400">NF: {r.NF}</span> : null}
                    </td>
                    <td className="py-2.5 px-4 max-w-[240px]" title={r.fornecedor_nome || r.nome_razao_cedente}>
                      <span className="font-semibold text-slate-800 block truncate">
                        {r.fornecedor_nome || r.nome_razao_cedente || 'Fornecedor não informado'}
                      </span>
                      {r.fornece_id ? (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Cód: #{r.fornece_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-[220px] truncate" title={r.historico}>
                      {r.historico || '-'}
                    </td>
                    <td className="py-2.5 px-4">
                      {semPlano ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Não Definido
                          </span>
                          <span className="text-[10px] text-slate-400 italic hidden sm:inline">
                            Pendente de classificação
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-mono text-blue-700 font-semibold mr-1">{r.plano_codigo}</span>
                          <span className="text-slate-600 font-medium">{r.plano_descricao}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600">
                      {formatDate(r.dt_competencia || r.dt_emissao)}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600">
                      {formatDate(r.dtvenc)}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600">
                      {formatDate(r.dt_pgto)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                      {formatMoney(r.valor)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {formatMoney(r.valor_pago)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isPago ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Pago
                        </span>
                      ) : isVencido ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3 h-3" />
                          Vencido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          <Clock className="w-3 h-3" />
                          Aberto
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Nenhum título localizado com os filtros selecionados.
                    </p>
                    {filtroPlano !== 'todos' && (
                      <button
                        type="button"
                        onClick={() => onFiltroPlanoChange && onFiltroPlanoChange('todos')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        Limpar filtro de plano de contas e ver todos
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Rodapé e Paginação */}
      <div className="px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
        <div className="text-xs text-slate-500">
          Exibindo <span className="font-bold text-slate-700">{records.length}</span> de{' '}
          <span className="font-bold text-slate-700">{totalRecords}</span> títulos{' '}
          {filtroPlano === 'sem_plano' ? (
            <span className="text-amber-700 font-semibold">(sem plano de contas)</span>
          ) : filtroPlano === 'com_plano' ? (
            <span className="text-emerald-700 font-semibold">(com plano de contas)</span>
          ) : (
            <span>filtrados</span>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-1">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 font-medium text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 font-medium text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
