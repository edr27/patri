import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Pencil, Power } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import type { Empresa } from '@/types';

export function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [saving, setSaving] = useState(false);
  const { isAdmin } = usePermissions();

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar empresas');
    } else {
      setEmpresas(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  const handleAdd = async () => {
    if (!novoNome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('empresas').insert({ nome: novoNome.trim() });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Empresa cadastrada com sucesso');
      setNovoNome('');
      setShowAdd(false);
      fetchEmpresas();
    }
    setSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!editNome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('empresas').update({ nome: editNome.trim() }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Empresa atualizada');
      setEditingId(null);
      fetchEmpresas();
    }
    setSaving(false);
  };

  const toggleAtivo = async (empresa: Empresa) => {
    const { error } = await supabase
      .from('empresas')
      .update({ ativo: !empresa.ativo })
      .eq('id', empresa.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(empresa.ativo ? 'Empresa desativada' : 'Empresa reativada');
      fetchEmpresas();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">Gerenciamento das empresas do grupo</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Nova Empresa
          </button>
        )}
      </div>

      {/* Formulário de adição */}
      {showAdd && (
        <div className="card p-4 mb-4 animate-slide-up">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Nova Empresa</h3>
          <div className="flex gap-3">
            <input
              type="text"
              className="form-input flex-1"
              placeholder="Nome da empresa"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !novoNome.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setNovoNome(''); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Criada em</th>
              {isAdmin && <th className="text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {empresas.map((empresa) => (
              <tr key={empresa.id}>
                <td>
                  {editingId === empresa.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="form-input"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit(empresa.id)}
                        autoFocus
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => handleEdit(empresa.id)} disabled={saving}>
                        Salvar
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-primary-500" />
                      <span className="font-medium text-surface-900">{empresa.nome}</span>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${empresa.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {empresa.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="text-sm text-surface-500">
                  {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                </td>
                {isAdmin && (
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn btn-sm btn-ghost"
                        title="Editar"
                        onClick={() => { setEditingId(empresa.id); setEditNome(empresa.nome); }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        title={empresa.ativo ? 'Desativar' : 'Reativar'}
                        onClick={() => toggleAtivo(empresa)}
                      >
                        <Power size={15} className={empresa.ativo ? 'text-danger-500' : 'text-success-500'} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3}>
                  <div className="empty-state py-8">
                    <Building2 size={32} className="mb-2" />
                    <p className="text-sm">Nenhuma empresa cadastrada</p>
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
