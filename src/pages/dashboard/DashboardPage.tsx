import { useEffect, useState, useCallback } from 'react';
import {
  Package,
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  MapPin,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Empresa, DashboardStats, MovimentacaoCompleta } from '@/types';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, subtitle }: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} transition-transform group-hover:scale-105`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-surface-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-surface-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { authUser, empresasAcesso } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCompleta[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Empresas que o usuário pode acessar
      const empresaIds = empresasAcesso.map(e => e.id);
      if (empresaIds.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Filtrar por empresa selecionada ou todas acessíveis
      const filterEmpresa = selectedEmpresa || undefined;

      // Total de patrimônios
      let patrimonioQuery = supabase
        .from('patrimonios')
        .select('id, status, empresa_atual_id, setor_atual_id, categoria_id', { count: 'exact' })
        .in('empresa_atual_id', empresaIds);

      if (filterEmpresa) {
        patrimonioQuery = patrimonioQuery.eq('empresa_atual_id', filterEmpresa);
      }

      const { data: patrimonios, count: totalPatrimonios } = await patrimonioQuery;

      const ativos = patrimonios?.filter(p => p.status === 'ativo').length || 0;
      const desativados = patrimonios?.filter(p => p.status === 'desativado').length || 0;
      const semLocalizacao = patrimonios?.filter(p => p.status === 'ativo' && !p.setor_atual_id).length || 0;

      // Contagem por empresa
      const porEmpresa: DashboardStats['por_empresa'] = empresasAcesso
        .filter(e => !filterEmpresa || e.id === filterEmpresa)
        .map(empresa => ({
          empresa_id: empresa.id,
          empresa_nome: empresa.nome,
          quantidade: patrimonios?.filter(p => p.empresa_atual_id === empresa.id && p.status === 'ativo').length || 0,
        }));

      // Contagem por categoria
      const { data: categorias } = await supabase
        .from('categorias_patrimonio')
        .select('id, nome')
        .eq('ativo', true);

      const porCategoria: DashboardStats['por_categoria'] = (categorias || []).map(cat => ({
        categoria_id: cat.id,
        categoria_nome: cat.nome,
        quantidade: patrimonios?.filter(p => p.categoria_id === cat.id && p.status === 'ativo').length || 0,
      })).filter(c => c.quantidade > 0);

      // Contagem por estado
      const estados = ['novo', 'bom', 'regular', 'ruim', 'inservivel'] as const;
      const porEstado: DashboardStats['por_estado'] = []; // será preenchido com dados reais quando houver

      // Movimentações recentes
      let movQuery = supabase
        .from('movimentacoes_patrimonio')
        .select(`
          *,
          patrimonio:patrimonios(id, codigo, nome),
          empresa_origem:empresas!movimentacoes_patrimonio_empresa_origem_id_fkey(id, nome),
          empresa_destino:empresas!movimentacoes_patrimonio_empresa_destino_id_fkey(id, nome),
          setor_origem:setores!movimentacoes_patrimonio_setor_origem_id_fkey(id, nome),
          setor_destino:setores!movimentacoes_patrimonio_setor_destino_id_fkey(id, nome)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: movRecentes } = await movQuery;
      setMovimentacoes((movRecentes as unknown as MovimentacaoCompleta[]) || []);

      setStats({
        total_patrimonios: totalPatrimonios || 0,
        patrimonios_ativos: ativos,
        patrimonios_desativados: desativados,
        patrimonios_sem_localizacao: semLocalizacao,
        por_empresa: porEmpresa,
        por_categoria: porCategoria,
        por_estado: porEstado,
        movimentacoes_recentes: [],
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [empresasAcesso, selectedEmpresa]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  const tipoLabel: Record<string, string> = {
    transferencia_setor: 'Transferência de Setor',
    transferencia_empresa: 'Transferência de Empresa',
    cadastro_inicial: 'Cadastro Inicial',
    estorno: 'Estorno',
    correcao: 'Correção',
    desativacao: 'Desativação',
    reativacao: 'Reativação',
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do sistema patrimonial</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="form-select w-48"
            value={selectedEmpresa}
            onChange={(e) => setSelectedEmpresa(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {empresasAcesso.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total de Patrimônios"
          value={stats?.total_patrimonios || 0}
          icon={Package}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
        />
        <StatCard
          label="Ativos"
          value={stats?.patrimonios_ativos || 0}
          icon={TrendingUp}
          iconBg="bg-success-50"
          iconColor="text-success-600"
        />
        <StatCard
          label="Sem Localização"
          value={stats?.patrimonios_sem_localizacao || 0}
          icon={MapPin}
          iconBg="bg-warning-50"
          iconColor="text-warning-600"
          subtitle="Patrimônios sem setor definido"
        />
        <StatCard
          label="Desativados"
          value={stats?.patrimonios_desativados || 0}
          icon={XCircle}
          iconBg="bg-danger-50"
          iconColor="text-danger-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por empresa */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-surface-900">Patrimônios por Empresa</h3>
          </div>
          {stats?.por_empresa.length ? (
            <div className="space-y-3">
              {stats.por_empresa.map((item) => {
                const maxQtd = Math.max(...stats.por_empresa.map(e => e.quantidade), 1);
                const pct = (item.quantidade / maxQtd) * 100;
                return (
                  <div key={item.empresa_id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-surface-700">{item.empresa_nome}</span>
                      <span className="font-bold text-surface-900">{item.quantidade}</span>
                    </div>
                    <div className="w-full bg-surface-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state py-8">
              <Building2 size={32} className="mb-2" />
              <p className="text-sm">Nenhum patrimônio cadastrado</p>
            </div>
          )}
        </div>

        {/* Por categoria */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-surface-900">Patrimônios por Categoria</h3>
          </div>
          {stats?.por_categoria.length ? (
            <div className="space-y-3">
              {stats.por_categoria.map((item) => {
                const maxQtd = Math.max(...stats.por_categoria.map(c => c.quantidade), 1);
                const pct = (item.quantidade / maxQtd) * 100;
                return (
                  <div key={item.categoria_id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-surface-700">{item.categoria_nome}</span>
                      <span className="font-bold text-surface-900">{item.quantidade}</span>
                    </div>
                    <div className="w-full bg-surface-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-info-500 to-info-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state py-8">
              <BarChart3 size={32} className="mb-2" />
              <p className="text-sm">Nenhuma categoria com patrimônios</p>
            </div>
          )}
        </div>
      </div>

      {/* Movimentações recentes */}
      <div className="card mt-6">
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-surface-900">Movimentações Recentes</h3>
          </div>
        </div>
        {movimentacoes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patrimônio</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((mov) => (
                  <tr key={mov.id}>
                    <td>
                      <div>
                        <span className="font-medium text-surface-900">
                          {mov.patrimonio?.codigo || '-'}
                        </span>
                        <p className="text-xs text-surface-500">{mov.patrimonio?.nome || ''}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${mov.tipo === 'estorno' ? 'badge-danger' : 'badge-info'}`}>
                        {tipoLabel[mov.tipo] || mov.tipo}
                      </span>
                    </td>
                    <td className="text-sm">
                      {mov.empresa_origem?.nome || '-'}
                      {mov.setor_origem?.nome && ` / ${mov.setor_origem.nome}`}
                    </td>
                    <td className="text-sm">
                      {mov.empresa_destino?.nome || '-'}
                      {mov.setor_destino?.nome && ` / ${mov.setor_destino.nome}`}
                    </td>
                    <td className="text-sm text-surface-500">
                      {new Date(mov.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state py-12">
            <ArrowRightLeft size={36} className="mb-3" />
            <p className="text-sm font-medium">Nenhuma movimentação registrada</p>
            <p className="text-xs mt-1">As movimentações aparecerão aqui quando forem realizadas</p>
          </div>
        )}
      </div>
    </div>
  );
}
