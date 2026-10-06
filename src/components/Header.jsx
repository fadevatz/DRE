import React from 'react';
import { Database, User, CheckCircle2, AlertCircle, HardDriveDownload } from 'lucide-react';
import logoDrogaria from '../assets/logo-drogaria-sc.png';

export default function Header({ dbStatus, onOpenDbModal, onRefresh, isRefreshing, regime, onToggleRegime }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs sticky top-0 z-30">
      {/* Esquerda: Logo + Título + Status */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-xs border border-slate-200/90 shrink-0 bg-[#42b39f] flex items-center justify-center">
          <img
            src={logoDrogaria}
            alt="Drogaria SC - Somos Cuidado"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
              Painel Financeiro &amp; DRE
            </h1>
          </div>
        </div>
      </div>

      {/* Direita: Ações e Usuário (Idêntico ao layout da foto) */}
      <div className="flex items-center gap-3">
        {/* Alternar Regime */}
        <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => onToggleRegime('competencia')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              regime === 'competencia'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Competência
          </button>
          <button
            onClick={() => onToggleRegime('caixa')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              regime === 'caixa'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Caixa
          </button>
        </div>

        {/* Botão Configurar Banco (estilo botão azul da foto 'Carregar Relatório') */}
        <button
          onClick={onOpenDbModal}
          className="flex items-center gap-2 bg-[#1877f2] hover:bg-[#166fe5] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98]"
        >
          <Database className="w-4 h-4" />
          <span>Configurar Banco MariaDB</span>
        </button>

        {/* Perfil do Usuário */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-[#1877f2] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <p className="text-sm font-semibold text-slate-800">Maikon Fonseca</p>
            <p className="text-xs text-slate-400">Financeiro DRE</p>
          </div>
        </div>
      </div>
    </header>
  );
}

