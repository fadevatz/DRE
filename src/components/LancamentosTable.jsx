import React from 'react';
import { Table, CheckCircle2, AlertCircle, Clock, Search } from 'lucide-react';

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
  page,
  limit,
  onPageChange,
  regime
}) {
  const records = lancamentos || [];
  const totalPages = Math.ceil((totalRecords || 0) / limit);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Detalhamento de Títulos a Pagar
          </h3>
          <p className="text-xs text-slate-500">
            Registros diretos da tabela <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">pagar</code> com cruzamento em <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">planocontas</code>
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
          Total de {totalRecords} títulos encontrados
        </div>
      </div>

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
                const isVencido = !isPago && r.dtvenc && r.dtvenc < '2026-10-05';

                return (
                  <tr key={`${r.filial_id}-${r.pagar_id}`} className="hover:bg-blue-50/30 transition-colors">
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
                      <span className="font-mono text-blue-700 font-semibold mr-1">{r.plano_codigo}</span>
                      <span className="text-slate-600">{r.plano_descricao}</span>
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
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  Nenhum título localizado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 font-medium text-slate-600 hover:bg-white disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 font-medium text-slate-600 hover:bg-white disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

