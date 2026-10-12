import { useEffect, useState, useCallback } from 'react';
import { Package, Plus, Search, Eye, Pencil, Power, ChevronLeft, ChevronRight, QrCode, ScanLine, Tag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { listarPatrimonios, criarPatrimonio, editarPatrimonio, desativarPatrimonio } from '@/services/patrimonios';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { MOCK_CATEGORIAS, MOCK_SETORES } from '@/services/mockData';
import { toast } from 'sonner';
import { EtiquetaModal } from '@/components/patrimonios/EtiquetaModal';
import { ConsultaRapidaModal } from '@/components/patrimonios/ConsultaRapidaModal';
import type {
  PatrimonioCompleto,
  FiltrosPatrimonio,
  CategoriaPatrimonio,
  EstadoConservacao,
  SituacaoOperacional,
} from '@/types';

interface SetorSimples { id: string; nome: string; empresa_id: string }

const estadoLabels: Record<string, string> = {
  novo: 'Novo', bom: 'Bom', regular: 'Regular', ruim: 'Ruim', inservivel: 'Inservível',
};
const situacaoLabels: Record<string, string> = {
  em_uso: 'Em uso', disponivel: 'Disponível', em_manutencao: 'Em manutenção', emprestado: 'Emprestado', reservado: 'Reservado',
};
const statusLabels: Record<string, string> = {
  ativo: 'Ativo', desativado: 'Desativado', arquivado: 'Arquivado',
};
const statusBadge: Record<string, string> = {
  ativo: 'badge-success', desativado: 'badge-danger', arquivado: 'badge-default',
};

export function PatrimoniosPage() {
  const { empresasAcesso } = useAuth();
  const { canEdit } = usePermissions();
  const [patrimonios, setPatrimonios] = useState<PatrimonioCompleto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<CategoriaPatrimonio[]>([]);
  const [setores, setSetores] = useState<SetorSimples[]>([]);
  const [filtros, setFiltros] = useState<FiltrosPatrimonio>({ pagina: 1, por_pagina: 20 });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<PatrimonioCompleto | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState<PatrimonioCompleto | null>(null);
  const [showConsultaRapida, setShowConsultaRapida] = useState(false);

  // Form state
  const [form, setForm] = useState({
    codigo: '', nome: '', categoria_id: '', empresa_atual_id: '', setor_atual_id: '',
    descricao: '', marca: '', modelo: '', numero_serie: '', data_aquisicao: '',
    valor_aquisicao: '', estado_conservacao: 'bom', situacao_operacional: 'disponivel',
    responsavel_atual: '', observacoes: '',
  });

  const resetForm = () => {
    setForm({
      codigo: '', nome: '', categoria_id: '', empresa_atual_id: '', setor_atual_id: '',
      descricao: '', marca: '', modelo: '', numero_serie: '', data_aquisicao: '',
      valor_aquisicao: '', estado_conservacao: 'bom', situacao_operacional: 'disponivel',
      responsavel_atual: '', observacoes: '',
    });
    setEditId(null);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listarPatrimonios(filtros);
      setPatrimonios(result.dados);
      setTotal(result.total);
      setTotalPaginas(result.total_paginas);
    } catch {
      toast.error('Erro ao carregar patrimônios');
    }
    setLoading(false);
  }, [filtros]);

  const fetchAux = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCategorias(MOCK_CATEGORIAS);
      setSetores(MOCK_SETORES as unknown as SetorSimples[]);
      return;
    }

    const [catRes, setRes] = await Promise.all([
      supabase.from('categorias_patrimonio').select('*').eq('ativo', true).order('nome'),
      supabase.from('setores').select('id, nome, empresa_id').eq('ativo', true).order('nome'),
    ]);
    setCategorias((catRes.data || []) as CategoriaPatrimonio[]);
    setSetores((setRes.data || []) as unknown as SetorSimples[]);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchAux(); }, [fetchAux]);

  const setoresFiltered = form.empresa_atual_id
    ? setores.filter(s => s.empresa_id === form.empresa_atual_id)
    : [];

  const handleSubmit = async () => {
    if (!form.codigo.trim() || !form.nome.trim() || !form.categoria_id || !form.empresa_atual_id) {
      toast.error('Preencha os campos obrigatórios: Código, Nome, Categoria e Empresa');
      return;
    }
    setSaving(true);
    try {
      const params = {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        categoria_id: form.categoria_id,
        empresa_atual_id: form.empresa_atual_id,
        setor_atual_id: form.setor_atual_id || null,
        descricao: form.descricao || null,
        marca: form.marca || null,
        modelo: form.modelo || null,
        numero_serie: form.numero_serie || null,
        data_aquisicao: form.data_aquisicao || null,
        valor_aquisicao: form.valor_aquisicao ? parseFloat(form.valor_aquisicao) : null,
        estado_conservacao: form.estado_conservacao as EstadoConservacao,
        situacao_operacional: form.situacao_operacional as SituacaoOperacional,
        responsavel_atual: form.responsavel_atual || null,
        observacoes: form.observacoes || null,
      };

      if (editId) {
        await editarPatrimonio(editId, params);
        toast.success('Patrimônio atualizado com sucesso');
      } else {
        await criarPatrimonio(params);
        toast.success('Patrimônio cadastrado com sucesso');
      }
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const handleDesativar = async (p: PatrimonioCompleto) => {
    const motivo = prompt('Informe o motivo da desativação:');
    if (!motivo) return;
    try {
      await desativarPatrimonio(p.id, motivo);
      toast.success('Patrimônio desativado');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar');
    }
  };

  const openEdit = (p: PatrimonioCompleto) => {
    setEditId(p.id);
    setForm({
      codigo: p.codigo, nome: p.nome, categoria_id: p.categoria_id,
      empresa_atual_id: p.empresa_atual_id, setor_atual_id: p.setor_atual_id || '',
      descricao: p.descricao || '', marca: p.marca || '', modelo: p.modelo || '',
      numero_serie: p.numero_serie || '', data_aquisicao: p.data_aquisicao || '',
      valor_aquisicao: p.valor_aquisicao?.toString() || '',
      estado_conservacao: p.estado_conservacao, situacao_operacional: p.situacao_operacional,
      responsavel_atual: p.responsavel_atual || '', observacoes: p.observacoes || '',
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Patrimônios</h1>
          <p className="page-subtitle">{total} patrimônio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary flex items-center gap-1.5"
            onClick={() => setShowConsultaRapida(true)}
            title="Consultar código ou bipar com leitor"
          >
            <ScanLine size={18} /> Consultar / Bipar QR
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={18} /> Novo Patrimônio
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              className="form-input pl-9"
              placeholder="Buscar por código, nome, marca..."
              value={filtros.busca || ''}
              onChange={(e) => setFiltros(f => ({ ...f, busca: e.target.value, pagina: 1 }))}
            />
          </div>
          <select className="form-select" value={filtros.empresa_id || ''} onChange={(e) => setFiltros(f => ({ ...f, empresa_id: e.target.value || undefined, pagina: 1 }))}>
            <option value="">Todas as empresas</option>
            {empresasAcesso.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select className="form-select" value={filtros.categoria_id || ''} onChange={(e) => setFiltros(f => ({ ...f, categoria_id: e.target.value || undefined, pagina: 1 }))}>
            <option value="">Todas categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select className="form-select" value={filtros.status || ''} onChange={(e) => setFiltros(f => ({ ...f, status: (e.target.value || undefined) as FiltrosPatrimonio['status'], pagina: 1 }))}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="desativado">Desativado</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>
      </div>

      {/* Modal Formulário */}
      {showForm && (
        <>
          <div className="overlay" onClick={() => { setShowForm(false); resetForm(); }} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
            <div className="card p-6 w-full max-w-3xl mb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-surface-900 mb-4">
                {editId ? 'Editar Patrimônio' : 'Novo Patrimônio'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Código Patrimonial *</label>
                  <input className="form-input" placeholder="Ex: PAT-001" value={form.codigo} onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))} disabled={!!editId} />
                </div>
                <div>
                  <label className="form-label">Nome *</label>
                  <input className="form-input" placeholder="Nome do bem" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Categoria *</label>
                  <select className="form-select" value={form.categoria_id} onChange={(e) => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Empresa *</label>
                  <select className="form-select" value={form.empresa_atual_id} onChange={(e) => setForm(f => ({ ...f, empresa_atual_id: e.target.value, setor_atual_id: '' }))}>
                    <option value="">Selecione...</option>
                    {empresasAcesso.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Setor</label>
                  <select className="form-select" value={form.setor_atual_id} onChange={(e) => setForm(f => ({ ...f, setor_atual_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {setoresFiltered.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Marca</label>
                  <input className="form-input" placeholder="Marca" value={form.marca} onChange={(e) => setForm(f => ({ ...f, marca: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Modelo</label>
                  <input className="form-input" placeholder="Modelo" value={form.modelo} onChange={(e) => setForm(f => ({ ...f, modelo: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Número de Série</label>
                  <input className="form-input" placeholder="S/N" value={form.numero_serie} onChange={(e) => setForm(f => ({ ...f, numero_serie: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data de Aquisição</label>
                  <input type="date" className="form-input" value={form.data_aquisicao} onChange={(e) => setForm(f => ({ ...f, data_aquisicao: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Valor de Aquisição (R$)</label>
                  <input type="number" step="0.01" min="0" className="form-input" placeholder="0.00" value={form.valor_aquisicao} onChange={(e) => setForm(f => ({ ...f, valor_aquisicao: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Estado de Conservação</label>
                  <select className="form-select" value={form.estado_conservacao} onChange={(e) => setForm(f => ({ ...f, estado_conservacao: e.target.value }))}>
                    {Object.entries(estadoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Situação Operacional</label>
                  <select className="form-select" value={form.situacao_operacional} onChange={(e) => setForm(f => ({ ...f, situacao_operacional: e.target.value }))}>
                    {Object.entries(situacaoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Responsável</label>
                  <input className="form-input" placeholder="Nome do responsável" value={form.responsavel_atual} onChange={(e) => setForm(f => ({ ...f, responsavel_atual: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" rows={2} placeholder="Descrição detalhada" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows={2} placeholder="Observações adicionais" value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-100">
                <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detalhe do patrimônio */}
      {showDetail && (
        <>
          <div className="overlay" onClick={() => setShowDetail(null)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
            <div className="card p-6 w-full max-w-2xl mb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900">Detalhes do Patrimônio</h2>
                <span className={`badge ${statusBadge[showDetail.status]}`}>{statusLabels[showDetail.status]}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-surface-500">Código:</span> <span className="font-medium ml-1">{showDetail.codigo}</span></div>
                <div><span className="text-surface-500">Nome:</span> <span className="font-medium ml-1">{showDetail.nome}</span></div>
                <div><span className="text-surface-500">Categoria:</span> <span className="ml-1">{showDetail.categoria?.nome}</span></div>
                <div><span className="text-surface-500">Empresa:</span> <span className="ml-1">{showDetail.empresa_atual?.nome}</span></div>
                <div><span className="text-surface-500">Setor:</span> <span className="ml-1">{showDetail.setor_atual?.nome || '-'}</span></div>
                <div><span className="text-surface-500">Marca:</span> <span className="ml-1">{showDetail.marca || '-'}</span></div>
                <div><span className="text-surface-500">Modelo:</span> <span className="ml-1">{showDetail.modelo || '-'}</span></div>
                <div><span className="text-surface-500">Nº Série:</span> <span className="ml-1">{showDetail.numero_serie || '-'}</span></div>
                <div><span className="text-surface-500">Conservação:</span> <span className="ml-1">{estadoLabels[showDetail.estado_conservacao]}</span></div>
                <div><span className="text-surface-500">Situação:</span> <span className="ml-1">{situacaoLabels[showDetail.situacao_operacional]}</span></div>
                <div><span className="text-surface-500">Responsável:</span> <span className="ml-1">{showDetail.responsavel_atual || '-'}</span></div>
                <div><span className="text-surface-500">Valor:</span> <span className="ml-1">{showDetail.valor_aquisicao ? `R$ ${showDetail.valor_aquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</span></div>
                {showDetail.descricao && <div className="col-span-2"><span className="text-surface-500">Descrição:</span> <span className="ml-1">{showDetail.descricao}</span></div>}
                {showDetail.observacoes && <div className="col-span-2"><span className="text-surface-500">Observações:</span> <span className="ml-1">{showDetail.observacoes}</span></div>}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary flex items-center gap-1.5"
                  onClick={() => {
                    const item = showDetail;
                    setShowDetail(null);
                    setSelectedEtiqueta(item);
                  }}
                >
                  <Tag size={15} /> Gerar Etiqueta QR
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDetail(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="spinner w-8 h-8" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Empresa / Setor</th>
                  <th>Estado</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {patrimonios.map(p => (
                  <tr key={p.id}>
                    <td><span className="font-mono text-sm font-medium text-primary-600">{p.codigo}</span></td>
                    <td><span className="font-medium text-surface-900">{p.nome}</span></td>
                    <td className="text-sm">{p.categoria?.nome || '-'}</td>
                    <td className="text-sm">
                      <div>{p.empresa_atual?.nome || '-'}</div>
                      {p.setor_atual?.nome && <div className="text-xs text-surface-400">{p.setor_atual.nome}</div>}
                    </td>
                    <td><span className="badge badge-default">{estadoLabels[p.estado_conservacao]}</span></td>
                    <td><span className={`badge ${statusBadge[p.status]}`}>{statusLabels[p.status]}</span></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn btn-sm btn-ghost" title="Ver detalhes" onClick={() => setShowDetail(p)}><Eye size={15} /></button>
                        <button className="btn btn-sm btn-ghost" title="Etiqueta / QR Code" onClick={() => setSelectedEtiqueta(p)}><QrCode size={15} /></button>
                        {canEdit && p.status === 'ativo' && (
                          <>
                            <button className="btn btn-sm btn-ghost" title="Editar" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                            <button className="btn btn-sm btn-ghost" title="Desativar" onClick={() => handleDesativar(p)}><Power size={15} className="text-danger-500" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {patrimonios.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state py-12">
                        <Package size={36} className="mb-3" />
                        <p className="text-sm font-medium">Nenhum patrimônio encontrado</p>
                        <p className="text-xs mt-1">Ajuste os filtros ou cadastre um novo patrimônio</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
              <p className="text-sm text-surface-500">
                Página {filtros.pagina} de {totalPaginas} · {total} registros
              </p>
              <div className="flex gap-1">
                <button className="btn btn-sm btn-secondary" disabled={filtros.pagina <= 1} onClick={() => setFiltros(f => ({ ...f, pagina: f.pagina - 1 }))}>
                  <ChevronLeft size={16} />
                </button>
                <button className="btn btn-sm btn-secondary" disabled={filtros.pagina >= totalPaginas} onClick={() => setFiltros(f => ({ ...f, pagina: f.pagina + 1 }))}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Modais de Etiqueta e Consulta Rápida */}
      {selectedEtiqueta && (
        <EtiquetaModal
          patrimonio={selectedEtiqueta}
          onClose={() => setSelectedEtiqueta(null)}
        />
      )}

      {showConsultaRapida && (
        <ConsultaRapidaModal
          onClose={() => setShowConsultaRapida(false)}
          onSelectDetalhes={(p) => setShowDetail(p)}
          onSelectEtiqueta={(p) => setSelectedEtiqueta(p)}
        />
      )}
    </div>
  );
}
