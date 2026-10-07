import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Store, Calendar, Filter, ChevronDown, Check, CheckSquare, Square, Search, X } from 'lucide-react';

export default function FilterBar({
  filiais,
  selectedFilial,
  onChangeFilial,
  regime,
  dtInicio,
  onChangeDtInicio,
  dtFim,
  onChangeDtFim,
  planosContas = [],
  planosExcluidos = [],
  onTogglePlano,
  onMarcarTodos,
  onDesmarcarTodos,
  onApplyFilters,
  onSelectPeriod,
  onResetFilters,
  loading
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchPlano, setSearchPlano] = useState('');
  const dropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalPlanos = planosContas.length;
  const qtdExcluidos = planosExcluidos.length;
  const qtdAtivos = Math.max(0, totalPlanos - qtdExcluidos);

  // Filtrar planos pelo texto de busca interna do dropdown
  const filteredPlanos = planosContas.filter(p => {
    if (!searchPlano.trim()) return true;
    const q = searchPlano.toLowerCase();
    const cod = (p.codigo || '').toLowerCase();
    const desc = (p.descricao || '').toLowerCase();
    return cod.includes(q) || desc.includes(q);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs mb-6">
      {/* Cabeçalho do Card de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            Filtros de Análise
          </h2>
          {(dtInicio || dtFim) && (
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
              Período ativo
            </span>
          )}
          {qtdExcluidos > 0 && (
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
              {qtdExcluidos} plano(s) removido(s) do relatório
            </span>
          )}
        </div>

        {/* Atalhos Rápidos de Período */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 text-[11px]">Atalhos:</span>
          <button
            type="button"
            onClick={() => onSelectPeriod && onSelectPeriod('2026-01-01', '2026-12-31')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              dtInicio === '2026-01-01' && dtFim === '2026-12-31'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ano 2026
          </button>
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

        {/* 4. Lista Suspensa de Planos de Contas com Marcar/Desmarcar (col-span-3) */}
        <div className="lg:col-span-3 relative" ref={dropdownRef}>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Planos de Contas</span>
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              {qtdExcluidos > 0 ? `${qtdAtivos}/${totalPlanos} ativos` : `Todos (${totalPlanos})`}
            </span>
          </label>

          {/* Botão Gatilho do Dropdown */}
          <button
            type="button"
            onClick={() => setDropdownOpen(prev => !prev)}
            className={`w-full flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
              qtdExcluidos > 0
                ? 'border-amber-400 bg-amber-50/30 text-amber-900 ring-1 ring-amber-300'
                : 'border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
            title="Clique para selecionar ou remover planos de contas do relatório"
          >
            <div className="flex items-center gap-2 truncate">
              {qtdExcluidos > 0 ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate font-semibold text-xs text-amber-800">
                    {qtdExcluidos} plano(s) desmarcado(s)
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate text-xs text-slate-700">
                    Todos os planos marcados
                  </span>
                </>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu Suspenso / Popover de Seleção com Checkboxes */}
          {dropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[320px] max-w-[420px] animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Barra de Busca Interna do Dropdown */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPlano}
                  onChange={(e) => setSearchPlano(e.target.value)}
                  placeholder="Buscar conta por código ou nome..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-colors"
                />
                {searchPlano && (
                  <button
                    type="button"
                    onClick={() => setSearchPlano('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Ações Rápidas: Marcar / Desmarcar Todos */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onMarcarTodos && onMarcarTodos()}
                    className="px-2 py-0.5 rounded font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => onDesmarcarTodos && onDesmarcarTodos()}
                    className="px-2 py-0.5 rounded font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
                <span className="text-slate-400 font-medium">
                  {qtdAtivos} de {totalPlanos}
                </span>
              </div>

              {/* Lista com Rolagem dos Planos de Contas */}
              <div className="max-h-64 overflow-y-auto pr-1 space-y-0.5 divide-y divide-slate-50">
                {filteredPlanos.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Nenhum plano encontrado para "{searchPlano}"
                  </div>
                ) : (
                  filteredPlanos.map((p) => {
                    const isChecked = !planosExcluidos.includes(Number(p.planocontas_id));
                    return (
                      <label
                        key={p.planocontas_id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'hover:bg-slate-50 text-slate-800'
                            : 'bg-slate-50/60 hover:bg-slate-100 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onTogglePlano && onTogglePlano(p.planocontas_id)}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
                        />
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                          isChecked
                            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                            : 'bg-slate-200 text-slate-500 line-through'
                        }`}>
                          {p.codigo || 'S/C'}
                        </span>
                        <span className={`truncate text-xs ${!isChecked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {p.descricao}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Rodapé do Menu com Botão de Concluir */}
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  {qtdExcluidos > 0 ? `${qtdExcluidos} desmarcado(s)` : 'Todos incluídos'}
                </span>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(false)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs cursor-pointer transition-colors"
                >
                  OK / Fechar
                </button>
              </div>
            </div>
          )}
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
