import { useState, useEffect, type FormEvent } from 'react';
import { Shield, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { signIn, session, enableDemoMode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Se já estiver logado, redirecionar automaticamente para o dashboard
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais no Supabase ou use o botão de Acesso Demo abaixo.');
      setLoading(false);
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handlePreencherDemo = () => {
    setEmail('admin@coopercar.com.br');
    setPassword('admin123456');
    enableDemoMode();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-primary-950 to-surface-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30 mb-3">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PatriControl</h1>
          <p className="text-surface-400 text-sm mt-0.5">Sistema de Gestão Patrimonial Multiempresa</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-surface-900">Acesse sua conta</h2>
            <p className="text-xs text-surface-500 mt-0.5">Digite suas credenciais ou entre no modo demo</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-xs text-danger-700 animate-slide-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label text-xs">E-mail Corporativo</label>
              <input
                id="email"
                type="email"
                required
                className="form-input text-sm"
                placeholder="admin@coopercar.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label text-xs">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input pr-10 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-sm font-bold shadow-md shadow-primary-600/25"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          {/* Acesso Rápido / Demonstração (Sempre Visível) */}
          <div className="mt-6 pt-5 border-t border-surface-200">
            <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-200 rounded-xl p-3.5 mb-3 text-center">
              <span className="text-xs font-bold text-primary-950 block mb-0.5">
                ⚡ Acesso Rápido para Testes
              </span>
              <p className="text-[11px] text-primary-700 mb-2.5">
                Entre imediatamente como Administrador sem precisar digitar senha:
              </p>
              <button
                type="button"
                onClick={handlePreencherDemo}
                className="w-full py-2.5 px-3 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-600/30"
              >
                <KeyRound size={15} />
                Entrar como Administrador (Demo)
              </button>
            </div>

            <p className="text-[11px] text-center text-surface-400">
              Coopercar · Coopercar Store · Cooperauto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
