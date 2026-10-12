import { useEffect, useState, useCallback } from 'react';
import { ArrowRightLeft, Search, ChevronLeft, ChevronRight, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { realizarTransferencia, listarMovimentacoes } from '@/services/movimentacoes';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { mockPatrimoniosList, MOCK_SETORES } from '@/services/mockData';
import { toast } from 'sonner';
import type { MovimentacaoCompleta, FiltrosMovimentacao, PatrimonioCompleto } from '@/types';

interface SetorSimples { id: string; nome: string; empresa_id: string }

const tipoLabels: Record<string, string> = {
  transferencia_setor: 'Transferência de Setor',
  transferencia_empresa: 'Transferência de Empresa',
  cadastro_inicial: 'Cadastro Inicial',
  estorno: 'Estorno',
  correcao: 'Correção',
  desativacao: 'Desativação',
  reativacao: 'Reativação',
};
const tipoBadge: Record<string, string> = {
  transferencia_setor: 'badge-info',
  transferencia_empresa: 'badge-warning',
  cadastro_inicial: 'badge-success',
  estorno: 'badge-danger',
  correcao: 'badge-default',
  desativacao: 'badge-danger',
  reativacao: 'badge-success',
};

export function MovimentacoesPage() {
  const { empresasAcesso } = useAuth();
  const { canTransfer } = usePermissions();
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCompleta[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosMovimentacao>({ pagina: 1, por_pagina: 20 });

  // Transfer wizard
  const [showTransfer, setShowTransfer] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Transfer form
  const [patrimonios, setPatrimonios] = useState<PatrimonioCompleto[]>([]);
  const [searchPat, setSearchPat] = useState('');
  const [selectedPat, setSelectedPat] = useState<PatrimonioCompleto | null>(null);
  const [setores, setSetores] = useState<SetorSimples[]>([]);
  const [empresaDestinoId, setEmpresaDestinoId] = useState('');
  const [setorDestinoId, setSetorDestinoId] = useState('');
  const [responsavelEntrega, setResponsavelEntrega] = useState('');
  const [responsavelRecebimento, setResponsavelRecebimento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const fetchMovimentacoes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listarMovimentacoes(filtros);
      setMovimentacoes(result.dados);
      setTotal(result.total);
      setTotalPaginas(result.total_paginas);
    } catch {
      toast.error('Erro ao carregar movimentações');
    }
    setLoading(false);
  }, [filtros]);

  useEffect(() => { fetchMovimentacoes(); }, [fetchMovimentacoes]);

  // Buscar patrimônios para seleção
  const searchPatrimonios = async (busca: string) => {
    if (!busca.trim()) { setPatrimonios([]); return; }

    if (!isSupabaseConfigured) {
      const b = busca.toLowerCase();
      const filtered = mockPatrimoniosList.filter(
        p => p.status === 'ativo' && (p.codigo.toLowerCase().includes(b) || p.nome.toLowerCase().includes(b))
      ).slice(0, 10);
      setPatrimonios(filtered);
      return;
    }

    const { data } = await supabase
      .from('patrimonios')
      .select(`
        *,
        empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(id, nome),
        setor_atual:setores!patrimonios_setor_atual_id_fkey(id, nome)
      `)
      .eq('status', 'ativo')
      .or(`codigo.ilike.%${busca}%,nome.ilike.%${busca}%`)
      .limit(10);
    setPatrimonios((data || []) as unknown as PatrimonioCompleto[]);
  };

  const fetchSetores = async () => {
    if (!isSupabaseConfigured) {
      setSetores(MOCK_SETORES as unknown as SetorSimples[]);
      return;
    }
    const { data } = await supabase.from('setores').select('id, nome, empresa_id').eq('ativo', true).order('nome');
    setSetores((data || []) as unknown as SetorSimples[]);
  };

  useEffect(() => { fetchSetores(); }, []);

  const setoresDestino = empresaDestinoId ? setores.filter(s => s.empresa_id === empresaDestinoId) : [];

  const resetTransfer = () => {
    setSelectedPat(null);
    setSearchPat('');
    setEmpresaDestinoId('');
    setSetorDestinoId('');
    setResponsavelEntrega('');
    setResponsavelRecebimento('');
    setMotivo('');
    setObservacoes('');
    setStep(1);
    setShowTransfer(false);
  };

  const handleTransfer = async () => {
    if (!selectedPat || !empresaDestinoId || !motivo.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await realizarTransferencia({
        patrimonio_id: selectedPat.id,
        empresa_destino_id: empresaDestinoId,
        setor_destino_id: setorDestinoId || null,
        localizacao_destino_id: null,
        responsavel_entrega: responsavelEntrega || null,
        responsavel_recebimento: responsavelRecebimento || null,
        motivo: motivo.trim(),
        observacoes: observacoes || null,
      });
      toast.success('Transferência realizada com sucesso!');
      resetTransfer();
      fetchMovimentacoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na transferência');
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Movimentações</h1>
          <p className="page-subtitle">Transferências e histórico de movimentações</p>
        </div>
        {canTransfer && (
          <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
            <ArrowRightLeft size={18} /> Nova Transferência
          </button>
        )}
      </div>

      {/* Wizard de transferência */}
      {showTransfer && (
        <>
          <div className="overlay" onClick={resetTransfer} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
            <div className="card p-6 w-full max-w-2xl mb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-surface-900 mb-1">Nova Transferência</h2>
              <p className="text-sm text-surface-500 mb-4">Etapa {step} de 3</p>

              {/* Steps indicator */}
              <div className="flex gap-1 mb-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary-500' : 'bg-surface-200'}`} />
                ))}
              </div>

              {/* Step 1: Selecionar patrimônio */}
              {step === 1 && (
                <div>
                  <label className="form-label">Buscar Patrimônio</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                      className="form-input pl-9"
                      placeholder="Digite o código ou nome do patrimônio..."
                      value={searchPat}
                      onChange={(e) => { setSearchPat(e.target.value); searchPatrimonios(e.target.value); }}
                      autoFocus
                    />
                  </div>
                  {patrimonios.length > 0 && !selectedPat && (
                    <div className="mt-2 border border-surface-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      {patrimonios.map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-4 py-3 hover:bg-surface-50 border-b border-surface-100 last:border-0 transition-colors"
                          onClick={() => { setSelectedPat(p); setPatrimonios([]); }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono text-sm font-medium text-primary-600">{p.codigo}</span>
                              <span className="mx-2 text-surface-300">·</span>
                              <span className="font-medium text-surface-900">{p.nome}</span>
                            </div>
                          </div>
                          <p className="text-xs text-surface-400 mt-0.5">
                            {p.empresa_atual?.nome}{p.setor_atual?.nome && ` / ${p.setor_atual.nome}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedPat && (
                    <div className="mt-3 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-surface-900">
                            <span className="font-mono text-primary-600">{selectedPat.codigo}</span> — {selectedPat.nome}
                          </p>
                          <p className="text-sm text-surface-500 mt-0.5">
                            Localização atual: {selectedPat.empresa_atual?.nome}{selectedPat.setor_atual?.nome && ` / ${selectedPat.setor_atual.nome}`}
                          </p>
                        </div>
                        <button className="btn btn-sm btn-ghost" onClick={() => setSelectedPat(null)}>Alterar</button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end mt-6">
                    <button className="btn btn-primary" disabled={!selectedPat} onClick={() => setStep(2)}>
                      Próximo <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Destino */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Empresa de Destino *</label>
                      <select className="form-select" value={empresaDestinoId} onChange={(e) => { setEmpresaDestinoId(e.target.value); setSetorDestinoId(''); }}>
                        <option value="">Selecione...</option>
                        {empresasAcesso.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Setor de Destino</label>
                      <select className="form-select" value={setorDestinoId} onChange={(e) => setSetorDestinoId(e.target.value)} disabled={!empresaDestinoId}>
                        <option value="">Selecione...</option>
                        {setoresDestino.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Responsável pela Entrega</label>
                      <input className="form-input" placeholder="Nome" value={responsavelEntrega} onChange={(e) => setResponsavelEntrega(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Responsável pelo Recebimento</label>
                      <input className="form-input" placeholder="Nome" value={responsavelRecebimento} onChange={(e) => setResponsavelRecebimento(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Motivo da Transferência *</label>
                    <textarea className="form-input" rows={2} placeholder="Descreva o motivo..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Observações</label>
                    <textarea className="form-input" rows={2} placeholder="Observações adicionais..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                  </div>
                  <div className="flex justify-between mt-4">
                    <button className="btn btn-secondary" onClick={() => setStep(1)}>Voltar</button>
                    <button className="btn btn-primary" disabled={!empresaDestinoId || !motivo.trim()} onClick={() => setStep(3)}>
                      Próximo <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmação */}
              {step === 3 && selectedPat && (
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 mb-3">Resumo da Transferência</h3>
                  <div className="bg-surface-50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Origem</p>
                        <p className="font-medium">{selectedPat.empresa_atual?.nome}</p>
                        <p className="text-surface-500">{selectedPat.setor_atual?.nome || 'Sem setor'}</p>
                      </div>
                      <ArrowRight size={20} className="text-primary-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Destino</p>
                        <p className="font-medium">{empresasAcesso.find(e => e.id === empresaDestinoId)?.nome}</p>
                        <p className="text-surface-500">{setores.find(s => s.id === setorDestinoId)?.nome || 'Sem setor'}</p>
                      </div>
                    </div>
                    <hr className="border-surface-200" />
                    <div>
                      <span className="text-surface-500">Patrimônio:</span>
                      <span className="ml-1 font-medium">{selectedPat.codigo} — {selectedPat.nome}</span>
                    </div>
                    <div>
                      <span className="text-surface-500">Motivo:</span>
                      <span className="ml-1">{motivo}</span>
                    </div>
                    {responsavelEntrega && <div><span className="text-surface-500">Entrega:</span> <span className="ml-1">{responsavelEntrega}</span></div>}
                    {responsavelRecebimento && <div><span className="text-surface-500">Recebimento:</span> <span className="ml-1">{responsavelRecebimento}</span></div>}
                    {observacoes && <div><span className="text-surface-500">Obs:</span> <span className="ml-1">{observacoes}</span></div>}
                  </div>
                  <div className="flex justify-between mt-6">
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>Voltar</button>
                    <button className="btn btn-primary" onClick={handleTransfer} disabled={saving}>
                      {saving ? (
                        <><Loader2 size={16} className="animate-spin" /> Processando...</>
                      ) : (
                        <><CheckCircle2 size={16} /> Confirmar Transferência</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select className="form-select" value={filtros.empresa_id || ''} onChange={(e) => setFiltros(f => ({ ...f, empresa_id: e.target.value || undefined, pagina: 1 }))}>
            <option value="">Todas as empresas</option>
            {empresasAcesso.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select className="form-select" value={filtros.tipo || ''} onChange={(e) => setFiltros(f => ({ ...f, tipo: (e.target.value || undefined) as FiltrosMovimentacao['tipo'], pagina: 1 }))}>
            <option value="">Todos os tipos</option>
            {Object.entries(tipoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" className="form-input" value={filtros.data_inicio || ''} onChange={(e) => setFiltros(f => ({ ...f, data_inicio: e.target.value || undefined, pagina: 1 }))} />
          <input type="date" className="form-input" value={filtros.data_fim || ''} onChange={(e) => setFiltros(f => ({ ...f, data_fim: e.target.value || undefined, pagina: 1 }))} />
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="spinner w-8 h-8" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patrimônio</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Motivo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map(mov => (
                  <tr key={mov.id}>
                    <td>
                      <span className="font-mono text-sm font-medium text-primary-600">{mov.patrimonio?.codigo || '-'}</span>
                      <p className="text-xs text-surface-400">{mov.patrimonio?.nome}</p>
                    </td>
                    <td><span className={`badge ${tipoBadge[mov.tipo] || 'badge-default'}`}>{tipoLabels[mov.tipo] || mov.tipo}</span></td>
                    <td className="text-sm">
                      {mov.empresa_origem?.nome || '-'}
                      {mov.setor_origem?.nome && <span className="text-surface-400"> / {mov.setor_origem.nome}</span>}
                    </td>
                    <td className="text-sm">
                      {mov.empresa_destino?.nome || '-'}
                      {mov.setor_destino?.nome && <span className="text-surface-400"> / {mov.setor_destino.nome}</span>}
                    </td>
                    <td className="text-sm text-surface-500 max-w-[200px] truncate">{mov.motivo || '-'}</td>
                    <td className="text-sm text-surface-500 whitespace-nowrap">
                      {new Date(mov.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {movimentacoes.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state py-12">
                        <ArrowRightLeft size={36} className="mb-3" />
                        <p className="text-sm font-medium">Nenhuma movimentação encontrada</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
              <p className="text-sm text-surface-500">Página {filtros.pagina} de {totalPaginas} · {total} registros</p>
              <div className="flex gap-1">
                <button className="btn btn-sm btn-secondary" disabled={filtros.pagina <= 1} onClick={() => setFiltros(f => ({ ...f, pagina: f.pagina - 1 }))}><ChevronLeft size={16} /></button>
                <button className="btn btn-sm btn-secondary" disabled={filtros.pagina >= totalPaginas} onClick={() => setFiltros(f => ({ ...f, pagina: f.pagina + 1 }))}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
