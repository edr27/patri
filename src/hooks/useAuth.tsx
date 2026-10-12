import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { AuthUser, PerfilUsuario, Empresa } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: PerfilUsuario | null;
  empresasAcesso: Empresa[];
  authUser: AuthUser | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  enableDemoMode: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: {},
  user_metadata: { nome_completo: 'Administrador Demo' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'admin@coopercar.com.br',
} as unknown as User;

const DEMO_PERFIL: PerfilUsuario = {
  id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0000-000000000001',
  nome_completo: 'Administrador Demo',
  role: 'ADMINISTRADOR',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_EMPRESAS: Empresa[] = [
  { id: '11111111-1111-1111-1111-111111111111', nome: 'Coopercar', ativo: true, created_at: '', updated_at: '' },
  { id: '22222222-2222-2222-2222-222222222222', nome: 'Coopercar Store', ativo: true, created_at: '', updated_at: '' },
  { id: '33333333-3333-3333-3333-333333333333', nome: 'Cooperauto', ativo: true, created_at: '', updated_at: '' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [empresasAcesso, setEmpresasAcesso] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('patricontrol_demo_mode') === 'true';
  });

  const enableDemoMode = useCallback(() => {
    localStorage.setItem('patricontrol_demo_mode', 'true');
    setIsDemoMode(true);
    setUser(DEMO_USER);
    setPerfil(DEMO_PERFIL);
    setEmpresasAcesso(DEMO_EMPRESAS);
    setSession({
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh',
      user: DEMO_USER,
    } as Session);
    setLoading(false);
  }, []);

  const fetchPerfil = useCallback(async (userId: string) => {
    try {
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis_usuario')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)
        .single();

      if (perfilError || !perfilData) {
        console.error('Erro ao buscar perfil:', perfilError);
        setPerfil(null);
        setEmpresasAcesso([]);
        return;
      }

      setPerfil(perfilData);

      const { data: acessos, error: acessosError } = await supabase
        .from('acessos_empresa')
        .select('empresa_id')
        .eq('user_id', userId);

      if (acessosError) {
        console.error('Erro ao buscar acessos:', acessosError);
        setEmpresasAcesso([]);
        return;
      }

      if (acessos && acessos.length > 0) {
        const empresaIds = acessos.map((a: { empresa_id: string }) => a.empresa_id);
        const { data: empresas } = await supabase
          .from('empresas')
          .select('*')
          .in('id', empresaIds)
          .eq('ativo', true)
          .order('nome');

        setEmpresasAcesso(empresas || []);
      } else {
        setEmpresasAcesso([]);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil:', err);
      setPerfil(null);
      setEmpresasAcesso([]);
    }
  }, []);

  useEffect(() => {
    // Se não estiver configurado o Supabase
    if (!isSupabaseConfigured) {
      if (isDemoMode) {
        enableDemoMode();
      } else {
        setLoading(false);
      }
      return;
    }

    // Se estiver configurado, verificar sessão real
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchPerfil(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchPerfil(newSession.user.id);
        } else {
          setPerfil(null);
          setEmpresasAcesso([]);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchPerfil, isDemoMode, enableDemoMode]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      enableDemoMode();
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('patricontrol_demo_mode');
      setIsDemoMode(false);
      setSession(null);
      setUser(null);
      setPerfil(null);
      setEmpresasAcesso([]);
      return;
    }
    await supabase.auth.signOut();
    setPerfil(null);
    setEmpresasAcesso([]);
  };

  const refreshPerfil = async () => {
    if (user && isSupabaseConfigured) {
      await fetchPerfil(user.id);
    }
  };

  const authUser: AuthUser | null = user && perfil ? {
    id: user.id,
    email: user.email || '',
    perfil,
    empresas_acesso: empresasAcesso,
  } : null;

  return (
    <AuthContext.Provider value={{
      session,
      user,
      perfil,
      empresasAcesso,
      authUser,
      loading,
      isConfigured: isSupabaseConfigured,
      isDemoMode,
      enableDemoMode,
      signIn,
      signOut,
      refreshPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
