import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ScanLine,
  ArrowRightLeft,
  Download,
  RotateCcw,
  Building2,
  FolderTree,
  Package,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { PatrimonioCompleto } from '@/types';

interface SetorItem {
  id: string;
  nome: string;
  empresa_id: string;
}

interface ItemConferido {
  patrimonio: PatrimonioCompleto;
  hora: string;
  tipo: 'correto' | 'divergente';
}

export function InventarioPage() {
  const { empresasAcesso } = useAuth();
  const navigate = useNavigate();

  // Seleção de Escopo
  const [empresaId, setEmpresaId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [setores, setSetores] = useState<SetorItem[]>([]);
  const [loadingSetores, setLoadingSetores] = useState(false);

  // Estado da Conferência
  const [emAndamento, setEmAndamento] = useState(false);
  const [loadingBens, setLoadingBens] = useState(false);
  const [bensEsperados, setBensEsperados] = useState<PatrimonioCompleto[]>([]);
  const [conferidos, setConferidos] = useState<ItemConferido[]>([]);
  const [divergentes, setDivergentes] = useState<ItemConferido[]>([]);
  const [inputCodigo, setInputCodigo] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'localizados' | 'divergentes'>('pendentes');

  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar setores quando a empresa mudar
  useEffect(() => {
    if (!empresaId) {
      setSetores([]);
      setSetorId('');
      return;
    }
    const loadSetores = async () => {
      setLoadingSetores(true);
      const { data } = await supabase
        .from('setores')
        .select('id, nome, empresa_id')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setSetores((data || []) as unknown as SetorItem[]);
      setLoadingSetores(false);
    };
    loadSetores();
  }, [empresaId]);

  // Iniciar Conferência
  const iniciarConferencia = async () => {
    if (!empresaId || !setorId) {
      toast.error('Selecione a empresa e o setor para iniciar a conferência');
      return;
    }

    setLoadingBens(true);
    try {
      const { data, error } = await supabase
        .from('patrimonios')
        .select(`
          *,
          empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(id, nome),
          setor_atual:setores!patrimonios_setor_atual_id_fkey(id, nome),
          categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(id, nome)
        `)
        .eq('empresa_atual_id', empresaId)
        .eq('setor_atual_id', setorId)
        .eq('status', 'ativo')
        .order('codigo');

      if (error) throw error;

      setBensEsperados((data || []) as unknown as PatrimonioCompleto[]);
      setConferidos([]);
      setDivergentes([]);
      setEmAndamento(true);
      toast.success(`Conferência iniciada! ${data?.length || 0} bens esperados neste setor.`);
      setTimeout(() => inputRef.current?.focus(), 150);
    } catch {
      toast.error('Erro ao carregar bens do setor');
    }
    setLoadingBens(false);
  };

  // Finalizar / Reiniciar
  const reiniciarConferencia = () => {
    if (confirm('Deseja realmente reiniciar esta conferência? Todos os registros bipados serão limpos.')) {
      setEmAndamento(false);
      setBensEsperados([]);
      setConferidos([]);
      setDivergentes([]);
      setInputCodigo('');
    }
  };

  // Processar Bipagem
  const processarCodigo = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codigoLimpo = inputCodigo.trim().toUpperCase();
    if (!codigoLimpo) return;

    setInputCodigo('');

    // Verificar se já foi bipado nesta sessão
    const jaConferido = conferidos.some((c) => c.patrimonio.codigo === codigoLimpo);
    const jaDivergente = divergentes.some((d) => d.patrimonio.codigo === codigoLimpo);

    if (jaConferido || jaDivergente) {
      toast.warning(`Patrimônio ${codigoLimpo} já foi bipado anteriormente!`);
      return;
    }

    // 1. Procurar na lista de bens esperados deste setor
    const encontradoLocal = bensEsperados.find((p) => p.codigo === codigoLimpo);
    const horaAgora = new Date().toLocaleTimeString('pt-BR');

    if (encontradoLocal) {
      setConferidos((prev) => [
        { patrimonio: encontradoLocal, hora: horaAgora, tipo: 'correto' },
        ...prev,
      ]);
      toast.success(`✓ ${encontradoLocal.codigo} localizado com sucesso!`);
      return;
    }

    // 2. Não pertence a este setor: buscar no banco geral
    try {
      const { data, error } = await supabase
        .from('patrimonios')
        .select(`
          *,
          empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(id, nome),
          setor_atual:setores!patrimonios_setor_atual_id_fkey(id, nome),
          categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(id, nome)
        `)
        .eq('codigo', codigoLimpo)
        .maybeSingle();

      if (error || !data) {
        toast.error(`Código ${codigoLimpo} não cadastrado no sistema!`);
        return;
      }

      const patriDivergente = data as unknown as PatrimonioCompleto;
      setDivergentes((prev) => [
        { patrimonio: patriDivergente, hora: horaAgora, tipo: 'divergente' },
        ...prev,
      ]);
      toast.error(
        `⚠️ DIVERGÊNCIA: ${codigoLimpo} pertence a ${patriDivergente.empresa_atual?.nome} / ${
          patriDivergente.setor_atual?.nome || 'Sem setor'
        }!`,
        { duration: 5000 }
      );
    } catch {
      toast.error('Erro ao verificar código');
    }
  }, [inputCodigo, conferidos, divergentes, bensEsperados]);

  // Cálculos
  const conferidosIds = new Set(conferidos.map((c) => c.patrimonio.id));
  const pendentes = bensEsperados.filter((p) => !conferidosIds.has(p.id));
  const totalEsperado = bensEsperados.length;
  const totalConferido = conferidos.length;
  const percentual = totalEsperado > 0 ? Math.round((totalConferido / totalEsperado) * 100) : 0;

  // Exportar Relatório CSV
  const exportarRelatorio = () => {
    const empresaNome = empresasAcesso.find((e) => e.id === empresaId)?.nome || 'Empresa';
    const setorNome = setores.find((s) => s.id === setorId)?.nome || 'Setor';

    let csv = `RELATORIO DE CONFERENCIA DE INVENTARIO FISICO\r\n`;
    csv += `Empresa:;${empresaNome}\r\n`;
    csv += `Setor:;${setorNome}\r\n`;
    csv += `Data:;${new Date().toLocaleString('pt-BR')}\r\n`;
    csv += `Total Esperado:;${totalEsperado}\r\n`;
    csv += `Localizados:;${totalConferido} (${percentual}%)\r\n`;
    csv += `Pendentes:;${pendentes.length}\r\n`;
    csv += `Divergentes Encontrados:;${divergentes.length}\r\n\r\n`;

    csv += `STATUS;CODIGO;NOME;CATEGORIA;EMPRESA_CADASTRO;SETOR_CADASTRO;HORA_BIP\r\n`;

    conferidos.forEach((c) => {
      csv += `LOCALIZADO;${c.patrimonio.codigo};"${c.patrimonio.nome}";"${c.patrimonio.categoria?.nome || ''}";"${c.patrimonio.empresa_atual?.nome || ''}";"${c.patrimonio.setor_atual?.nome || ''}";${c.hora}\r\n`;
    });

    pendentes.forEach((p) => {
      csv += `NAO_ENCONTRADO;${p.codigo};"${p.nome}";"${p.categoria?.nome || ''}";"${p.empresa_atual?.nome || ''}";"${p.setor_atual?.nome || ''}";-\r\n`;
    });

    divergentes.forEach((d) => {
      csv += `DIVERGENTE;${d.patrimonio.codigo};"${d.patrimonio.nome}";"${d.patrimonio.categoria?.nome || ''}";"${d.patrimonio.empresa_atual?.nome || ''}";"${d.patrimonio.setor_atual?.nome || ''}";${d.hora}\r\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_${setorNome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Relatório CSV exportado com sucesso!');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="text-primary-600" />
            Conferência de Inventário Físico
          </h1>
          <p className="page-subtitle">
            Auditoria física em tempo real por setor com leitor de código de barras ou QR Code
          </p>
        </div>

        {emAndamento && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportarRelatorio}
              className="btn btn-secondary flex items-center gap-1.5"
            >
              <Download size={16} /> Exportar Relatório
            </button>
            <button
              type="button"
              onClick={reiniciarConferencia}
              className="btn btn-secondary text-danger-600 flex items-center gap-1.5"
            >
              <RotateCcw size={16} /> Reiniciar
            </button>
          </div>
        )}
      </div>

      {/* Seletor de Escopo se NÃO estiver em andamento */}
      {!emAndamento ? (
        <div className="card p-6 max-w-2xl mx-auto my-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-200">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <ScanLine size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">
                Iniciar Nova Auditoria Setorial
              </h2>
              <p className="text-xs text-surface-500">
                Selecione o setor físico a ser conferido para carregar os bens cadastrados
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Empresa *</label>
              <select
                className="form-select"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                <option value="">Selecione uma empresa...</option>
                {empresasAcesso.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Setor Físico *</label>
              <select
                className="form-select"
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                disabled={!empresaId || loadingSetores}
              >
                <option value="">
                  {loadingSetores ? 'Carregando setores...' : 'Selecione um setor...'}
                </option>
                {setores.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={iniciarConferencia}
                disabled={!empresaId || !setorId || loadingBens}
                className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
              >
                {loadingBens ? (
                  <div className="spinner w-5 h-5" />
                ) : (
                  <ClipboardCheck size={20} />
                )}
                Iniciar Conferência
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Painel da Conferência em Andamento */
        <div className="space-y-6">
          {/* Card de Bipagem Rápida */}
          <div className="card p-5 bg-gradient-to-r from-primary-900 to-primary-950 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ScanLine size={28} className="text-primary-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-primary-200 text-xs font-semibold uppercase tracking-wider">
                    <Building2 size={14} />
                    {empresasAcesso.find((e) => e.id === empresaId)?.nome}
                    <span>•</span>
                    <FolderTree size={14} />
                    {setores.find((s) => s.id === setorId)?.nome}
                  </div>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    Terminal de Leitura Rápida
                  </h2>
                </div>
              </div>

              {/* Input com leitor de código */}
              <form onSubmit={processarCodigo} className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputCodigo}
                    onChange={(e) => setInputCodigo(e.target.value)}
                    placeholder="Bipar ou digitar código (ex: PAT-001) + ENTER"
                    className="w-full bg-white/10 border-2 border-primary-400/50 rounded-xl px-4 py-3 text-white placeholder-primary-200/60 font-mono font-bold text-lg focus:outline-none focus:border-white focus:bg-white/20 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-500 hover:bg-primary-400 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  >
                    Bipar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Métricas e Barra de Progresso */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between text-surface-500 text-xs font-medium mb-1">
                <span>Total Esperado</span>
                <Package size={16} />
              </div>
              <div className="text-2xl font-black text-surface-900">{totalEsperado}</div>
              <p className="text-[11px] text-surface-400 mt-1">Bens ativos neste setor</p>
            </div>

            <div className="card p-4 border-l-4 border-success-500">
              <div className="flex items-center justify-between text-success-600 text-xs font-medium mb-1">
                <span>Localizados</span>
                <CheckCircle2 size={16} />
              </div>
              <div className="text-2xl font-black text-success-600">{totalConferido}</div>
              <p className="text-[11px] text-surface-500 mt-1">{percentual}% conferido</p>
            </div>

            <div className="card p-4 border-l-4 border-surface-300">
              <div className="flex items-center justify-between text-surface-500 text-xs font-medium mb-1">
                <span>Pendentes</span>
                <Clock size={16} />
              </div>
              <div className="text-2xl font-black text-surface-700">{pendentes.length}</div>
              <p className="text-[11px] text-surface-400 mt-1">Ainda não bipados</p>
            </div>

            <div className="card p-4 border-l-4 border-danger-500">
              <div className="flex items-center justify-between text-danger-600 text-xs font-medium mb-1">
                <span>Divergentes</span>
                <AlertTriangle size={16} />
              </div>
              <div className="text-2xl font-black text-danger-600">{divergentes.length}</div>
              <p className="text-[11px] text-danger-500 mt-1">Pertencem a outro local</p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="card p-4">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="text-surface-700">Progresso da Conferência Física</span>
              <span className="text-primary-700 font-bold">{percentual}% Concluído</span>
            </div>
            <div className="w-full bg-surface-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>

          {/* Abas e Tabela */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-surface-200 bg-surface-50 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setAbaAtiva('pendentes')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
                  abaAtiva === 'pendentes'
                    ? 'border-primary-600 text-primary-700 bg-white shadow-sm'
                    : 'border-transparent text-surface-500 hover:text-surface-800'
                }`}
              >
                <Clock size={14} />
                Bens Pendentes ({pendentes.length})
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('localizados')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
                  abaAtiva === 'localizados'
                    ? 'border-success-600 text-success-700 bg-white shadow-sm'
                    : 'border-transparent text-surface-500 hover:text-surface-800'
                }`}
              >
                <CheckCircle2 size={14} />
                Localizados ({conferidos.length})
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('divergentes')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
                  abaAtiva === 'divergentes'
                    ? 'border-danger-600 text-danger-700 bg-white shadow-sm'
                    : 'border-transparent text-surface-500 hover:text-surface-800'
                }`}
              >
                <AlertTriangle size={14} />
                Divergentes ({divergentes.length})
              </button>
            </div>

            {/* Conteúdo da Tabela */}
            <div className="overflow-x-auto">
              {abaAtiva === 'pendentes' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome do Bem</th>
                      <th>Categoria</th>
                      <th>Responsável</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono font-bold text-primary-600">{p.codigo}</td>
                        <td className="font-medium text-surface-900">{p.nome}</td>
                        <td>{p.categoria?.nome || '-'}</td>
                        <td>{p.responsavel_atual || '-'}</td>
                        <td className="capitalize">{p.estado_conservacao}</td>
                      </tr>
                    ))}
                    {pendentes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-success-600 font-semibold">
                          🎉 Parabéns! Todos os bens cadastrados foram localizados!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {abaAtiva === 'localizados' && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hora do Bip</th>
                      <th>Código</th>
                      <th>Nome do Bem</th>
                      <th>Categoria</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conferidos.map((c) => (
                      <tr key={c.patrimonio.id}>
                        <td className="font-mono text-xs text-surface-500">{c.hora}</td>
                        <td className="font-mono font-bold text-success-600">
                          {c.patrimonio.codigo}
                        </td>
                        <td className="font-medium text-surface-900">{c.patrimonio.nome}</td>
                        <td>{c.patrimonio.categoria?.nome || '-'}</td>
                        <td>
                          <span className="badge badge-success">Localizado</span>
                        </td>
                      </tr>
                    ))}
                    {conferidos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-surface-400">
                          Nenhum bem bipado ainda. Use o leitor de código de barras acima.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {abaAtiva === 'divergentes' && (
                <div>
                  <div className="p-3 bg-danger-50 border-b border-danger-200 text-danger-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle size={15} />
                      Atenção: A leitura do código não altera a localização automaticamente.
                      Para regularizar, inicie uma transferência autorizada.
                    </span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Código</th>
                        <th>Nome do Bem</th>
                        <th>Cadastro Atual</th>
                        <th>Ação de Regularização</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divergentes.map((d) => (
                        <tr key={d.patrimonio.id}>
                          <td className="font-mono text-xs text-surface-500">{d.hora}</td>
                          <td className="font-mono font-bold text-danger-600">
                            {d.patrimonio.codigo}
                          </td>
                          <td className="font-medium text-surface-900">{d.patrimonio.nome}</td>
                          <td className="text-xs">
                            <div className="font-semibold text-surface-800">
                              {d.patrimonio.empresa_atual?.nome}
                            </div>
                            <div className="text-surface-500">
                              {d.patrimonio.setor_atual?.nome || 'Sem setor'}
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                navigate('/movimentacoes', {
                                  state: { preselectPatrimonio: d.patrimonio },
                                })
                              }
                              className="btn btn-sm btn-primary flex items-center gap-1"
                            >
                              <ArrowRightLeft size={14} /> Regularizar Localização
                            </button>
                          </td>
                        </tr>
                      ))}
                      {divergentes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-surface-400">
                            Nenhuma divergência encontrada até o momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
