import React, { useState, useRef, useEffect } from 'react';
import { Info, RefreshCw, X, LogOut, User } from 'lucide-react';
import logoDrogaria from '../assets/logo-drogaria-sc.png';

export default function Header({ dbStatus, onRefresh, isRefreshing, regime, onToggleRegime, user, onLogout }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);

  // Fecha o popover se clicar fora dele
  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs sticky top-0 z-30">
      {/* Esquerda: Logo + Título */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-xs border border-slate-200/90 shrink-0 bg-[#42b39f] flex items-center justify-center">
          <img
            src={logoDrogaria}
            alt="Drogaria SC - Somos Cuidado"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
            Painel Financeiro &amp; DRE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão Contábil &amp; Movimentações Operacionais
          </p>
        </div>
      </div>

      {/* Direita: Alternância de Regime com Ícone Informativo e Atualização */}
      <div className="flex items-center gap-3">
        {/* Controles de Regime + Ícone de Informação (i) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/90">
          <div className="flex text-xs font-semibold">
            <button
              type="button"
              onClick={() => onToggleRegime('competencia')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                regime === 'competencia'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Competência
            </button>
            <button
              type="button"
              onClick={() => onToggleRegime('caixa')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                regime === 'caixa'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Caixa
            </button>
          </div>

          {/* Ícone (i) Informativo com Popover Explicativo */}
          <div className="relative" ref={infoRef}>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
              title="Clique para entender a diferença entre DRE Competência e Caixa"
              aria-label="Informações sobre Regimes DRE"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Popover Explicativo */}
            {showInfo && (
              <div className="absolute right-0 top-10 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Info className="w-4 h-4" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Diferença: Competência vs. Caixa
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInfo(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                    <p className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Competência
                    </p>
                    <p className="text-slate-600">
                      Mostra receitas e despesas no momento em que ocorrem, considerando a data de emissão. Ideal para avaliar o lucro real.
                    </p>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3">
                    <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Caixa
                    </p>
                    <p className="text-slate-600">
                      Mostra as movimentações financeiras efetivamente pagas e recebidas, considerando a data de pagamento. Ideal para avaliar a liquidez.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Atualizar Dados */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50"
          title="Recarregar dados do MariaDB"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>

        {/* Botão Sair / Logout */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 active:bg-rose-200/80 text-rose-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-rose-200 shadow-2xs cursor-pointer"
            title="Sair da sessão e retornar à tela de login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </div>
    </header>
  );
}
