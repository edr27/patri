import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Shield,
  Pencil,
  Check,
  X,
  UserPlus,
  Building2,
} from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Empresa, UserRole } from '@/types';

interface PerfilComAcessos {
  id: string;
  user_id: string;
  nome_completo: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
  empresas_ids: string[];
}

const roleBadge: Record<UserRole, string> = {
  ADMINISTRADOR: 'bg-purple-100 text-purple-800 border-purple-200',
  OPERADOR: 'bg-blue-100 text-blue-800 border-blue-200',
  VISUALIZADOR: 'bg-surface-100 text-surface-800 border-surface-200',
};

const roleDescricao: Record<UserRole, string> = {
  ADMINISTRADOR: 'Acesso total: gerencia usuários, configurações, patrimônios e transferências.',
  OPERADOR: 'Operacional: cadastra bens, realiza transferências e consulta relatórios.',
  VISUALIZADOR: 'Somente leitura: visualiza patrimônios, inventário e relatórios.',
};

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<PerfilComAcessos[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState<string>('');

  // Modais
  const [editUser, setEditUser] = useState<PerfilComAcessos | null>(null);
  const [showNovoUserModal, setShowNovoUserModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form de edição
  const [editNome, setEditNome] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('OPERADOR');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editEmpresas, setEditEmpresas] = useState<string[]>([]);

  // Carregar dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfisRes, acessosRes, empresasRes] = await Promise.all([
        supabase.from('perfis_usuario').select('*').order('nome_completo'),
        supabase.from('acessos_empresa').select('user_id, empresa_id'),
        supabase.from('empresas').select('*').eq('ativo', true).order('nome'),
      ]);

      const acessosMap = new Map<string, string[]>();
      (acessosRes.data || []).forEach((acesso: { user_id: string; empresa_id: string }) => {
        const list = acessosMap.get(acesso.user_id) || [];
        list.push(acesso.empresa_id);
        acessosMap.set(acesso.user_id, list);
      });

      const listPerfis: PerfilComAcessos[] = (perfisRes.data || []).map((p: {
        id: string;
        user_id: string;
        nome_completo: string;
        role: UserRole;
        ativo: boolean;
        created_at: string;
      }) => ({
        ...p,
        empresas_ids: acessosMap.get(p.user_id) || [],
      }));

      setUsuarios(listPerfis);
      setEmpresas((empresasRes.data || []) as Empresa[]);
    } catch {
      toast.error('Erro ao carregar lista de usuários');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Abrir Modal de Edição
  const abrirEdicao = (u: PerfilComAcessos) => {
    setEditUser(u);
    setEditNome(u.nome_completo);
    setEditRole(u.role);
    setEditAtivo(u.ativo);
    setEditEmpresas([...u.empresas_ids]);
  };

  // Toggle empresa selecionada
  const toggleEmpresa = (id: string) => {
    setEditEmpresas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Salvar alterações
  const handleSalvarEdicao = async () => {
    if (!editUser) return;
    if (!editNome.trim()) {
      toast.error('O nome completo é obrigatório');
      return;
    }
    if (editEmpresas.length === 0) {
      toast.error('Selecione pelo menos uma empresa autorizada para o usuário');
      return;
    }

    setSaving(true);
    try {
      // 1. Atualizar perfil
      const { error: perfilErr } = await supabase
        .from('perfis_usuario')
        .update({
          nome_completo: editNome.trim(),
          role: editRole,
          ativo: editAtivo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editUser.id);

      if (perfilErr) throw perfilErr;

      // 2. Sincronizar acessos por empresa
      // Remover acessos anteriores
      await supabase.from('acessos_empresa').delete().eq('user_id', editUser.user_id);

      // Inserir novos acessos
      const novosAcessos = editEmpresas.map((empId) => ({
        user_id: editUser.user_id,
        empresa_id: empId,
      }));

      const { error: acessosErr } = await supabase.from('acessos_empresa').insert(novosAcessos);
      if (acessosErr) throw acessosErr;

      // 3. Auditoria
      await supabase.from('registros_auditoria').insert({
        tipo: 'PERMISSAO',
        entidade_tipo: 'perfis_usuario',
        entidade_id: editUser.id,
        usuario_id: currentUser?.id,
        dados_anteriores: { role: editUser.role, empresas: editUser.empresas_ids },
        dados_novos: { role: editRole, empresas: editEmpresas },
        descricao: `Permissões de ${editNome} atualizadas para ${editRole}`,
      });

      toast.success('Usuário e permissões atualizados com sucesso!');
      setEditUser(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar alterações');
    }
    setSaving(false);
  };

  // Filtros
  const usuariosFiltrados = usuarios.filter((u) => {
    const matchBusca =
      !busca ||
      u.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      u.user_id.toLowerCase().includes(busca.toLowerCase());
    const matchRole = !filtroRole || u.role === filtroRole;
    return matchBusca && matchRole;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="text-primary-600" />
            Controle de Usuários e Permissões
          </h1>
          <p className="page-subtitle">
            Gerenciamento de acessos multiempresa e perfis de segurança (RBAC)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNovoUserModal(true)}
          className="btn btn-primary flex items-center gap-1.5"
        >
          <UserPlus size={18} /> Provisionar / Convidar Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="text"
              className="form-input pl-9"
              placeholder="Buscar usuário por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
          >
            <option value="">Todos os perfis</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="OPERADOR">Operador</option>
            <option value="VISUALIZADOR">Visualizador</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="spinner w-8 h-8" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome Completo</th>
                  <th>Perfil de Acesso</th>
                  <th>Empresas Autorizadas</th>
                  <th>Status</th>
                  <th>Criado Em</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const empresasDoUsuario = empresas.filter((emp) =>
                    u.empresas_ids.includes(emp.id)
                  );

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="font-semibold text-surface-900">{u.nome_completo}</div>
                        <div className="font-mono text-[10px] text-surface-400 truncate max-w-xs">
                          UID: {u.user_id}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            roleBadge[u.role]
                          }`}
                        >
                          <Shield size={12} className="mr-1" />
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {empresasDoUsuario.map((emp) => (
                            <span
                              key={emp.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-surface-100 text-surface-700 border border-surface-200"
                            >
                              <Building2 size={11} className="text-surface-400" />
                              {emp.nome}
                            </span>
                          ))}
                          {empresasDoUsuario.length === 0 && (
                            <span className="text-xs text-danger-500 font-medium">
                              Sem empresas vinculadas
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${u.ativo ? 'badge-success' : 'badge-danger'}`}
                        >
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="text-xs text-surface-500">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          title="Editar perfil e permissões"
                          onClick={() => abrirEdicao(u)}
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state py-12">
                        <Users size={36} className="mb-3" />
                        <p className="text-sm font-medium">Nenhum usuário encontrado</p>
                        <p className="text-xs mt-1">Ajuste os filtros de pesquisa</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edição de Usuário e Acessos */}
      {editUser && (
        <>
          <div className="overlay" onClick={() => setEditUser(null)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
            <div
              className="card p-6 w-full max-w-xl mb-8 animate-slide-up shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">Editar Permissões</h2>
                    <p className="text-xs text-surface-500">
                      Alteração de perfil e controle de acesso por empresa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Perfil de Acesso (Role) *</label>
                  <select
                    className="form-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                  >
                    <option value="ADMINISTRADOR">ADMINISTRADOR - Gestão Total</option>
                    <option value="OPERADOR">OPERADOR - Movimentações e Patrimônios</option>
                    <option value="VISUALIZADOR">VISUALIZADOR - Apenas Leitura</option>
                  </select>
                  <p className="text-xs text-surface-500 mt-1.5 bg-surface-50 p-2 rounded border border-surface-200">
                    {roleDescricao[editRole]}
                  </p>
                </div>

                <div>
                  <label className="form-label">Status da Conta</label>
                  <div className="flex items-center gap-3 mt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="ativo"
                        checked={editAtivo}
                        onChange={() => setEditAtivo(true)}
                        className="text-primary-600"
                      />
                      <span>Ativo</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="ativo"
                        checked={!editAtivo}
                        onChange={() => setEditAtivo(false)}
                        className="text-danger-600"
                      />
                      <span>Inativo (Bloquear Acesso)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label">Empresas Autorizadas *</label>
                  <p className="text-xs text-surface-500 mb-2">
                    O usuário só conseguirá visualizar e interagir com patrimônios das empresas selecionadas:
                  </p>
                  <div className="space-y-2 bg-surface-50 p-3 rounded-lg border border-surface-200">
                    {empresas.map((emp) => {
                      const isSelected = editEmpresas.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-50/60 border-primary-300 text-primary-950 font-semibold'
                              : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEmpresa(emp.id)}
                              className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span>{emp.nome}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-primary-600" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarEdicao}
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? <div className="spinner w-4 h-4" /> : 'Salvar Permissões'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Instruções de Provisionamento */}
      {showNovoUserModal && (
        <>
          <div className="overlay" onClick={() => setShowNovoUserModal(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
            <div
              className="card p-6 w-full max-w-xl mb-8 animate-slide-up shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">
                      Provisionamento Seguro de Usuários
                    </h2>
                    <p className="text-xs text-surface-500">
                      Instruções de segurança conforme arquitetura Supabase Auth + RLS
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNovoUserModal(false)}
                  className="p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs text-surface-700 leading-relaxed">
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg flex gap-2">
                  <Shield size={18} className="text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-primary-900 block font-semibold">
                      Política de Segurança Corporativa:
                    </strong>
                    Nenhuma credencial ou cadastro administrativo direto é exposto publicamente no
                    frontend. Novos usuários devem ser convidados no Supabase Authentication e vinculados
                    a uma empresa.
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-surface-900 text-sm mb-1">
                    Passo 1: Criar Usuário no Supabase Auth
                  </h3>
                  <p>
                    Acesse o painel do Supabase → <strong>Authentication</strong> → <strong>Users</strong> →{' '}
                    <strong>Add User</strong> (Create user com e-mail e senha inicial, ou Invite user por e-mail).
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-surface-900 text-sm mb-1">
                    Passo 2: Atribuir Perfil e Empresas no SQL Editor
                  </h3>
                  <p className="mb-2">
                    Copie o UID gerado para o novo usuário e execute o script SQL abaixo:
                  </p>
                  <div className="bg-surface-900 text-surface-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto relative">
                    <code>{`-- 1. Inserir Perfil (ADMINISTRADOR, OPERADOR ou VISUALIZADOR)
INSERT INTO perfis_usuario (user_id, nome_completo, role)
VALUES ('COLE_O_UID_DO_USUARIO_AQUI', 'Nome do Colaborador', 'OPERADOR');

-- 2. Atribuir Acesso às Empresas (ex: todas ou selecionadas)
INSERT INTO acessos_empresa (user_id, empresa_id)
SELECT 'COLE_O_UID_DO_USUARIO_AQUI', id FROM empresas;`}</code>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-surface-900 text-sm mb-1">
                    Passo 3: Gerenciar pelo Sistema
                  </h3>
                  <p>
                    Assim que criado, o colaborador aparecerá imediatamente nesta tabela, onde você
                    poderá trocar de perfil ou ajustar empresas a qualquer momento!
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setShowNovoUserModal(false)}
                  className="btn btn-primary"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
