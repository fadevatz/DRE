import React from 'react';
import { SlidersHorizontal, Store, Calendar, Search, X, Filter, RotateCcw, Check } from 'lucide-react';

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
  onClearBusca,
  onApplyFilters,
  onSelectPeriod,
  onResetFilters,
  loading
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs mb-6">
      {/* Cabeçalho do Card de Filtros com Atalhos Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            Filtros de Análise
          </h2>
          {(dtInicio || dtFim) && (
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
              Período ativo
            </span>
          )}
        </div>

        {/* Atalhos Rápidos de Período */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 text-[11px]">Atalhos:</span>
          <button
            type="button"
            onClick={() => onSelectPeriod && onSelectPeriod('2025-01-01', '2025-12-31')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              dtInicio === '2025-01-01' && dtFim === '2025-12-31'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ano 2025
          </button>
          <button
            type="button"
            onClick={() => onSelectPeriod && onSelectPeriod('2024-01-01', '2024-12-31')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              dtInicio === '2024-01-01' && dtFim === '2024-12-31'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ano 2024
          </button>
          <button
            type="button"
            onClick={() => onSelectPeriod && onSelectPeriod('', '')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              !dtInicio && !dtFim
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todo o Histórico
          </button>
        </div>
      </div>

      {/* Grid de Campos em Linha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        {/* 1. Filial (col-span-3) */}
        <div className="lg:col-span-3">
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

        {/* 2. Data Inicial (col-span-2) */}
        <div className="lg:col-span-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Data Inicial</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="date"
              value={dtInicio}
              onChange={(e) => onChangeDtInicio(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            {dtInicio && (
              <button
                type="button"
                onClick={() => onChangeDtInicio('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar Data Inicial"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Data Final (col-span-2) */}
        <div className="lg:col-span-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Data Final</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="date"
              value={dtFim}
              onChange={(e) => onChangeDtFim(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            {dtFim && (
              <button
                type="button"
                onClick={() => onChangeDtFim('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar Data Final"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Campo de Busca (col-span-3) */}
        <div className="lg:col-span-3">
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

        {/* 5. Botão Filtrar / Atualizar (col-span-2) */}
        <div className="lg:col-span-2 flex gap-2">
          <button
            type="button"
            onClick={onApplyFilters}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#1877f2] hover:bg-[#166fe5] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-60"
            title="Atualizar dados com os filtros selecionados"
          >
            <Filter className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Filtrando...' : 'Filtrar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
