import { useState } from 'react';
import { Shield, Database, Copy, Check, ExternalLink, Play, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SetupScreenProps {
  onEnableDemoMode: () => void;
}

export function SetupScreen({ onEnableDemoMode }: SetupScreenProps) {
  const [copied, setCopied] = useState(false);

  const envTemplate = `VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co\nVITE_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(envTemplate);
      setCopied(true);
      toast.success('Modelo do .env copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Erro ao copiar modelo');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 text-white flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl animate-slide-up">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-xl shadow-primary-500/25 mb-3">
            <Shield size={34} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            PatriControl Multiempresa
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Sistema de Gestão Patrimonial · Coopercar · Coopercar Store · Cooperauto
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-surface-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
            <Database size={22} className="flex-shrink-0 text-amber-400" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-amber-200 text-sm font-semibold mb-0.5">
                Configuração do Supabase Necessária
              </strong>
              O servidor Vite iniciou com sucesso, mas as credenciais do Supabase ainda não foram
              configuradas no arquivo <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200 font-mono">.env</code>.
            </div>
          </div>

          {/* Passo a Passo */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary-400" />
              Como conectar seu banco de dados:
            </h2>

            <div className="space-y-3 text-xs text-surface-300">
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <span className="font-semibold text-white">Obtenha as chaves do Supabase:</span>
                  <p className="text-surface-400 mt-0.5">
                    Acesse seu projeto no{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      Supabase Dashboard <ExternalLink size={11} />
                    </a>{' '}
                    → <strong>Settings</strong> → <strong>API</strong> e copie a <strong>URL</strong> e a <strong>anon key</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </span>
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-white">
                      Cole no arquivo <code className="text-primary-300 font-mono">.env</code>:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-[11px] font-medium text-primary-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? 'Copiado!' : 'Copiar Modelo'}
                    </button>
                  </div>
                  <pre className="bg-black/50 p-2.5 rounded border border-white/10 font-mono text-[11px] text-primary-200 overflow-x-auto">
                    {envTemplate}
                  </pre>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <span className="font-semibold text-white">Execute a migração SQL inicial:</span>
                  <p className="text-surface-400 mt-0.5">
                    No <strong>SQL Editor</strong> do Supabase, execute o arquivo{' '}
                    <code className="text-primary-300 font-mono">supabase/migrations/001_schema_inicial.sql</code> para criar tabelas, RLS e funções RPC.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divisor com opção Demo */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-surface-900 px-3 text-surface-400 font-semibold">
                Ou teste agora mesmo
              </span>
            </div>
          </div>

          {/* Botão Modo Demonstração */}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={onEnableDemoMode}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Play size={18} className="fill-white" />
              Explorar Sistema em Modo Demonstração
              <ArrowRight size={18} />
            </button>
            <p className="text-[11px] text-surface-400">
              Permite navegar por todas as telas (Dashboard, Patrimônios, Inventário com QR Code, Transferências e Relatórios) com dados demonstrativos pré-carregados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
