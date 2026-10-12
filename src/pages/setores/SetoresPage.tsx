import { useEffect, useState, useCallback } from 'react';
import { FolderTree, Plus, Pencil, Power, Building2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import type { Empresa } from '@/types';

interface SetorComEmpresa {
  id: string;
  nome: string;
  empresa_id: string;
  ativo: boolean;
  created_at: string;
  empresa: { id: string; nome: string } | null;
}

export function SetoresPage() {
  const [setores, setSetores] = useState<SetorComEmpresa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaEmpresaId, setNovaEmpresaId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [saving, setSaving] = useState(false);
  const { empresasAcesso } = useAuth();
  const { canEdit } = usePermissions();

  const fetchSetores = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('setores')
      .select(`
        id, nome, empresa_id, ativo, created_at,
        empresa:empresas!setores_empresa_id_fkey(id, nome)
      `)
      .order('nome');

    if (filtroEmpresa) {
      query = query.eq('empresa_id', filtroEmpresa);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao carregar setores');
    } else {
      setSetores((data || []) as unknown as SetorComEmpresa[]);
    }
    setLoading(false);
  }, [filtroEmpresa]);

  useEffect(() => {
    setEmpresas(empresasAcesso);
  }, [empresasAcesso]);

  useEffect(() => { fetchSetores(); }, [fetchSetores]);

  const handleAdd = async () => {
    if (!novoNome.trim() || !novaEmpresaId) return;
    setSaving(true);
    const { error } = await supabase.from('setores').insert({
      nome: novoNome.trim(),
      empresa_id: novaEmpresaId,
    });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Setor já existe nesta empresa' : error.message);
    } else {
      toast.success('Setor cadastrado com sucesso');
      setNovoNome('');
      setNovaEmpresaId('');
      setShowAdd(false);
      fetchSetores();
    }
    setSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!editNome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('setores').update({ nome: editNome.trim() }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Setor atualizado');
      setEditingId(null);
      fetchSetores();
    }
    setSaving(false);
  };

  const toggleAtivo = async (setor: SetorComEmpresa) => {
    const { error } = await supabase
      .from('setores')
      .update({ ativo: !setor.ativo })
      .eq('id', setor.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(setor.ativo ? 'Setor desativado' : 'Setor reativado');
      fetchSetores();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Setores</h1>
          <p className="page-subtitle">Setores organizacionais vinculados às empresas</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="form-select w-48"
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={18} /> Novo Setor
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 mb-4 animate-slide-up">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Novo Setor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Empresa</label>
              <select
                className="form-select"
                value={novaEmpresaId}
                onChange={(e) => setNovaEmpresaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Nome do Setor</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Administrativo"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex items-end gap-2">
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !novoNome.trim() || !novaEmpresaId}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setNovoNome(''); setNovaEmpresaId(''); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Setor</th>
              <th>Empresa</th>
              <th>Status</th>
              <th>Criado em</th>
              {canEdit && <th className="text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {setores.map((setor) => (
              <tr key={setor.id}>
                <td>
                  {editingId === setor.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="form-input"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit(setor.id)}
                        autoFocus
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => handleEdit(setor.id)} disabled={saving}>Salvar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FolderTree size={16} className="text-primary-500" />
                      <span className="font-medium text-surface-900">{setor.nome}</span>
                    </div>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-sm text-surface-600">
                    <Building2 size={14} />
                    {setor.empresa?.nome || '-'}
                  </div>
                </td>
                <td>
                  <span className={`badge ${setor.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {setor.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-sm text-surface-500">
                  {new Date(setor.created_at).toLocaleDateString('pt-BR')}
                </td>
                {canEdit && (
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn btn-sm btn-ghost" title="Editar" onClick={() => { setEditingId(setor.id); setEditNome(setor.nome); }}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn btn-sm btn-ghost" title={setor.ativo ? 'Desativar' : 'Reativar'} onClick={() => toggleAtivo(setor)}>
                        <Power size={15} className={setor.ativo ? 'text-danger-500' : 'text-success-500'} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {setores.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4}>
                  <div className="empty-state py-8">
                    <FolderTree size={32} className="mb-2" />
                    <p className="text-sm">Nenhum setor encontrado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
