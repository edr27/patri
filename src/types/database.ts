// ============================================================================
// Tipos do banco de dados (Database Types)
// Gerados manualmente a partir do schema SQL.
// Em produção, use `supabase gen types typescript` para gerar automaticamente.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'ADMINISTRADOR' | 'OPERADOR' | 'VISUALIZADOR';

export type PatrimonioStatus = 'ativo' | 'desativado' | 'arquivado';

export type EstadoConservacao =
  | 'novo'
  | 'bom'
  | 'regular'
  | 'ruim'
  | 'inservivel';

export type SituacaoOperacional =
  | 'em_uso'
  | 'disponivel'
  | 'em_manutencao'
  | 'emprestado'
  | 'reservado';

export type TipoMovimentacao =
  | 'transferencia_setor'
  | 'transferencia_empresa'
  | 'cadastro_inicial'
  | 'estorno'
  | 'correcao'
  | 'desativacao'
  | 'reativacao';

export type TipoAuditoria =
  | 'patrimonio_criado'
  | 'patrimonio_editado'
  | 'patrimonio_desativado'
  | 'patrimonio_reativado'
  | 'transferencia_realizada'
  | 'transferencia_estornada'
  | 'empresa_criada'
  | 'empresa_editada'
  | 'setor_criado'
  | 'setor_editado'
  | 'setor_desativado'
  | 'categoria_criada'
  | 'categoria_editada'
  | 'usuario_perfil_alterado'
  | 'acesso_empresa_concedido'
  | 'acesso_empresa_revogado'
  | 'localizacao_criada'
  | 'localizacao_editada';

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ativo?: boolean;
          updated_at?: string;
        };
      };
      setores: {
        Row: {
          id: string;
          nome: string;
          empresa_id: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          empresa_id: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          empresa_id?: string;
          ativo?: boolean;
          updated_at?: string;
        };
      };
      localizacoes: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          setor_id: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          setor_id: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          setor_id?: string;
          ativo?: boolean;
          updated_at?: string;
        };
      };
      categorias_patrimonio: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          ativo?: boolean;
          updated_at?: string;
        };
      };
      patrimonios: {
        Row: {
          id: string;
          codigo: string;
          nome: string;
          categoria_id: string;
          descricao: string | null;
          marca: string | null;
          modelo: string | null;
          numero_serie: string | null;
          data_aquisicao: string | null;
          valor_aquisicao: number | null;
          estado_conservacao: EstadoConservacao;
          situacao_operacional: SituacaoOperacional;
          empresa_atual_id: string;
          setor_atual_id: string | null;
          localizacao_atual_id: string | null;
          responsavel_atual: string | null;
          observacoes: string | null;
          cadastrado_por: string;
          status: PatrimonioStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          nome: string;
          categoria_id: string;
          descricao?: string | null;
          marca?: string | null;
          modelo?: string | null;
          numero_serie?: string | null;
          data_aquisicao?: string | null;
          valor_aquisicao?: number | null;
          estado_conservacao?: EstadoConservacao;
          situacao_operacional?: SituacaoOperacional;
          empresa_atual_id: string;
          setor_atual_id?: string | null;
          localizacao_atual_id?: string | null;
          responsavel_atual?: string | null;
          observacoes?: string | null;
          cadastrado_por: string;
          status?: PatrimonioStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          nome?: string;
          categoria_id?: string;
          descricao?: string | null;
          marca?: string | null;
          modelo?: string | null;
          numero_serie?: string | null;
          data_aquisicao?: string | null;
          valor_aquisicao?: number | null;
          estado_conservacao?: EstadoConservacao;
          situacao_operacional?: SituacaoOperacional;
          empresa_atual_id?: string;
          setor_atual_id?: string | null;
          localizacao_atual_id?: string | null;
          responsavel_atual?: string | null;
          observacoes?: string | null;
          status?: PatrimonioStatus;
          updated_at?: string;
        };
      };
      movimentacoes_patrimonio: {
        Row: {
          id: string;
          patrimonio_id: string;
          tipo: TipoMovimentacao;
          empresa_origem_id: string | null;
          setor_origem_id: string | null;
          localizacao_origem_id: string | null;
          empresa_destino_id: string | null;
          setor_destino_id: string | null;
          localizacao_destino_id: string | null;
          usuario_id: string;
          responsavel_entrega: string | null;
          responsavel_recebimento: string | null;
          motivo: string | null;
          observacoes: string | null;
          operacao_id: string;
          movimentacao_referencia_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patrimonio_id: string;
          tipo: TipoMovimentacao;
          empresa_origem_id?: string | null;
          setor_origem_id?: string | null;
          localizacao_origem_id?: string | null;
          empresa_destino_id?: string | null;
          setor_destino_id?: string | null;
          localizacao_destino_id?: string | null;
          usuario_id: string;
          responsavel_entrega?: string | null;
          responsavel_recebimento?: string | null;
          motivo?: string | null;
          observacoes?: string | null;
          operacao_id?: string;
          movimentacao_referencia_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>; // Histórico imutável - não permitir updates
      };
      perfis_usuario: {
        Row: {
          id: string;
          user_id: string;
          nome_completo: string;
          role: UserRole;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome_completo: string;
          role?: UserRole;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome_completo?: string;
          role?: UserRole;
          ativo?: boolean;
          updated_at?: string;
        };
      };
      acessos_empresa: {
        Row: {
          id: string;
          user_id: string;
          empresa_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          empresa_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      registros_auditoria: {
        Row: {
          id: string;
          tipo: TipoAuditoria;
          entidade_tipo: string;
          entidade_id: string;
          usuario_id: string;
          dados_anteriores: Json | null;
          dados_novos: Json | null;
          descricao: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tipo: TipoAuditoria;
          entidade_tipo: string;
          entidade_id: string;
          usuario_id: string;
          dados_anteriores?: Json | null;
          dados_novos?: Json | null;
          descricao?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>; // Auditoria imutável
      };
    };
    Functions: {
      realizar_transferencia: {
        Args: {
          p_patrimonio_id: string;
          p_empresa_destino_id: string;
          p_setor_destino_id: string | null;
          p_localizacao_destino_id: string | null;
          p_responsavel_entrega: string | null;
          p_responsavel_recebimento: string | null;
          p_motivo: string;
          p_observacoes: string | null;
        };
        Returns: Json;
      };
      estornar_transferencia: {
        Args: {
          p_movimentacao_id: string;
          p_motivo: string;
        };
        Returns: Json;
      };
      obter_dashboard_stats: {
        Args: {
          p_empresa_id?: string | null;
        };
        Returns: Json;
      };
    };
  };
}
