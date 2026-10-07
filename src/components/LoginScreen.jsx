import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import logoLogin from '../assets/logo-login.png';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Por favor, informe seu usuário e senha.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || 'Credenciais inválidas. Verifique seu usuário e senha.');
        setLoading(false);
        return;
      }

      // Login bem-sucedido: armazenar token e notificar App
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user || { name: 'Administrador' }));
        if (onLoginSuccess) {
          onLoginSuccess(data.token, data.user);
        }
      }
    } catch (err) {
      console.error('Falha na autenticação:', err);
      setErrorMessage('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#1b3a35] via-[#24584f] to-[#122b27] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#42b39f]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#369c86]/25 rounded-full blur-3xl pointer-events-none" />

      {/* Card Principal de Login */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Topo: Logo Oficial e Saudação */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-[#42b39f] p-1 flex items-center justify-center mb-5 hover:scale-105 transition-transform duration-200">
            <img
              src={logoLogin}
              alt="Drogaria SC - Somos Cuidado"
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
            Bem vindo ao portal de Ferramentas da Drogaria SC
          </h1>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Formulário de Acesso */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo Usuário */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Usuário de Acesso
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Informe seu usuário"
                autoComplete="username"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-[#369c86] focus:ring-2 focus:ring-[#369c86]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Informe sua senha de acesso"
                autoComplete="current-password"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-[#369c86] focus:ring-2 focus:ring-[#369c86]/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão de Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#369c86] hover:bg-[#2d8572] active:bg-[#256f5f] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando Acesso...</span>
              </>
            ) : (
              <>
                <span>Acessar Painel</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé de Segurança Criptografada */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Acesso Seguro com Criptografia SHA-512 / PBKDF2</span>
        </div>
      </div>
    </div>
  );
}

