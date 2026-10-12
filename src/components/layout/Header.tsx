import { LogOut, User, Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { authUser, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const roleLabels: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    OPERADOR: 'Operador',
    VISUALIZADOR: 'Visualizador',
  };

  const roleBadgeColors: Record<string, string> = {
    ADMINISTRADOR: 'bg-primary-100 text-primary-700',
    OPERADOR: 'bg-success-50 text-success-700',
    VISUALIZADOR: 'bg-surface-100 text-surface-600',
  };

  return (
    <header
      className="fixed top-0 right-0 z-20 h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 transition-all duration-300"
      style={{ left: sidebarCollapsed ? '72px' : '260px' }}
    >
      <div className="flex items-center gap-4">
        {/* Breadcrumb or page context can go here */}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications placeholder */}
        <button className="btn-icon btn-ghost relative" title="Notificações">
          <Bell size={20} className="text-surface-500" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-surface-900 leading-tight">
                {authUser?.perfil.nome_completo || authUser?.email || 'Usuário'}
              </p>
              {authUser?.perfil.role && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadgeColors[authUser.perfil.role] || ''}`}>
                  {roleLabels[authUser.perfil.role] || authUser.perfil.role}
                </span>
              )}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-dropdown border border-surface-200 py-1 animate-slide-up">
              <div className="px-4 py-3 border-b border-surface-100">
                <p className="text-sm font-medium text-surface-900">
                  {authUser?.perfil.nome_completo}
                </p>
                <p className="text-xs text-surface-500 truncate">
                  {authUser?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut size={16} />
                Sair do sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
