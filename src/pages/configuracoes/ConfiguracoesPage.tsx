import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  FolderTree,
  ShieldCheck,
  Plus,
  Pencil,
  Power,
  Search,
  Eye,
  FileText,
  Server,
  X,
  History,
} from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import type { CategoriaPatrimonio, RegistroAuditoria } from '@/types';

interface AuditoriaComPerfil extends RegistroAuditoria {
  usuario_nome?: string;
}

const tipoBadge: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-rose-100 text-rose-800 border-rose-200',
  TRANSFERENCIA: 'bg-purple-100 text-purple-800 border-purple-200',
  ESTORNO: 'bg-amber-100 text-amber-800 border-amber-200',
  PERMISSAO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  LOGIN: 'bg-surface-100 text-surface-800 border-surface-200',
  LOGOUT: 'bg-surface-100 text-surface-800 border-surface-200',
};

export function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<'categorias' | 'auditoria' | 'sistema'>('categorias');

  // Categorias
  const [categorias, setCategorias] = useState<CategoriaPatrimonio[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editCategoriaId, setEditCategoriaId] = useState<string | null>(null);
  const [nomeCategoria, setNomeCategoria] = useState('');
  const [descCategoria, setDescCategoria] = useState('');
  const [savingCategoria, setSavingCategoria] = useState(false);

  // Auditoria
  const [registros, setRegistros] = useState<AuditoriaComPerfil[]>([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [buscaAuditoria, setBuscaAuditoria] = useState('');
  const [detalheAuditoria, setDetalheAuditoria] = useState<AuditoriaComPerfil | null>(null);

  // Carregar Categorias
  const fetchCategorias = useCallback(async () => {
    setLoadingCategorias(true);
    const { data, error } = await supabase
      .from('categorias_patrimonio')
      .select('*')
      .order('nome');
    if (!error && data) {
      setCategorias(data as CategoriaPatrimonio[]);
    }
    setLoadingCategorias(false);
  }, []);

  // Carregar Auditoria
  const fetchAuditoria = useCallback(async () => {
    setLoadingAuditoria(true);
    let query = supabase
      .from('registros_auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filtroTipo) {
      query = query.eq('tipo', filtroTipo);
    }

    const { data, error } = await query;
    if (!error && data) {
      setRegistros(data as unknown as AuditoriaComPerfil[]);
    }
    setLoadingAuditoria(false);
  }, [filtroTipo]);

  useEffect(() => {
    if (abaAtiva === 'categorias') fetchCategorias();
    if (abaAtiva === 'auditoria') fetchAuditoria();
  }, [abaAtiva, fetchCategorias, fetchAuditoria]);

  // Salvar Categoria
  const handleSalvarCategoria = async () => {
    if (!nomeCategoria.trim()) {
      toast.error('Informe o nome da categoria');
      return;
    }

    setSavingCategoria(true);
    try {
      if (editCategoriaId) {
        const { error } = await supabase
          .from('categorias_patrimonio')
          .update({
            nome: nomeCategoria.trim(),
            descricao: descCategoria.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editCategoriaId);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('categorias_patrimonio')
          .insert({
            nome: nomeCategoria.trim(),
            descricao: descCategoria.trim() || null,
            ativo: true,
          });

        if (error) throw error;
        toast.success('Categoria criada com sucesso');
      }

      setShowCategoriaModal(false);
      setNomeCategoria('');
      setDescCategoria('');
      setEditCategoriaId(null);
      fetchCategorias();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar categoria');
    }
    setSavingCategoria(false);
  };

  // Alternar Status Categoria
  const handleToggleCategoriaStatus = async (cat: CategoriaPatrimonio) => {
    try {
      const { error } = await supabase
        .from('categorias_patrimonio')
        .update({ ativo: !cat.ativo, updated_at: new Date().toISOString() })
        .eq('id', cat.id);

      if (error) throw error;
      toast.success(`Categoria ${!cat.ativo ? 'ativada' : 'desativada'} com sucesso`);
      fetchCategorias();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    }
  };

  const abrirEdicaoCategoria = (cat: CategoriaPatrimonio) => {
    setEditCategoriaId(cat.id);
    setNomeCategoria(cat.nome);
    setDescCategoria(cat.descricao || '');
    setShowCategoriaModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="text-primary-600" />
            Configurações e Auditoria
          </h1>
          <p className="page-subtitle">
            Administração de categorias, logs imutáveis de auditoria e segurança do sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('categorias')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            abaAtiva === 'categorias'
              ? 'border-primary-600 text-primary-700 bg-white shadow-sm'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          <FolderTree size={16} />
          Categorias de Patrimônio
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('auditoria')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            abaAtiva === 'auditoria'
              ? 'border-primary-600 text-primary-700 bg-white shadow-sm'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          <History size={16} />
          Registros de Auditoria
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('sistema')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            abaAtiva === 'sistema'
              ? 'border-primary-600 text-primary-700 bg-white shadow-sm'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          <Server size={16} />
          Parâmetros do Sistema
        </button>
      </div>

      {/* ABA 1: CATEGORIAS */}
      {abaAtiva === 'categorias' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-500">
              Gerencie as classes de patrimônios organizacionais
            </p>
            <button
              type="button"
              onClick={() => {
                setEditCategoriaId(null);
                setNomeCategoria('');
                setDescCategoria('');
                setShowCategoriaModal(true);
              }}
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} /> Nova Categoria
            </button>
          </div>

          {loadingCategorias ? (
            <div className="flex items-center justify-center h-48">
              <div className="spinner w-8 h-8" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Status</th>
                    <th>Última Atualização</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat) => (
                    <tr key={cat.id}>
                      <td className="font-semibold text-surface-900">{cat.nome}</td>
                      <td className="text-surface-600 text-xs">{cat.descricao || '-'}</td>
                      <td>
                        <span className={`badge ${cat.ativo ? 'badge-success' : 'badge-danger'}`}>
                          {cat.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="text-xs text-surface-500">
                        {new Date(cat.updated_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            title="Editar"
                            onClick={() => abrirEdicaoCategoria(cat)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            title={cat.ativo ? 'Desativar' : 'Ativar'}
                            onClick={() => handleToggleCategoriaStatus(cat)}
                          >
                            <Power
                              size={15}
                              className={cat.ativo ? 'text-danger-500' : 'text-success-500'}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: REGISTROS DE AUDITORIA */}
      {abaAtiva === 'auditoria' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                />
                <input
                  type="text"
                  className="form-input pl-9"
                  placeholder="Filtrar logs por descrição..."
                  value={buscaAuditoria}
                  onChange={(e) => setBuscaAuditoria(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todas as operações</option>
                <option value="INSERT">INSERT (Criação)</option>
                <option value="UPDATE">UPDATE (Alteração)</option>
                <option value="DELETE">DELETE (Exclusão)</option>
                <option value="TRANSFERENCIA">TRANSFERÊNCIA</option>
                <option value="ESTORNO">ESTORNO</option>
                <option value="PERMISSAO">PERMISSÃO</option>
              </select>
            </div>
          </div>

          {loadingAuditoria ? (
            <div className="flex items-center justify-center h-48">
              <div className="spinner w-8 h-8" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Operação</th>
                    <th>Entidade</th>
                    <th>Descrição</th>
                    <th className="text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {registros
                    .filter(
                      (r) =>
                        !buscaAuditoria ||
                        (r.descricao &&
                          r.descricao.toLowerCase().includes(buscaAuditoria.toLowerCase()))
                    )
                    .map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-xs text-surface-600 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                              tipoBadge[r.tipo] || 'bg-surface-100 text-surface-700'
                            }`}
                          >
                            {r.tipo}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-surface-700 font-semibold">
                          {r.entidade_tipo}
                        </td>
                        <td className="text-xs text-surface-800 max-w-md truncate">
                          {r.descricao || '-'}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            title="Ver Payload JSON"
                            onClick={() => setDetalheAuditoria(r)}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {registros.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-surface-400">
                        Nenhum registro de auditoria encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: SISTEMA E SEGURANÇA */}
      {abaAtiva === 'sistema' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-base font-bold text-surface-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-success-600" />
              Arquitetura de Segurança e Conformidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                <span className="font-bold text-surface-900 block mb-1">
                  Row Level Security (RLS)
                </span>
                <p className="text-surface-600 leading-relaxed">
                  Todas as tabelas críticas (`patrimonios`, `movimentacoes_patrimonio`, `empresas`,
                  `setores`) possuem políticas RLS ativas no PostgreSQL, garantindo isolamento total por empresa.
                </p>
                <div className="mt-2 text-success-700 font-semibold flex items-center gap-1">
                  ✓ Políticas aplicadas e ativas no banco
                </div>
              </div>

              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                <span className="font-bold text-surface-900 block mb-1">
                  Transações e Concorrência Atômica
                </span>
                <p className="text-surface-600 leading-relaxed">
                  Transferências entre empresas são processadas via função PostgreSQL (`realizar_transferencia`)
                  com cláusula `SELECT FOR UPDATE` para evitar race conditions ou movimentações simultâneas.
                </p>
                <div className="mt-2 text-primary-700 font-semibold flex items-center gap-1">
                  ✓ RPC transacional imutável
                </div>
              </div>

              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                <span className="font-bold text-surface-900 block mb-1">
                  Empresas do Ecossistema
                </span>
                <p className="text-surface-600 leading-relaxed">
                  • <strong>Coopercar</strong><br />
                  • <strong>Coopercar Store</strong><br />
                  • <strong>Cooperauto</strong>
                </p>
              </div>

              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                <span className="font-bold text-surface-900 block mb-1">
                  Versão e Ambiente
                </span>
                <p className="text-surface-600 leading-relaxed">
                  • PatriControl v1.0.0 Enterprise<br />
                  • Frontend: React 19 + TypeScript + Vite 8<br />
                  • Backend: Supabase PostgreSQL (Auth + RPC)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Categoria */}
      {showCategoriaModal && (
        <>
          <div className="overlay" onClick={() => setShowCategoriaModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="card p-6 w-full max-w-md animate-slide-up shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-200">
                <h2 className="text-base font-bold text-surface-900">
                  {editCategoriaId ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCategoriaModal(false)}
                  className="p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Nome da Categoria *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Equipamentos de TI, Veículos..."
                    value={nomeCategoria}
                    onChange={(e) => setNomeCategoria(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Breve descrição dos itens abrangidos..."
                    value={descCategoria}
                    onChange={(e) => setDescCategoria(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setShowCategoriaModal(false)}
                  className="btn btn-secondary"
                  disabled={savingCategoria}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarCategoria}
                  className="btn btn-primary"
                  disabled={savingCategoria}
                >
                  {savingCategoria ? <div className="spinner w-4 h-4" /> : 'Salvar Categoria'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Detalhes Auditoria */}
      {detalheAuditoria && (
        <>
          <div className="overlay" onClick={() => setDetalheAuditoria(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="card p-6 w-full max-w-xl animate-slide-up shadow-2xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-surface-900">
                      Registro de Auditoria #{detalheAuditoria.id.slice(0, 8)}
                    </h2>
                    <p className="text-xs text-surface-500">
                      {new Date(detalheAuditoria.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalheAuditoria(null)}
                  className="p-1 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-surface-50 p-3 rounded-lg border border-surface-200">
                  <div>
                    <span className="text-surface-500 block">Operação:</span>
                    <span className="font-bold text-surface-900">{detalheAuditoria.tipo}</span>
                  </div>
                  <div>
                    <span className="text-surface-500 block">Tabela / Entidade:</span>
                    <span className="font-bold text-surface-900 font-mono">
                      {detalheAuditoria.entidade_tipo}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-surface-500 block">Descrição:</span>
                    <span className="font-medium text-surface-800">
                      {detalheAuditoria.descricao || '-'}
                    </span>
                  </div>
                </div>

                {detalheAuditoria.dados_anteriores && (
                  <div>
                    <h4 className="font-bold text-surface-700 mb-1">Dados Anteriores:</h4>
                    <pre className="bg-surface-900 text-surface-100 p-3 rounded-lg text-[11px] overflow-x-auto font-mono">
                      {JSON.stringify(detalheAuditoria.dados_anteriores, null, 2)}
                    </pre>
                  </div>
                )}

                {detalheAuditoria.dados_novos && (
                  <div>
                    <h4 className="font-bold text-surface-700 mb-1">Dados Novos / Atualizados:</h4>
                    <pre className="bg-surface-900 text-surface-100 p-3 rounded-lg text-[11px] overflow-x-auto font-mono">
                      {JSON.stringify(detalheAuditoria.dados_novos, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setDetalheAuditoria(null)}
                  className="btn btn-secondary"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
