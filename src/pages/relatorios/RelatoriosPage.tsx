import { useState, useCallback } from 'react';
import { BarChart3, Download, FileText, Building2, FolderTree, ArrowRightLeft, MapPin, XCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { mockPatrimoniosList, mockMovimentacoesList } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ReportType = 'inventario_geral' | 'inventario_empresa' | 'inventario_setor' | 'transferencias_empresa' | 'transferencias_internas' | 'sem_localizacao' | 'desativados';

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const reports: ReportConfig[] = [
  { type: 'inventario_geral', label: 'Inventário Geral', description: 'Lista completa de todos os patrimônios', icon: FileText },
  { type: 'inventario_empresa', label: 'Inventário por Empresa', description: 'Patrimônios filtrados por empresa', icon: Building2 },
  { type: 'inventario_setor', label: 'Inventário por Setor', description: 'Patrimônios filtrados por setor', icon: FolderTree },
  { type: 'transferencias_empresa', label: 'Transferências entre Empresas', description: 'Movimentações entre empresas', icon: ArrowRightLeft },
  { type: 'transferencias_internas', label: 'Transferências Internas', description: 'Movimentações entre setores da mesma empresa', icon: ArrowRightLeft },
  { type: 'sem_localizacao', label: 'Sem Localização', description: 'Patrimônios ativos sem setor definido', icon: MapPin },
  { type: 'desativados', label: 'Patrimônios Desativados', description: 'Patrimônios inativos ou arquivados', icon: XCircle },
];

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) { toast.error('Nenhum dado para exportar'); return; }
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(';') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(';'))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Relatório exportado com sucesso');
}

