import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import type { AuthUser, PerfilUsuario, Empresa } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: PerfilUsuario | null;
  empresasAcesso: Empresa[];
  authUser: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [empresasAcesso, setEmpresasAcesso] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(async (userId: string) => {
    try {
      // Buscar perfil do usuário
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

      // Buscar empresas com acesso
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
        const empresaIds = acessos.map(a => a.empresa_id);
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
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchPerfil(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
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
  }, [fetchPerfil]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setEmpresasAcesso([]);
  };

  const refreshPerfil = async () => {
    if (user) {
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
