import { useAuth } from './useAuth';
import type { UserRole } from '@/types';

export function usePermissions() {
  const { perfil, empresasAcesso } = useAuth();

  const role: UserRole | null = perfil?.role ?? null;

  const isAdmin = role === 'ADMINISTRADOR';
  const isOperador = role === 'OPERADOR';
  const isVisualizador = role === 'VISUALIZADOR';

  const canEdit = isAdmin || isOperador;
  const canDelete = isAdmin;
  const canManageUsers = isAdmin;
  const canTransfer = isAdmin || isOperador;
  const canViewReports = true; // Todos os perfis podem ver relatórios

  const hasAccessToEmpresa = (empresaId: string): boolean => {
    return empresasAcesso.some(e => e.id === empresaId);
  };

  const getEmpresasAcesso = () => empresasAcesso;

  return {
    role,
    isAdmin,
    isOperador,
    isVisualizador,
    canEdit,
    canDelete,
    canManageUsers,
    canTransfer,
    canViewReports,
    hasAccessToEmpresa,
    getEmpresasAcesso,
  };
}
