import { useState, useEffect, type FormEvent } from 'react';
import { Shield, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { signIn, session, isConfigured, isDemoMode, enableDemoMode } = useAuth();
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
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      setLoading(false);
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handlePreencherDemo = () => {
    setEmail('admin@coopercar.com.br');
    setPassword('admin123456');
    if (!isConfigured) {
      enableDemoMode();
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-primary-950 to-surface-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PatriControl</h1>
          <p className="text-surface-400 text-sm mt-1">Sistema de Gestão Patrimonial</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-surface-900">Acesse sua conta</h2>
            <p className="text-sm text-surface-500 mt-1">Digite suas credenciais corporativas</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700 animate-slide-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">E-mail</label>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                placeholder="admin@coopercar.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input pr-10"
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
              className="btn btn-primary w-full h-11 text-base shadow-md shadow-primary-600/25"
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

          {/* Dica de Acesso Rápido / Demo */}
          <div className="mt-5 pt-4 border-t border-surface-100">
            {(!isConfigured || isDemoMode) && (
              <button
                type="button"
                onClick={handlePreencherDemo}
                className="w-full py-2 px-3 mb-3 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-primary-200"
              >
                <KeyRound size={14} />
                Entrar com Acesso Demo (Admin)
              </button>
            )}

            <p className="text-xs text-center text-surface-400">
              Coopercar · Coopercar Store · Cooperauto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