export function RelatoriosPage() {
  const { empresasAcesso } = useAuth();
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');

  const generate = useCallback(async (type: ReportType) => {
    setGenerating(type);
    try {
      if (!isSupabaseConfigured) {
        let rows: Record<string, unknown>[] = [];
        if (type.startsWith('inventario') || type === 'sem_localizacao' || type === 'desativados') {
          let items = [...mockPatrimoniosList];
          if (type === 'inventario_empresa' && filtroEmpresa) {
            items = items.filter(p => p.empresa_atual_id === filtroEmpresa);
          }
          if (type === 'sem_localizacao') {
            items = items.filter(p => !p.setor_atual_id);
          }
          if (type === 'desativados') {
            items = items.filter(p => p.status === 'desativado');
          }
          rows = items.map(p => ({
            'Código': p.codigo,
            'Nome': p.nome,
            'Categoria': p.categoria?.nome || '',
            'Empresa': p.empresa_atual?.nome || '',
            'Setor': p.setor_atual?.nome || '',
            'Status': p.status,
            'Conservação': p.estado_conservacao,
            'Situação': p.situacao_operacional,
            'Marca': p.marca || '',
            'Modelo': p.modelo || '',
            'Valor (R$)': p.valor_aquisicao || '',
          }));
        } else {
          rows = mockMovimentacoesList.map(m => ({
            'Data': new Date(m.created_at).toLocaleString('pt-BR'),
            'Código': m.patrimonio?.codigo || '',
            'Nome': m.patrimonio?.nome || '',
            'Tipo': m.tipo,
            'Origem': `${m.empresa_origem?.nome || ''} / ${m.setor_origem?.nome || ''}`,
            'Destino': `${m.empresa_destino?.nome || ''} / ${m.setor_destino?.nome || ''}`,
            'Motivo': m.motivo,
          }));
        }
        downloadCSV(rows, `relatorio_${type}`);
        toast.success('Relatório gerado com sucesso!');
        setGenerating(null);
        return;
      }

      switch (type) {
        case 'inventario_geral':
        case 'inventario_empresa':
        case 'inventario_setor': {
          let query = supabase
            .from('patrimonios')
            .select(`
              codigo, nome, status, estado_conservacao, situacao_operacional,
              marca, modelo, numero_serie, data_aquisicao, valor_aquisicao,
              responsavel_atual, observacoes, created_at,
              empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(nome),
              setor_atual:setores!patrimonios_setor_atual_id_fkey(nome),
              categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(nome)
            `)
            .order('codigo');

          if (type === 'inventario_empresa' && filtroEmpresa) {
            query = query.eq('empresa_atual_id', filtroEmpresa);
          }

          const { data, error } = await query;
          if (error) throw new Error(error.message);

          const rows = (data || []).map((p: Record<string, unknown>) => ({
            'Código': p.codigo,
            'Nome': p.nome,
            'Categoria': (p.categoria as Record<string, unknown>)?.nome || '',
            'Empresa': (p.empresa_atual as Record<string, unknown>)?.nome || '',
            'Setor': (p.setor_atual as Record<string, unknown>)?.nome || '',
            'Status': p.status,
            'Conservação': p.estado_conservacao,
            'Situação': p.situacao_operacional,
            'Marca': p.marca || '',
            'Modelo': p.modelo || '',
            'Nº Série': p.numero_serie || '',
            'Data Aquisição': p.data_aquisicao || '',
            'Valor': p.valor_aquisicao || '',
            'Responsável': p.responsavel_atual || '',
          }));
          downloadCSV(rows, `inventario_${type.split('_').pop()}`);
          break;
        }

        case 'transferencias_empresa':
        case 'transferencias_internas': {
          let query = supabase
            .from('movimentacoes_patrimonio')
            .select(`
              tipo, motivo, observacoes, responsavel_entrega, responsavel_recebimento, created_at,
              patrimonio:patrimonios!movimentacoes_patrimonio_patrimonio_id_fkey(codigo, nome),
              empresa_origem:empresas!movimentacoes_patrimonio_empresa_origem_id_fkey(nome),
              empresa_destino:empresas!movimentacoes_patrimonio_empresa_destino_id_fkey(nome),
              setor_origem:setores!movimentacoes_patrimonio_setor_origem_id_fkey(nome),
              setor_destino:setores!movimentacoes_patrimonio_setor_destino_id_fkey(nome)
            `)
            .order('created_at', { ascending: false });

          if (type === 'transferencias_empresa') {
            query = query.eq('tipo', 'transferencia_empresa');
          } else {
            query = query.eq('tipo', 'transferencia_setor');
          }

          const { data, error } = await query;
          if (error) throw new Error(error.message);

          const rows = (data || []).map((m: Record<string, unknown>) => ({
            'Patrimônio Código': (m.patrimonio as Record<string, unknown>)?.codigo || '',
            'Patrimônio Nome': (m.patrimonio as Record<string, unknown>)?.nome || '',
            'Tipo': m.tipo,
            'Empresa Origem': (m.empresa_origem as Record<string, unknown>)?.nome || '',
            'Setor Origem': (m.setor_origem as Record<string, unknown>)?.nome || '',
            'Empresa Destino': (m.empresa_destino as Record<string, unknown>)?.nome || '',
            'Setor Destino': (m.setor_destino as Record<string, unknown>)?.nome || '',
            'Motivo': m.motivo || '',
            'Entrega': m.responsavel_entrega || '',
            'Recebimento': m.responsavel_recebimento || '',
            'Data': m.created_at,
          }));
          downloadCSV(rows, `transferencias_${type === 'transferencias_empresa' ? 'entre_empresas' : 'internas'}`);
          break;
        }

        case 'sem_localizacao': {
          const { data, error } = await supabase
            .from('patrimonios')
            .select(`
              codigo, nome, marca, modelo, created_at,
              empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(nome),
              categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(nome)
            `)
            .eq('status', 'ativo')
            .is('setor_atual_id', null)
            .order('codigo');

          if (error) throw new Error(error.message);

          const rows = (data || []).map((p: Record<string, unknown>) => ({
            'Código': p.codigo,
            'Nome': p.nome,
            'Empresa': (p.empresa_atual as Record<string, unknown>)?.nome || '',
            'Categoria': (p.categoria as Record<string, unknown>)?.nome || '',
            'Marca': p.marca || '',
            'Modelo': p.modelo || '',
            'Data Cadastro': p.created_at,
          }));
          downloadCSV(rows, 'patrimonios_sem_localizacao');
          break;
        }

        case 'desativados': {
          const { data, error } = await supabase
            .from('patrimonios')
            .select(`
              codigo, nome, status, marca, modelo, updated_at,
              empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(nome),
              categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(nome)
            `)
            .neq('status', 'ativo')
            .order('updated_at', { ascending: false });

          if (error) throw new Error(error.message);

          const rows = (data || []).map((p: Record<string, unknown>) => ({
            'Código': p.codigo,
            'Nome': p.nome,
            'Status': p.status,
            'Empresa': (p.empresa_atual as Record<string, unknown>)?.nome || '',
            'Categoria': (p.categoria as Record<string, unknown>)?.nome || '',
            'Marca': p.marca || '',
            'Atualizado em': p.updated_at,
          }));
          downloadCSV(rows, 'patrimonios_desativados');
          break;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar relatório');
    }
    setGenerating(null);
  }, [filtroEmpresa]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-subtitle">Geração e exportação de relatórios do inventário</p>
      </div>

      {/* Filtro global */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="form-label mb-0 whitespace-nowrap">Filtrar por empresa:</label>
          <select className="form-select w-56" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresasAcesso.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Grid de relatórios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => {
          const Icon = report.icon;
          const isGenerating = generating === report.type;
          return (
            <div key={report.type} className="card p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Icon size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">{report.label}</h3>
                  <p className="text-xs text-surface-500">{report.description}</p>
                </div>
              </div>
              <div className="mt-auto pt-3">
                <button
                  className="btn btn-sm btn-secondary w-full"
                  onClick={() => generate(report.type)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <><Loader2 size={14} className="animate-spin" /> Gerando...</>
                  ) : (
                    <><Download size={14} /> Exportar CSV</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-surface-50 rounded-lg border border-surface-200">
        <div className="flex items-start gap-3">
          <BarChart3 size={18} className="text-surface-400 mt-0.5" />
          <div>
            <p className="text-sm text-surface-600 font-medium">Exportação PDF e Excel</p>
            <p className="text-xs text-surface-400 mt-0.5">Exportação em formato PDF e Excel será disponibilizada em uma atualização futura.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
