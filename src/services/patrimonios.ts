import { supabase, isSupabaseConfigured } from './supabase';
import { mockPatrimoniosList, MOCK_EMPRESAS, MOCK_SETORES, MOCK_CATEGORIAS } from './mockData';
import type {
  FiltrosPatrimonio,
  ResultadoPaginado,
  PatrimonioCompleto,
  EstadoConservacao,
  SituacaoOperacional,
} from '@/types';

export async function listarPatrimonios(
  filtros: FiltrosPatrimonio
): Promise<ResultadoPaginado<PatrimonioCompleto>> {
  if (!isSupabaseConfigured) {
    let items = [...mockPatrimoniosList];
    if (filtros.busca) {
      const b = filtros.busca.toLowerCase();
      items = items.filter(
        p =>
          p.codigo.toLowerCase().includes(b) ||
          p.nome.toLowerCase().includes(b) ||
          (p.marca && p.marca.toLowerCase().includes(b))
      );
    }
    if (filtros.empresa_id) items = items.filter(p => p.empresa_atual_id === filtros.empresa_id);
    if (filtros.setor_id) items = items.filter(p => p.setor_atual_id === filtros.setor_id);
    if (filtros.categoria_id) items = items.filter(p => p.categoria_id === filtros.categoria_id);
    if (filtros.status) items = items.filter(p => p.status === filtros.status);

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

  const { pagina, por_pagina, busca, empresa_id, setor_id, categoria_id, status, estado_conservacao, situacao_operacional } = filtros;
  const offset = (pagina - 1) * por_pagina;

  let query = supabase
    .from('patrimonios')
    .select(`
      *,
      empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(id, nome),
      setor_atual:setores!patrimonios_setor_atual_id_fkey(id, nome),
      localizacao_atual:localizacoes!patrimonios_localizacao_atual_id_fkey(id, nome),
      categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(id, nome)
    `, { count: 'exact' });

  if (busca) {
    query = query.or(`codigo.ilike.%${busca}%,nome.ilike.%${busca}%,marca.ilike.%${busca}%,modelo.ilike.%${busca}%`);
  }
  if (empresa_id) query = query.eq('empresa_atual_id', empresa_id);
  if (setor_id) query = query.eq('setor_atual_id', setor_id);
  if (categoria_id) query = query.eq('categoria_id', categoria_id);
  if (status) query = query.eq('status', status);
  if (estado_conservacao) query = query.eq('estado_conservacao', estado_conservacao);
  if (situacao_operacional) query = query.eq('situacao_operacional', situacao_operacional);

  query = query.order('created_at', { ascending: false }).range(offset, offset + por_pagina - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    dados: (data || []) as unknown as PatrimonioCompleto[],
    total: count || 0,
    pagina,
    por_pagina,
    total_paginas: Math.ceil((count || 0) / por_pagina),
  };
}

export async function buscarPatrimonio(id: string): Promise<PatrimonioCompleto> {
  if (!isSupabaseConfigured) {
    const item = mockPatrimoniosList.find(p => p.id === id);
    if (!item) throw new Error('Patrimônio não encontrado');
    return item;
  }

  const { data, error } = await supabase
    .from('patrimonios')
    .select(`
      *,
      empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(*),
      setor_atual:setores!patrimonios_setor_atual_id_fkey(*),
      localizacao_atual:localizacoes!patrimonios_localizacao_atual_id_fkey(*),
      categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as PatrimonioCompleto;
}

export async function obterPatrimonioPorCodigo(codigo: string): Promise<PatrimonioCompleto | null> {
  if (!isSupabaseConfigured) {
    const item = mockPatrimoniosList.find(p => p.codigo.toUpperCase() === codigo.trim().toUpperCase());
    return item || null;
  }

  const { data, error } = await supabase
    .from('patrimonios')
    .select(`
      *,
      empresa_atual:empresas!patrimonios_empresa_atual_id_fkey(*),
      setor_atual:setores!patrimonios_setor_atual_id_fkey(*),
      localizacao_atual:localizacoes!patrimonios_localizacao_atual_id_fkey(*),
      categoria:categorias_patrimonio!patrimonios_categoria_id_fkey(*)
    `)
    .ilike('codigo', codigo.trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as unknown as PatrimonioCompleto) : null;
}

interface CriarPatrimonioParams {
  codigo: string;
  nome: string;
  categoria_id: string;
  empresa_atual_id: string;
  setor_atual_id?: string | null;
  localizacao_atual_id?: string | null;
  descricao?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  data_aquisicao?: string | null;
  valor_aquisicao?: number | null;
  estado_conservacao?: EstadoConservacao;
  situacao_operacional?: SituacaoOperacional;
  responsavel_atual?: string | null;
  observacoes?: string | null;
}

export async function criarPatrimonio(params: CriarPatrimonioParams): Promise<PatrimonioCompleto> {
  if (!isSupabaseConfigured) {
    const emp = MOCK_EMPRESAS.find(e => e.id === params.empresa_atual_id);
    const set = MOCK_SETORES.find(s => s.id === params.setor_atual_id);
    const cat = MOCK_CATEGORIAS.find(c => c.id === params.categoria_id);

    const novo: PatrimonioCompleto = {
      id: `pat-${Date.now()}`,
      codigo: params.codigo,
      nome: params.nome,
      categoria_id: params.categoria_id,
      empresa_atual_id: params.empresa_atual_id,
      setor_atual_id: params.setor_atual_id || null,
      localizacao_atual_id: null,
      descricao: params.descricao || null,
      marca: params.marca || null,
      modelo: params.modelo || null,
      numero_serie: params.numero_serie || null,
      data_aquisicao: params.data_aquisicao || null,
      valor_aquisicao: params.valor_aquisicao || null,
      estado_conservacao: (params.estado_conservacao as PatrimonioCompleto['estado_conservacao']) || 'bom',
      situacao_operacional: (params.situacao_operacional as PatrimonioCompleto['situacao_operacional']) || 'disponivel',
      responsavel_atual: params.responsavel_atual || null,
      observacoes: params.observacoes || null,
      cadastrado_por: '00000000-0000-0000-0000-000000000001',
      status: 'ativo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      empresa_atual: emp,
      setor_atual: set,
      categoria: cat,
    };
    mockPatrimoniosList.unshift(novo);
    return novo;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('patrimonios')
    .insert({
      ...params,
      cadastrado_por: userData.user.id,
      status: 'ativo',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('registros_auditoria').insert({
    tipo: 'INSERT',
    entidade_tipo: 'patrimonios',
    entidade_id: data.id,
    usuario_id: userData.user.id,
    dados_novos: params,
    descricao: `Patrimônio ${params.codigo} (${params.nome}) cadastrado`,
  });

  return data as unknown as PatrimonioCompleto;
}

export async function editarPatrimonio(
  id: string,
  params: Partial<CriarPatrimonioParams>
): Promise<PatrimonioCompleto> {
  if (!isSupabaseConfigured) {
    const idx = mockPatrimoniosList.findIndex(p => p.id === id);
    if (idx >= 0) {
      mockPatrimoniosList[idx] = {
        ...mockPatrimoniosList[idx],
        ...params,
        updated_at: new Date().toISOString(),
      } as unknown as PatrimonioCompleto;
      return mockPatrimoniosList[idx];
    }
  }

  const { data: anterior } = await supabase
    .from('patrimonios')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('patrimonios')
    .update(params)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    await supabase.from('registros_auditoria').insert({
      tipo: 'UPDATE',
      entidade_tipo: 'patrimonios',
      entidade_id: id,
      usuario_id: userData.user.id,
      dados_anteriores: anterior,
      dados_novos: params,
      descricao: `Patrimônio ${data.codigo} atualizado`,
    });
  }

  return data as unknown as PatrimonioCompleto;
}

export async function desativarPatrimonio(id: string, motivo: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const p = mockPatrimoniosList.find(i => i.id === id);
    if (p) p.status = 'desativado';
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Usuário não autenticado');

  const { data: anterior } = await supabase
    .from('patrimonios')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('patrimonios')
    .update({ status: 'desativado' })
    .eq('id', id);

  if (error) throw new Error(error.message);

  await supabase.from('registros_auditoria').insert({
    tipo: 'DELETE',
    entidade_tipo: 'patrimonios',
    entidade_id: id,
    usuario_id: userData.user.id,
    dados_anteriores: anterior,
    dados_novos: { status: 'desativado', motivo },
    descricao: `Patrimônio ${anterior?.codigo} desativado. Motivo: ${motivo}`,
  });
}
