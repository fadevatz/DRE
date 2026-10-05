import React from 'react';
import { SlidersHorizontal, Store, Calendar, Search, X } from 'lucide-react';

export default function FilterBar({
  filiais,
  selectedFilial,
  onChangeFilial,
  regime,
  onChangeRegime,
  dtInicio,
  onChangeDtInicio,
  dtFim,
  onChangeDtFim,
  busca,
  onChangeBusca,
  onClearBusca
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs mb-6">
      {/* Cabeçalho do Card de Filtros */}
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-sky-500" />
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          Filtros de Análise
        </h2>
      </div>

      {/* Grid de Campos em Linha (Exatamente como a imagem) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Filial & Regime */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>Filial da Empresa</span>
          </label>
          <div className="relative">
            <select
              value={selectedFilial}
              onChange={(e) => onChangeFilial(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none pr-8"
            >
              <option value="1">1 - Escritório (Todas as Lojas)</option>
              {filiais
                .filter(f => (typeof f === 'object' ? f.filial_id : f) != 1)
                .map((f) => {
                  const id = typeof f === 'object' ? f.filial_id : f;
                  const nome = typeof f === 'object' ? f.nome : `Filial #${id}`;
                  return (
                    <option key={id} value={id}>
                      {id} - {nome}
                    </option>
                  );
                })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Data Inicial */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Data Inicial ({regime === 'caixa' ? 'Pagamento' : 'Competência'})</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={dtInicio}
              onChange={(e) => onChangeDtInicio(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 3. Data Final */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Data Final ({regime === 'caixa' ? 'Pagamento' : 'Competência'})</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={dtFim}
              onChange={(e) => onChangeDtFim(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 4. Campo de Busca */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Buscar Lançamento</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={busca}
              onChange={(e) => onChangeBusca(e.target.value)}
              placeholder="Fornecedor, NF, Histórico..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-800 font-medium placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={onClearBusca}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

