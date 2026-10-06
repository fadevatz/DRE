import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import KpiCards from './components/KpiCards';
import DreTable from './components/DreTable';
import ChartsView from './components/ChartsView';
import LancamentosTable from './components/LancamentosTable';
import { exportLancamentosToExcel } from './utils/excelExporter';
import { Layers, LineChart, FileText } from 'lucide-react';

export default function App() {
  // Estado de conexão com banco
  const [dbStatus, setDbStatus] = useState({ connected: false, message: 'Verificando...' });

  // Filtros Globais
  const [regime, setRegime] = useState('competencia'); // 'competencia' ou 'caixa'
  const [criterioCaixa, setCriterioCaixa] = useState('dt_pgto'); // 'dt_pgto' (Data Pagamento) ou 'dtvenc' (Vencimento Pago)
  const [filiais, setFiliais] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState('1');
  const [dtInicio, setDtInicio] = useState('');
  const [dtFim, setDtFim] = useState('');
  const [busca, setBusca] = useState('');

  // Filtro de Plano de Contas e exportação para Lançamentos Analíticos
  const [filtroPlano, setFiltroPlano] = useState('todos'); // 'todos' | 'sem_plano' | 'com_plano'
  const [lancamentosCounts, setLancamentosCounts] = useState({ total: 0, semPlano: 0, comPlano: 0 });
  const [isExportingLancamentos, setIsExportingLancamentos] = useState(false);

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
      const baseQueryParams = new URLSearchParams({
        regime,
        filial_id: selectedFilial,
        dt_inicio: dtInicio,
        dt_fim: dtFim,
        busca,
        criterio_caixa: criterioCaixa
      }).toString();

      const lancQueryParams = new URLSearchParams({
        regime,
        filial_id: selectedFilial,
        dt_inicio: dtInicio,
        dt_fim: dtFim,
        busca,
        filtro_plano: filtroPlano,
        criterio_caixa: criterioCaixa,
        page: String(page),
        limit: '50'
      }).toString();

      // Buscar simultaneamente KPIs, DRE, Gráficos e Lançamentos
      const [kpiRes, dreRes, chartRes, lancRes] = await Promise.all([
        fetch(`/api/kpis?${baseQueryParams}`),
        fetch(`/api/dre?${baseQueryParams}`),
        fetch(`/api/graficos?${baseQueryParams}`),
        fetch(`/api/lancamentos?${lancQueryParams}`)
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
      if (lancJson.counts) {
        setLancamentosCounts(lancJson.counts);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [regime, criterioCaixa, selectedFilial, dtInicio, dtFim, busca, filtroPlano, page]);

  useEffect(() => {
    checkDbStatus();
    loadFiliais();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exportar lançamentos analíticos filtrados para planilha Excel
  const handleExportLancamentosExcel = async () => {
    try {
      setIsExportingLancamentos(true);
      const queryParams = new URLSearchParams({
        regime,
        filial_id: selectedFilial,
        dt_inicio: dtInicio,
        dt_fim: dtFim,
        busca,
        filtro_plano: filtroPlano,
        criterio_caixa: criterioCaixa,
        export: 'true',
        limit: '50000'
      }).toString();

      const res = await fetch(`/api/lancamentos?${queryParams}`);
      const data = await res.json();
      const recordsToExport = data.records || lancamentos;

      const fObj = filiais.find(f => (typeof f === 'object' ? String(f.filial_id) : String(f)) === String(selectedFilial));
      const filialNome = fObj
        ? `${selectedFilial} - ${fObj.nome || (selectedFilial === '1' ? 'Escritório (Todas as Lojas)' : `Filial #${selectedFilial}`)}`
        : (selectedFilial === '1' ? '1 - Escritório (Todas as Lojas)' : `Filial #${selectedFilial}`);

      await exportLancamentosToExcel({
        lancamentos: recordsToExport,
        regime,
        filialNome,
        filtroPlano,
        dtInicio,
        dtFim,
        busca
      });
    } catch (err) {
      console.error('Erro ao exportar lançamentos para Excel:', err);
      alert('Falha ao exportar lançamentos para Excel: ' + err.message);
    } finally {
      setIsExportingLancamentos(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedFilial('1');
    setDtInicio('');
    setDtFim('');
    setBusca('');
    setFiltroPlano('todos');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] pb-16">
      {/* 1. Header com alternância de regime e ícone informativo */}
      <Header
        dbStatus={dbStatus}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        regime={regime}
        onToggleRegime={(r) => {
          setRegime(r);
          setPage(1);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

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
          criterioCaixa={criterioCaixa}
          onChangeCriterioCaixa={(c) => {
            setCriterioCaixa(c);
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
            <span>
              Lançamentos Analíticos ({lancamentosCounts.total > 0 ? lancamentosCounts.total : totalLancamentos})
            </span>
            {lancamentosCounts.semPlano > 0 && (
              <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
                {lancamentosCounts.semPlano}
              </span>
            )}
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
            counts={lancamentosCounts}
            filtroPlano={filtroPlano}
            onFiltroPlanoChange={(novoFiltro) => {
              setFiltroPlano(novoFiltro);
              setPage(1);
            }}
            page={page}
            limit={50}
            onPageChange={setPage}
            regime={regime}
            onExportExcel={handleExportLancamentosExcel}
            isExporting={isExportingLancamentos}
          />
        )}
      </main>
    </div>
  );
}

