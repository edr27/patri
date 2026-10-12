import { supabase, isSupabaseConfigured } from './supabase';
import {
  mockMovimentacoesList,
  mockPatrimoniosList,
  MOCK_EMPRESAS,
  MOCK_SETORES,
} from './mockData';
import type { TransferenciaForm, FiltrosMovimentacao, ResultadoPaginado, MovimentacaoCompleta } from '@/types';

export async function realizarTransferencia(params: TransferenciaForm) {
  if (!isSupabaseConfigured) {
    const patri = mockPatrimoniosList.find(p => p.id === params.patrimonio_id);
    if (!patri) throw new Error('Patrimônio não encontrado');

    const empDest = MOCK_EMPRESAS.find(e => e.id === params.empresa_destino_id);
    const setDest = MOCK_SETORES.find(s => s.id === params.setor_destino_id);

    const empOrigId = patri.empresa_atual_id;
    const setOrigId = patri.setor_atual_id;
    const empOrig = patri.empresa_atual;
    const setOrig = patri.setor_atual;

    const tipo = empOrigId !== params.empresa_destino_id ? 'transferencia_empresa' : 'transferencia_setor';

    // Atualizar patrimônio
    patri.empresa_atual_id = params.empresa_destino_id;
    patri.setor_atual_id = params.setor_destino_id;
    patri.empresa_atual = empDest;
    patri.setor_atual = setDest;
    patri.updated_at = new Date().toISOString();

    // Registrar histórico
    const novaMov: MovimentacaoCompleta = {
      id: `mov-${Date.now()}`,
      operacao_id: `op-${Date.now()}`,
      patrimonio_id: params.patrimonio_id,
      tipo,
      empresa_origem_id: empOrigId,
      setor_origem_id: setOrigId,
      localizacao_origem_id: null,
      empresa_destino_id: params.empresa_destino_id,
      setor_destino_id: params.setor_destino_id,
      localizacao_destino_id: null,
      usuario_id: '00000000-0000-0000-0000-000000000001',
      responsavel_entrega: params.responsavel_entrega,
      responsavel_recebimento: params.responsavel_recebimento,
      motivo: params.motivo,
      observacoes: params.observacoes,
      movimentacao_referencia_id: null,
      created_at: new Date().toISOString(),
      patrimonio: patri,
      empresa_origem: empOrig,
      empresa_destino: empDest,
      setor_origem: setOrig,
      setor_destino: setDest,
    };
    mockMovimentacoesList.unshift(novaMov);

    return { success: true, mensagem: 'Transferência concluída com sucesso!' };
  }

  const { data, error } = await supabase.rpc('realizar_transferencia', {
    p_patrimonio_id: params.patrimonio_id,
    p_empresa_destino_id: params.empresa_destino_id,
    p_setor_destino_id: params.setor_destino_id,
    p_localizacao_destino_id: params.localizacao_destino_id,
    p_responsavel_entrega: params.responsavel_entrega,
    p_responsavel_recebimento: params.responsavel_recebimento,
    p_motivo: params.motivo,
    p_observacoes: params.observacoes,
  });

  if (error) throw new Error(error.message);

  const result = data as { success: boolean; error?: string; mensagem?: string };
  if (!result.success) {
    throw new Error(result.error || 'Erro desconhecido na transferência');
  }

  return result;
}

export async function estornarTransferencia(movimentacaoId: string, motivo: string) {
  if (!isSupabaseConfigured) {
    return { success: true, mensagem: 'Estorno registrado com sucesso (Demo)' };
  }

  const { data, error } = await supabase.rpc('estornar_transferencia', {
    p_movimentacao_id: movimentacaoId,
    p_motivo: motivo,
  });

  if (error) throw new Error(error.message);

  const result = data as { success: boolean; error?: string; mensagem?: string };
  if (!result.success) {
    throw new Error(result.error || 'Erro desconhecido no estorno');
  }

  return result;
}

export async function listarMovimentacoes(
  filtros: FiltrosMovimentacao
): Promise<ResultadoPaginado<MovimentacaoCompleta>> {
  if (!isSupabaseConfigured) {
    let items = [...mockMovimentacoesList];
    if (filtros.patrimonio_id) items = items.filter(m => m.patrimonio_id === filtros.patrimonio_id);
    if (filtros.empresa_id) {
      items = items.filter(
        m => m.empresa_origem_id === filtros.empresa_id || m.empresa_destino_id === filtros.empresa_id
      );
    }
    if (filtros.tipo) items = items.filter(m => m.tipo === filtros.tipo);

    const total = items.length;
    const offset = (filtros.pagina - 1) * filtros.por_pagina;
    const paginados = items.slice(offset, offset + filtros.por_pagina);

    return {
      dados: paginados,
      total,
      pagina: filtros.pagina,
      por_pagina: filtros.por_pagina,
      total_paginas: Math.ceil(total / filtros.por_pagina) || 1,
    };
  }

  const { pagina, por_pagina, patrimonio_id, empresa_id, tipo, data_inicio, data_fim } = filtros;
  const offset = (pagina - 1) * por_pagina;

  let query = supabase
    .from('movimentacoes_patrimonio')
    .select(`
      *,
      patrimonio:patrimonios!movimentacoes_patrimonio_patrimonio_id_fkey(id, codigo, nome),
      empresa_origem:empresas!movimentacoes_patrimonio_empresa_origem_id_fkey(id, nome),
      empresa_destino:empresas!movimentacoes_patrimonio_empresa_destino_id_fkey(id, nome),
      setor_origem:setores!movimentacoes_patrimonio_setor_origem_id_fkey(id, nome),
      setor_destino:setores!movimentacoes_patrimonio_setor_destino_id_fkey(id, nome),
      localizacao_origem:localizacoes!movimentacoes_patrimonio_localizacao_origem_id_fkey(id, nome),
      localizacao_destino:localizacoes!movimentacoes_patrimonio_localizacao_destino_id_fkey(id, nome)
    `, { count: 'exact' });

  if (patrimonio_id) query = query.eq('patrimonio_id', patrimonio_id);
  if (empresa_id) {
    query = query.or(`empresa_origem_id.eq.${empresa_id},empresa_destino_id.eq.${empresa_id}`);
  }
  if (tipo) query = query.eq('tipo', tipo);
  if (data_inicio) query = query.gte('created_at', data_inicio);
  if (data_fim) query = query.lte('created_at', data_fim + 'T23:59:59');

  query = query.order('created_at', { ascending: false }).range(offset, offset + por_pagina - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    dados: (data || []) as unknown as MovimentacaoCompleta[],
    total: count || 0,
    pagina,
    por_pagina,
    total_paginas: Math.ceil((count || 0) / por_pagina),
  };
}
