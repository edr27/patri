import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Building2,
  FolderTree,
  ArrowRightLeft,
  History,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Patrimônios', path: '/patrimonios', icon: Package },
  { label: 'Empresas', path: '/empresas', icon: Building2 },
  { label: 'Setores', path: '/setores', icon: FolderTree },
  { label: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft },
  { label: 'Histórico', path: '/historico', icon: History },
  { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
  { label: 'Usuários', path: '/usuarios', icon: Users, adminOnly: true },
  { label: 'Configurações', path: '/configuracoes', icon: Settings, adminOnly: true },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { isAdmin } = usePermissions();

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300',
        'bg-sidebar-bg text-sidebar-text',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-slide-up">
              <h1 className="text-sm font-bold text-white truncate">PatriControl</h1>
              <p className="text-[10px] text-sidebar-text truncate">Gestão Patrimonial</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-hover hover:text-white',
                isActive
                  ? 'bg-sidebar-active text-sidebar-text-active shadow-md shadow-primary-900/30'
                  : 'text-sidebar-text',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-sidebar-hover text-sidebar-text hover:text-white transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
