import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import KpiCards from './components/KpiCards';
import DreTable from './components/DreTable';
import ChartsView from './components/ChartsView';
import LancamentosTable from './components/LancamentosTable';
import DatabaseModal from './components/DatabaseModal';
import { Layers, LineChart, FileText } from 'lucide-react';

export default function App() {
  // Estado de conexão com banco
  const [dbStatus, setDbStatus] = useState({ connected: false, message: 'Verificando...' });
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Filtros
  const [regime, setRegime] = useState('competencia'); // 'competencia' ou 'caixa'
  const [filiais, setFiliais] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState('1');
  const [dtInicio, setDtInicio] = useState('');
  const [dtFim, setDtFim] = useState('');
  const [busca, setBusca] = useState('');

  // Dados carregados da API
  const [kpis, setKpis] = useState(null);
  const [dreData, setDreData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [totalLancamentos, setTotalLancamentos] = useState(0);
  const [page, setPage] = useState(1);

  // Estados de navegação interna
  const [mainTab, setMainTab] = useState('dre'); // 'dre' | 'graficos' | 'lancamentos'
  const [chartSubTab, setChartSubTab] = useState('tendencia'); // 'tendencia' | 'distribuicao'
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Carregar status do banco
  const checkDbStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      setDbStatus({ connected: false, message: 'Servidor offline' });
    }
  };

  // Carregar lista de filiais
  const loadFiliais = async () => {
    try {
      const res = await fetch('/api/filiais');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiliais(data);
      }
    } catch (err) {
      console.error('Erro ao carregar filiais:', err);
    }
  };

  // Carregar dados gerais
  const loadData = useCallback(async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const queryParams = new URLSearchParams({
        regime,
        filial_id: selectedFilial,
        dt_inicio: dtInicio,
        dt_fim: dtFim,
        busca,
        page: String(page),
        limit: '50'
      }).toString();

      // Buscar simultaneamente KPIs, DRE, Gráficos e Lançamentos
      const [kpiRes, dreRes, chartRes, lancRes] = await Promise.all([
        fetch(`/api/kpis?${queryParams}`),
        fetch(`/api/dre?${queryParams}`),
        fetch(`/api/graficos?${queryParams}`),
        fetch(`/api/lancamentos?${queryParams}`)
      ]);

      const [kpiJson, dreJson, chartJson, lancJson] = await Promise.all([
        kpiRes.json(),
        dreRes.json(),
        chartRes.json(),
        lancRes.json()
      ]);

      setKpis(kpiJson);
      setDreData(dreJson);
      setChartData(chartJson);
      setLancamentos(lancJson.records || []);
      setTotalLancamentos(lancJson.totalRecords || 0);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [regime, selectedFilial, dtInicio, dtFim, busca, page]);

  useEffect(() => {
    checkDbStatus();
    loadFiliais();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSelectedFilial('1');
    setDtInicio('');
    setDtFim('');
    setBusca('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] pb-16">
      {/* 1. Header Idêntico à Barra Superior da Imagem */}
      <Header
        dbStatus={dbStatus}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        regime={regime}
        onToggleRegime={(r) => {
          setRegime(r);
          setPage(1);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Banner Informativo Caso Esteja no Mock */}
        {!dbStatus.connected && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Visualização com Dados de Demonstração
                </p>
                <p className="text-xs text-slate-600">
                  O painel está pronto para ler diretamente a tabela <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-blue-700">pagar</code> e <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-blue-700">planocontas</code> do seu MariaDB local.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Conectar MariaDB Agora
            </button>
          </div>
        )}

        {/* 2. Filtros de Análise (Exatamente como o card da foto) */}
        <FilterBar
          filiais={filiais}
          selectedFilial={selectedFilial}
          onChangeFilial={(f) => {
            setSelectedFilial(f);
            setPage(1);
          }}
          regime={regime}
          onChangeRegime={(r) => {
            setRegime(r);
            setPage(1);
          }}
          dtInicio={dtInicio}
          onChangeDtInicio={(d) => {
            setDtInicio(d);
            setPage(1);
          }}
          dtFim={dtFim}
          onChangeDtFim={(d) => {
            setDtFim(d);
            setPage(1);
          }}
          busca={busca}
          onChangeBusca={(b) => {
            setBusca(b);
            setPage(1);
          }}
          onClearBusca={() => {
            setBusca('');
            setPage(1);
          }}
          onApplyFilters={loadData}
          onSelectPeriod={(ini, fim) => {
            setDtInicio(ini);
            setDtFim(fim);
            setPage(1);
          }}
          onResetFilters={handleResetFilters}
          loading={loading}
        />

        {/* 3. 4 Cards de Métricas / KPIs (Layout Idêntico à Foto) */}
        <KpiCards kpis={kpis} regime={regime} />

        {/* 4. Barra de Navegação de Módulos / Abas */}
        <div className="flex items-center gap-2 mb-4 bg-slate-200/70 p-1 rounded-xl w-fit">
          <button
            onClick={() => setMainTab('dre')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'dre'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Demonstrativo DRE</span>
          </button>
          <button
            onClick={() => setMainTab('graficos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'graficos'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Tendência &amp; Gráficos</span>
          </button>
          <button
            onClick={() => setMainTab('lancamentos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'lancamentos'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lançamentos Analíticos ({totalLancamentos})</span>
          </button>
        </div>

        {/* 5. Conteúdo da Aba Selecionada */}
        {mainTab === 'dre' && (
          <DreTable dreData={dreData} regime={regime} />
        )}

        {mainTab === 'graficos' && (
          <ChartsView
            chartData={chartData}
            activeTab={chartSubTab}
            onTabChange={setChartSubTab}
            regime={regime}
          />
        )}

        {mainTab === 'lancamentos' && (
          <LancamentosTable
            lancamentos={lancamentos}
            totalRecords={totalLancamentos}
            page={page}
            limit={50}
            onPageChange={setPage}
            regime={regime}
          />
        )}
      </main>

      {/* Modal de Configuração do MariaDB */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConnected={() => {
          checkDbStatus();
          loadFiliais();
          loadData();
        }}
      />
    </div>
  );
}

