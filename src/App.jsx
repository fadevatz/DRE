import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import KpiCards from './components/KpiCards';
import DreTable from './components/DreTable';
import DreMensalTable from './components/DreMensalTable';
import ChartsView from './components/ChartsView';
import LancamentosTable from './components/LancamentosTable';
import LoginScreen from './components/LoginScreen';
import { exportLancamentosToExcel, exportDreMensalToExcel } from './utils/excelExporter';
import { Layers, LineChart, FileText, CalendarDays, Loader2 } from 'lucide-react';
import logoLogin from './assets/logo-login.png';

export default function App() {
  // Estado de Autenticação Segura
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));
  const [authUser, setAuthUser] = useState(() => {
    try {
      const u = localStorage.getItem('auth_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  // Estado de conexão com banco
  const [dbStatus, setDbStatus] = useState({ connected: false, message: 'Verificando...' });

  // Filtros Globais
  const [regime, setRegime] = useState('competencia'); // 'competencia' ou 'caixa'
  const [filiais, setFiliais] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState('1');
  const [dtInicio, setDtInicio] = useState('');
  const [dtFim, setDtFim] = useState('');

  // Planos de Contas e Seleção Suspensa
  const [planosContas, setPlanosContas] = useState([]);
  const [planosExcluidos, setPlanosExcluidos] = useState([]); // IDs numéricos desmarcados

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

  // DRE Mês a Mês
  const [anoDreMensal, setAnoDreMensal] = useState(2026);
  const [dreMensalData, setDreMensalData] = useState(null);
  const [loadingDreMensal, setLoadingDreMensal] = useState(false);

  // Estados de navegação interna
  const [mainTab, setMainTab] = useState('dre'); // 'dre' | 'dre_mensal' | 'graficos' | 'lancamentos'
  const [chartSubTab, setChartSubTab] = useState('tendencia'); // 'tendencia' | 'distribuicao'
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper para requisições autenticadas com injeção automática de Bearer token
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Token expirou ou é inválido
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setAuthToken(null);
      setAuthUser(null);
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    return res;
  }, []);

  // Verificar validade do token ao abrir a aplicação
  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsVerifyingAuth(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.valid) {
          setAuthToken(token);
          setAuthUser(data.user || { name: 'Administrador' });
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setAuthToken(null);
          setAuthUser(null);
        }
      } catch (err) {
        console.warn('Erro ao checar autenticação:', err);
      } finally {
        setIsVerifyingAuth(false);
      }
    }
    verifySession();
  }, []);

  // Carregar status do banco
  const checkDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      setDbStatus({ connected: false, message: 'Servidor offline' });
    }
  }, []);

  // Carregar lista de filiais
  const loadFiliais = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await authFetch('/api/filiais');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiliais(data);
      }
    } catch (err) {
      console.error('Erro ao carregar filiais:', err);
    }
  }, [authToken, authFetch]);

  // Carregar lista de planos de contas para o dropdown com seleção
  const loadPlanosContas = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await authFetch('/api/planos-contas');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlanosContas(data);
      }
    } catch (err) {
      console.error('Erro ao carregar planos de contas:', err);
    }
  }, [authToken, authFetch]);

  // Carregar DRE Mês a Mês (Visão 12 meses)
  const loadDreMensal = useCallback(async (anoAlvo) => {
    if (!authToken) return;
    const y = anoAlvo || anoDreMensal;
    setLoadingDreMensal(true);
    try {
      const paramsObj = {
        ano: String(y),
        regime,
        filial_id: selectedFilial
      };
      if (planosExcluidos.length > 0) {
        paramsObj.planos_excluidos = planosExcluidos.join(',');
      }
      const res = await authFetch(`/api/dre-mensal?${new URLSearchParams(paramsObj).toString()}`);
      const json = await res.json();
      setDreMensalData(json);
    } catch (err) {
      console.error('Erro ao carregar DRE Mês a Mês:', err);
    } finally {
      setLoadingDreMensal(false);
    }
  }, [authToken, authFetch, anoDreMensal, regime, selectedFilial, planosExcluidos]);

  // Carregar dados gerais
  const loadData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setIsRefreshing(true);
    try {
      const baseParamsObj = {
        regime,
        filial_id: selectedFilial,
        dt_inicio: dtInicio,
        dt_fim: dtFim
      };
      if (planosExcluidos.length > 0) {
        baseParamsObj.planos_excluidos = planosExcluidos.join(',');
      }
      const baseQueryParams = new URLSearchParams(baseParamsObj).toString();

      const lancParamsObj = {
        ...baseParamsObj,
        filtro_plano: filtroPlano,
        page: String(page),
        limit: '50'
      };
      const lancQueryParams = new URLSearchParams(lancParamsObj).toString();

      // Buscar simultaneamente KPIs, DRE, Gráficos e Lançamentos com autenticação
      const [kpiRes, dreRes, chartRes, lancRes] = await Promise.all([
        authFetch(`/api/kpis?${baseQueryParams}`),
        authFetch(`/api/dre?${baseQueryParams}`),
        authFetch(`/api/graficos?${baseQueryParams}`),
        authFetch(`/api/lancamentos?${lancQueryParams}`)
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

      // Também atualiza o DRE mês a mês
      loadDreMensal();
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [authToken, authFetch, regime, selectedFilial, dtInicio, dtFim, planosExcluidos, filtroPlano, page, loadDreMensal]);

  useEffect(() => {
    if (authToken) {
      checkDbStatus();
      loadFiliais();
      loadPlanosContas();
      loadData();
    }
  }, [authToken, checkDbStatus, loadFiliais, loadPlanosContas, loadData]);

  // Callback de login bem-sucedido
  const handleLoginSuccess = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    setPage(1);
  };

  // Callback de logout
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthToken(null);
    setAuthUser(null);
  };

  // Alternar marcação de plano individual
  const handleTogglePlano = (planoId) => {
    const idNum = Number(planoId);
    setPlanosExcluidos(prev => {
      if (prev.includes(idNum)) {
        return prev.filter(id => id !== idNum);
      } else {
        return [...prev, idNum];
      }
    });
    setPage(1);
  };

  // Marcar todos os planos
  const handleMarcarTodos = () => {
    setPlanosExcluidos([]);
    setPage(1);
  };

  // Desmarcar todos os planos
  const handleDesmarcarTodos = () => {
    setPlanosExcluidos(planosContas.map(p => Number(p.planocontas_id)));
    setPage(1);
  };

  // Exportar lançamentos analíticos filtrados para planilha Excel
  const handleExportLancamentosExcel = async () => {
    try {
      setIsExportingLancamentos(true);
      const queryParamsObj = {
        regime,
        filial_id: selectedFilial,
        dt_inicio: dtInicio,
        dt_fim: dtFim,
        filtro_plano: filtroPlano,
        export: 'true',
        limit: '50000'
      };
      if (planosExcluidos.length > 0) {
        queryParamsObj.planos_excluidos = planosExcluidos.join(',');
      }
      const queryParams = new URLSearchParams(queryParamsObj).toString();

      const res = await authFetch(`/api/lancamentos?${queryParams}`);
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
        dtFim
      });
    } catch (err) {
      console.error('Erro ao exportar lançamentos para Excel:', err);
      alert('Falha ao exportar lançamentos para Excel: ' + err.message);
    } finally {
      setIsExportingLancamentos(false);
    }
  };

  // Exportar DRE Mês a Mês para planilha Excel
  const handleExportDreMensalExcel = async () => {
    try {
      const fObj = filiais.find(f => (typeof f === 'object' ? String(f.filial_id) : String(f)) === String(selectedFilial));
      const filialNome = fObj
        ? `${selectedFilial} - ${fObj.nome || (selectedFilial === '1' ? 'Escritório (Todas as Lojas)' : `Filial #${selectedFilial}`)}`
        : (selectedFilial === '1' ? '1 - Escritório (Todas as Lojas)' : `Filial #${selectedFilial}`);

      await exportDreMensalToExcel({
        dreMensalData,
        ano: anoDreMensal,
        regime,
        filialNome
      });
    } catch (err) {
      console.error('Erro ao exportar DRE Mês a Mês para Excel:', err);
      alert('Falha ao exportar DRE Mês a Mês: ' + err.message);
    }
  };

  const handleResetFilters = () => {
    setSelectedFilial('1');
    setDtInicio('');
    setDtFim('');
    setPlanosExcluidos([]);
    setFiltroPlano('todos');
    setPage(1);
  };

  // 1. Tela de carregamento enquanto valida a sessão salva
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-[#1b3a35] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#42b39f] p-1 shadow-xl mb-4 animate-pulse flex items-center justify-center">
          <img src={logoLogin} alt="Drogaria SC" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-white/90 text-sm font-semibold">
          <Loader2 className="w-5 h-5 animate-spin text-[#42b39f]" />
          <span>Verificando credenciais seguras...</span>
        </div>
      </div>
    );
  }

  // 2. Se não estiver autenticado, renderiza a Tela de Login
  if (!authToken) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Painel Principal com Acesso Autorizado
  return (
    <div className="min-h-screen bg-[#f3f6fa] pb-16">
      {/* 1. Header com alternância de regime, botão Sair e ícone informativo */}
      <Header
        dbStatus={dbStatus}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        regime={regime}
        onToggleRegime={(r) => {
          setRegime(r);
          setPage(1);
        }}
        user={authUser}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* 2. Filtros de Análise */}
        <FilterBar
          filiais={filiais}
          selectedFilial={selectedFilial}
          onChangeFilial={(f) => {
            setSelectedFilial(f);
            setPage(1);
          }}
          regime={regime}
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
          planosContas={planosContas}
          planosExcluidos={planosExcluidos}
          onTogglePlano={handleTogglePlano}
          onMarcarTodos={handleMarcarTodos}
          onDesmarcarTodos={handleDesmarcarTodos}
          onApplyFilters={loadData}
          onSelectPeriod={(ini, fim) => {
            setDtInicio(ini);
            setDtFim(fim);
            setPage(1);
            if (ini && ini.startsWith('2025')) setAnoDreMensal(2025);
            else if (ini && ini.startsWith('2026')) setAnoDreMensal(2026);
          }}
          onResetFilters={handleResetFilters}
          loading={loading}
        />

        {/* 3. 4 Cards de Métricas / KPIs */}
        <KpiCards kpis={kpis} regime={regime} />

        {/* 4. Barra de Navegação de Módulos / Abas (Inclui DRE Mês a Mês) */}
        <div className="flex items-center gap-1.5 mb-4 bg-slate-200/70 p-1 rounded-xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setMainTab('dre')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'dre'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Demonstrativo DRE</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab('dre_mensal');
              if (!dreMensalData) loadDreMensal();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'dre_mensal'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>DRE Mês a Mês</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('graficos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainTab === 'graficos'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Tendência &amp; Gráficos</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('lancamentos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

        {mainTab === 'dre_mensal' && (
          <DreMensalTable
            dreMensalData={dreMensalData}
            ano={anoDreMensal}
            onChangeAno={(novoAno) => {
              setAnoDreMensal(novoAno);
              loadDreMensal(novoAno);
            }}
            regime={regime}
            loading={loadingDreMensal}
            onExportExcel={handleExportDreMensalExcel}
          />
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
