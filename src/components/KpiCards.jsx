import React from 'react';
import { FileText, CheckCircle2, Clock, Percent } from 'lucide-react';

function formatMoney(value) {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function KpiCards({ kpis, regime }) {
  const {
    totalGeral = { valor: 0, qtd: 0, ticketMedio: 0, totalDoc: 0 },
    pagos = { valor: 0, qtd: 0, percentual: 0, descontos: 0 },
    pendentes = { valor: 0, qtd: 0, vencidos: 0, aVencer: 0 },
    acrescimosETaxas = { valor: 0, acrescimos: 0, taxasBoleto: 0 }
  } = kpis || {};

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* CARD 1: RECEITA BRUTA / TOTAL DE DESPESAS (Borda Azul Superior) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between p-5 pt-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>

        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-600">
                {totalGeral.isReceitaBruta
                  ? 'Faturamento Bruto (Receita)'
                  : (regime === 'caixa' ? 'Total Desembolsado (Caixa)' : 'Total de Despesas (DRE)')}
              </span>
            </div>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {totalGeral.qtd} títulos
            </span>
          </div>

          {/* Valor Principal */}
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-2">
            {formatMoney(totalGeral.valor)}
          </div>
        </div>

        {/* Linhas de Detalhe Inferiores */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
          {totalGeral.isReceitaBruta ? (
            <>
              <div className="flex justify-between items-center text-slate-500">
                <span>Receita Líquida:</span>
                <span className="font-semibold text-slate-700">{formatMoney(totalGeral.receitaLiquida)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Resultado Bruto:</span>
                <span className="font-semibold text-emerald-600">{formatMoney(totalGeral.resultadoBruto)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>CMV (Custo Mercadorias):</span>
                <span className="font-semibold text-rose-600">- {formatMoney(totalGeral.cmvTotal)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center text-slate-500">
                <span>Valor em Documentos:</span>
                <span className="font-semibold text-slate-700">{formatMoney(totalGeral.totalDoc)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Descontos Obtidos:</span>
                <span className="font-semibold text-emerald-600">
                  {totalGeral.valor > 0 && pagos.descontos > 0 ? `- ${formatMoney(pagos.descontos)}` : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Ticket Médio:</span>
                <span className="font-semibold text-slate-700">{formatMoney(totalGeral.ticketMedio)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CARD 2: DESPESAS PAGAS (Borda Verde Superior) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between p-5 pt-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>

        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-600">
                Pagos / Realizados
              </span>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
              {pagos.percentual.toFixed(1)}% do total
            </span>
          </div>

          {/* Valor Principal */}
          <div className="text-2xl font-bold text-emerald-600 tracking-tight my-2">
            {formatMoney(pagos.valor)}
          </div>
        </div>

        {/* Linhas de Detalhe Inferiores */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Lançamentos Pagos:</span>
            <span className="font-semibold text-slate-700">{pagos.qtd} títulos</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Ticket Médio Pago:</span>
            <span className="font-semibold text-slate-700">
              {formatMoney(pagos.qtd > 0 ? pagos.valor / pagos.qtd : 0)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Descontos no Pgto:</span>
            <span className="font-semibold text-emerald-600">
              {pagos.descontos > 0 ? `- ${formatMoney(pagos.descontos)}` : 'R$ 0,00'}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 3: CONTAS EM ABERTO (Borda Azul Claro Superior) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between p-5 pt-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500"></div>

        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-semibold text-slate-600">
                {regime === 'caixa' ? 'Previsão Aberta' : 'Contas a Pagar (Aberto)'}
              </span>
            </div>
            <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-100">
              {pendentes.qtd} a pagar
            </span>
          </div>

          {/* Valor Principal */}
          <div className="text-2xl font-bold text-sky-600 tracking-tight my-2">
            {formatMoney(pendentes.valor)}
          </div>
        </div>

        {/* Linhas de Detalhe Inferiores */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Vencidos:</span>
            <span className={`font-semibold ${pendentes.vencidos > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {formatMoney(pendentes.vencidos)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>A Vencer:</span>
            <span className="font-semibold text-slate-700">{formatMoney(pendentes.aVencer)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Qtd em Aberto:</span>
            <span className="font-semibold text-slate-700">{pendentes.qtd} títulos</span>
          </div>
        </div>
      </div>

      {/* CARD 4: JUROS E TAXAS BANCÁRIAS (Borda Roxa Superior) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between p-5 pt-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>

        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                Encargos &amp; Boletos
              </span>
            </div>
            <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">
              {totalGeral.valor > 0
                ? ((acrescimosETaxas.valor / totalGeral.valor) * 100).toFixed(1)
                : '0.0'}% impacto
            </span>
          </div>

          {/* Valor Principal */}
          <div className="text-2xl font-bold text-purple-600 tracking-tight my-2">
            {formatMoney(acrescimosETaxas.valor)}
          </div>
        </div>

        {/* Linhas de Detalhe Inferiores */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Acréscimos / Juros:</span>
            <span className="font-semibold text-rose-600">
              {acrescimosETaxas.acrescimos > 0 ? `+ ${formatMoney(acrescimosETaxas.acrescimos)}` : 'R$ 0,00'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Taxas de Boletos:</span>
            <span className="font-semibold text-purple-700">
              {formatMoney(acrescimosETaxas.taxasBoleto)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Custo Financeiro:</span>
            <span className="font-semibold text-slate-700">
              {acrescimosETaxas.valor > 0 ? 'Incidente' : 'Sem custos extras'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

