// ============================================================================
// Tipos da aplicação (Application Types)
// Tipos derivados e de UI que estendem os tipos do banco
// ============================================================================

import type { Database, UserRole, PatrimonioStatus, EstadoConservacao, SituacaoOperacional, TipoMovimentacao } from './database';

// Aliases para tipos de tabela
export type Empresa = Database['public']['Tables']['empresas']['Row'];
export type Setor = Database['public']['Tables']['setores']['Row'];
export type Localizacao = Database['public']['Tables']['localizacoes']['Row'];
export type CategoriaPatrimonio = Database['public']['Tables']['categorias_patrimonio']['Row'];
export type Patrimonio = Database['public']['Tables']['patrimonios']['Row'];
export type MovimentacaoPatrimonio = Database['public']['Tables']['movimentacoes_patrimonio']['Row'];
export type PerfilUsuario = Database['public']['Tables']['perfis_usuario']['Row'];
export type AcessoEmpresa = Database['public']['Tables']['acessos_empresa']['Row'];
export type RegistroAuditoria = Database['public']['Tables']['registros_auditoria']['Row'];

// Patrimônio com dados de relacionamento expandidos
export interface PatrimonioCompleto extends Patrimonio {
  empresa_atual?: Empresa;
  setor_atual?: Setor;
  localizacao_atual?: Localizacao;
  categoria?: CategoriaPatrimonio;
}

// Movimentação com dados expandidos
export interface MovimentacaoCompleta extends MovimentacaoPatrimonio {
  patrimonio?: Patrimonio;
  empresa_origem?: Empresa;
  empresa_destino?: Empresa;
  setor_origem?: Setor;
  setor_destino?: Setor;
  localizacao_origem?: Localizacao;
  localizacao_destino?: Localizacao;
  usuario?: PerfilUsuario;
}

// Setor com empresa expandida
export interface SetorCompleto extends Setor {
  empresa?: Empresa;
}

// Localização com setor expandido
export interface LocalizacaoCompleta extends Localizacao {
  setor?: SetorCompleto;
}

// Perfil de usuário com acessos
export interface PerfilUsuarioCompleto extends PerfilUsuario {
  acessos_empresa?: AcessoEmpresa[];
  empresas?: Empresa[];
}

// Contexto do usuário autenticado
export interface AuthUser {
  id: string;
  email: string;
  perfil: PerfilUsuario;
  empresas_acesso: Empresa[];
}

// Form types para transferências
export interface TransferenciaForm {
  patrimonio_id: string;
  empresa_destino_id: string;
  setor_destino_id: string | null;
  localizacao_destino_id: string | null;
  responsavel_entrega: string | null;
  responsavel_recebimento: string | null;
  motivo: string;
  observacoes: string | null;
}

// Filtros de busca
export interface FiltrosPatrimonio {
  busca?: string;
  empresa_id?: string;
  setor_id?: string;
  categoria_id?: string;
  status?: PatrimonioStatus;
  estado_conservacao?: EstadoConservacao;
  situacao_operacional?: SituacaoOperacional;
  pagina: number;
  por_pagina: number;
}

export interface FiltrosMovimentacao {
  busca?: string;
  patrimonio_id?: string;
  empresa_id?: string;
  tipo?: TipoMovimentacao;
  data_inicio?: string;
  data_fim?: string;
  pagina: number;
  por_pagina: number;
}

// Resultado paginado
export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

// Dashboard stats
export interface DashboardStats {
  total_patrimonios: number;
  patrimonios_ativos: number;
  patrimonios_desativados: number;
  patrimonios_sem_localizacao: number;
  por_empresa: { empresa_id: string; empresa_nome: string; quantidade: number }[];
  por_categoria: { categoria_id: string; categoria_nome: string; quantidade: number }[];
  por_estado: { estado: EstadoConservacao; quantidade: number }[];
  movimentacoes_recentes: MovimentacaoCompleta[];
}

// Re-export enums
export type { UserRole, PatrimonioStatus, EstadoConservacao, SituacaoOperacional, TipoMovimentacao };
