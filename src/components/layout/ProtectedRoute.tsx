import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: ('ADMINISTRADOR' | 'OPERADOR' | 'VISUALIZADOR')[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="spinner w-10 h-10 mx-auto mb-4" />
          <p className="text-sm text-surface-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="card p-8 max-w-md text-center">
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Acesso não configurado</h2>
          <p className="text-sm text-surface-500 mb-4">
            Seu perfil de usuário ainda não foi configurado. Entre em contato com o administrador do sistema.
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-secondary">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && !requiredRole.includes(perfil.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="card p-8 max-w-md text-center">
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Acesso restrito</h2>
          <p className="text-sm text-surface-500">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
