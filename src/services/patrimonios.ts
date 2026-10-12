import { supabase } from './supabase';
import type { FiltrosPatrimonio, ResultadoPaginado, PatrimonioCompleto } from '@/types';

export async function listarPatrimonios(
  filtros: FiltrosPatrimonio
): Promise<ResultadoPaginado<PatrimonioCompleto>> {
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
  estado_conservacao?: string;
  situacao_operacional?: string;
  responsavel_atual?: string | null;
  observacoes?: string | null;
}

export async function criarPatrimonio(params: CriarPatrimonioParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('patrimonios')
    .insert({ ...params, cadastrado_por: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const patrimonio = data as Record<string, unknown>;

  // Registrar movimentação de cadastro inicial
  await supabase.from('movimentacoes_patrimonio').insert({
    patrimonio_id: patrimonio.id,
    tipo: 'cadastro_inicial',
    empresa_destino_id: params.empresa_atual_id,
    setor_destino_id: params.setor_atual_id || null,
    localizacao_destino_id: params.localizacao_atual_id || null,
    usuario_id: user.id,
    motivo: 'Cadastro inicial do patrimônio',
    operacao_id: crypto.randomUUID(),
  });

  // Registrar auditoria
  await supabase.from('registros_auditoria').insert({
    tipo: 'patrimonio_criado',
    entidade_tipo: 'patrimonio',
    entidade_id: patrimonio.id as string,
    usuario_id: user.id,
    dados_novos: patrimonio,
    descricao: `Patrimônio ${params.codigo} cadastrado`,
  });

  return patrimonio;
}

export async function editarPatrimonio(id: string, params: Partial<CriarPatrimonioParams>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Buscar dados anteriores para auditoria
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
  const patrimonio = data as Record<string, unknown>;

  // Registrar auditoria
  await supabase.from('registros_auditoria').insert({
    tipo: 'patrimonio_editado',
    entidade_tipo: 'patrimonio',
    entidade_id: id,
    usuario_id: user.id,
    dados_anteriores: anterior as Record<string, unknown>,
    dados_novos: patrimonio,
    descricao: `Patrimônio ${patrimonio.codigo} editado`,
  });

  return patrimonio;
}

export async function desativarPatrimonio(id: string, motivo: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('patrimonios')
    .update({ status: 'desativado' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  const patrimonio = data as Record<string, unknown>;

  // Registrar movimentação de desativação
  await supabase.from('movimentacoes_patrimonio').insert({
    patrimonio_id: id,
    tipo: 'desativacao',
    empresa_origem_id: patrimonio.empresa_atual_id,
    setor_origem_id: patrimonio.setor_atual_id,
    usuario_id: user.id,
    motivo,
    operacao_id: crypto.randomUUID(),
  });

  // Registrar auditoria
  await supabase.from('registros_auditoria').insert({
    tipo: 'patrimonio_desativado',
    entidade_tipo: 'patrimonio',
    entidade_id: id,
    usuario_id: user.id,
    descricao: `Patrimônio ${patrimonio.codigo} desativado - Motivo: ${motivo}`,
  });

  return patrimonio;
}
