import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, X, ShieldAlert, KeyRound, Server, HardDrive, RefreshCw } from 'lucide-react';

export default function DatabaseModal({ isOpen, onClose, onConnected }) {
  const [formData, setFormData] = useState({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '',
    database: ''
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const resConfig = await fetch('/api/database/config');
      const dataConfig = await resConfig.json();
      if (dataConfig.host) {
        setFormData(prev => ({
          ...prev,
          host: dataConfig.host,
          port: String(dataConfig.port || 3306),
          user: dataConfig.user,
          database: dataConfig.database || ''
        }));
      }

      const resStatus = await fetch('/api/status');
      const dataStatus = await resStatus.json();
      setCurrentStatus(dataStatus);
    } catch (err) {
      console.error('Erro ao buscar configuração:', err);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: 'Falha na requisição: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: 'Conexão salva e ativa com sucesso!' });
        if (onConnected) onConnected();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setTestResult({ success: false, message: data.status?.message || 'Erro ao conectar.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Erro ao salvar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm('Deseja criar as tabelas pagar e planocontas caso não existam e inserir registros de exemplo no seu banco MariaDB?')) {
      return;
    }
    setSeeding(true);
    try {
      const res = await fetch('/api/database/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Tabelas e dados populados com sucesso no MariaDB!');
        if (onConnected) onConnected();
      } else {
        alert('Erro ao popular: ' + data.error);
      }
    } catch (err) {
      alert('Erro na requisição: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Configuração MariaDB</h3>
              <p className="text-xs text-blue-100">Conecte direto ao banco local com as tabelas pagar e planocontas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Atual */}
        {currentStatus && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
            currentStatus.connected ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : 'bg-amber-50 text-amber-800 border-b border-amber-100'
          }`}>
            {currentStatus.connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Conectado ao MariaDB ({currentStatus.database}@{currentStatus.host})</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Desconectado. Informe os dados abaixo para conectar.</span>
              </>
            )}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Host / Servidor
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="127.0.0.1 ou localhost"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Porta
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="3306"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Banco de Dados (Database)
            </label>
            <input
              type="text"
              required
              value={formData.database}
              onChange={(e) => setFormData({ ...formData, database: e.target.value })}
              placeholder="ex: financeiro, erp, sistema"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                required
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                placeholder="root"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Feedback do Teste */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs font-medium border flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.tables && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    Tabelas encontradas: {testResult.tables.join(', ') || 'Nenhuma'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar & Conectar'}
                </button>
              </div>
            </div>

            {/* Opção para criar tabelas / seed se conectado */}
            {currentStatus && currentStatus.connected && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Deseja criar as tabelas pagar e planocontas no banco?
                </span>
                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={seeding}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline disabled:opacity-50"
                >
                  {seeding ? 'Criando tabelas...' : 'Criar Tabelas de Exemplo'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

