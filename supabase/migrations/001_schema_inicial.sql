-- ============================================================================
-- MIGRAÇÃO 001: Schema Completo do Sistema Patrimonial
-- PatriControl - Sistema de Gestão Patrimonial Multiempresa
-- 
-- IMPORTANTE: Execute esta migração no Supabase SQL Editor ou via CLI.
-- Todas as tabelas incluem RLS habilitado.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('ADMINISTRADOR', 'OPERADOR', 'VISUALIZADOR');

CREATE TYPE patrimonio_status AS ENUM ('ativo', 'desativado', 'arquivado');

CREATE TYPE estado_conservacao AS ENUM ('novo', 'bom', 'regular', 'ruim', 'inservivel');

CREATE TYPE situacao_operacional AS ENUM ('em_uso', 'disponivel', 'em_manutencao', 'emprestado', 'reservado');

CREATE TYPE tipo_movimentacao AS ENUM (
  'transferencia_setor',
  'transferencia_empresa',
  'cadastro_inicial',
  'estorno',
  'correcao',
  'desativacao',
  'reativacao'
);

CREATE TYPE tipo_auditoria AS ENUM (
  'patrimonio_criado',
  'patrimonio_editado',
  'patrimonio_desativado',
  'patrimonio_reativado',
  'transferencia_realizada',
  'transferencia_estornada',
  'empresa_criada',
  'empresa_editada',
  'setor_criado',
  'setor_editado',
  'setor_desativado',
  'categoria_criada',
  'categoria_editada',
  'usuario_perfil_alterado',
  'acesso_empresa_concedido',
  'acesso_empresa_revogado',
  'localizacao_criada',
  'localizacao_editada'
);

-- ============================================================================
-- 3. TABELAS
-- ============================================================================

-- 3.1 EMPRESAS
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_empresas_ativo ON empresas (ativo);

-- 3.2 SETORES
CREATE TABLE setores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

CREATE INDEX idx_setores_empresa ON setores (empresa_id);
CREATE INDEX idx_setores_ativo ON setores (ativo);

-- 3.3 LOCALIZAÇÕES (detalhamento físico dentro de setores)
CREATE TABLE localizacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  setor_id UUID NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (setor_id, nome)
);

CREATE INDEX idx_localizacoes_setor ON localizacoes (setor_id);

-- 3.4 CATEGORIAS DE PATRIMÔNIO
CREATE TABLE categorias_patrimonio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 PERFIS DE USUÁRIO (vinculado ao auth.users do Supabase)
CREATE TABLE perfis_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'VISUALIZADOR',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_perfis_user_id ON perfis_usuario (user_id);
CREATE INDEX idx_perfis_role ON perfis_usuario (role);

-- 3.6 ACESSOS POR EMPRESA
CREATE TABLE acessos_empresa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id)
);

CREATE INDEX idx_acessos_user ON acessos_empresa (user_id);
CREATE INDEX idx_acessos_empresa ON acessos_empresa (empresa_id);

-- 3.7 PATRIMÔNIOS
CREATE TABLE patrimonios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES categorias_patrimonio(id) ON DELETE RESTRICT,
  descricao TEXT,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  data_aquisicao DATE,
  valor_aquisicao NUMERIC(15, 2),
  estado_conservacao estado_conservacao NOT NULL DEFAULT 'bom',
  situacao_operacional situacao_operacional NOT NULL DEFAULT 'disponivel',
  empresa_atual_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  setor_atual_id UUID REFERENCES setores(id) ON DELETE SET NULL,
  localizacao_atual_id UUID REFERENCES localizacoes(id) ON DELETE SET NULL,
  responsavel_atual TEXT,
  observacoes TEXT,
  cadastrado_por UUID NOT NULL REFERENCES auth.users(id),
  status patrimonio_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patrimonios_empresa ON patrimonios (empresa_atual_id);
CREATE INDEX idx_patrimonios_setor ON patrimonios (setor_atual_id);
CREATE INDEX idx_patrimonios_categoria ON patrimonios (categoria_id);
CREATE INDEX idx_patrimonios_status ON patrimonios (status);
CREATE INDEX idx_patrimonios_codigo ON patrimonios (codigo);
-- Índice para busca textual
CREATE INDEX idx_patrimonios_nome_busca ON patrimonios USING gin (to_tsvector('portuguese', nome));

-- 3.8 MOVIMENTAÇÕES DE PATRIMÔNIO (histórico imutável)
CREATE TABLE movimentacoes_patrimonio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patrimonio_id UUID NOT NULL REFERENCES patrimonios(id) ON DELETE RESTRICT,
  tipo tipo_movimentacao NOT NULL,
  empresa_origem_id UUID REFERENCES empresas(id),
  setor_origem_id UUID REFERENCES setores(id),
  localizacao_origem_id UUID REFERENCES localizacoes(id),
  empresa_destino_id UUID REFERENCES empresas(id),
  setor_destino_id UUID REFERENCES setores(id),
  localizacao_destino_id UUID REFERENCES localizacoes(id),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  responsavel_entrega TEXT,
  responsavel_recebimento TEXT,
  motivo TEXT,
  observacoes TEXT,
  operacao_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  movimentacao_referencia_id UUID REFERENCES movimentacoes_patrimonio(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentacoes_patrimonio ON movimentacoes_patrimonio (patrimonio_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_patrimonio (created_at DESC);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes_patrimonio (tipo);
CREATE INDEX idx_movimentacoes_operacao ON movimentacoes_patrimonio (operacao_id);
CREATE INDEX idx_movimentacoes_empresa_origem ON movimentacoes_patrimonio (empresa_origem_id);
CREATE INDEX idx_movimentacoes_empresa_destino ON movimentacoes_patrimonio (empresa_destino_id);

-- 3.9 REGISTROS DE AUDITORIA (imutável)
CREATE TABLE registros_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo tipo_auditoria NOT NULL,
  entidade_tipo TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  dados_anteriores JSONB,
  dados_novos JSONB,
  descricao TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_tipo ON registros_auditoria (tipo);
CREATE INDEX idx_auditoria_entidade ON registros_auditoria (entidade_tipo, entidade_id);
CREATE INDEX idx_auditoria_data ON registros_auditoria (created_at DESC);
CREATE INDEX idx_auditoria_usuario ON registros_auditoria (usuario_id);

-- ============================================================================
-- 4. TRIGGERS DE UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_setores_updated_at
  BEFORE UPDATE ON setores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_localizacoes_updated_at
  BEFORE UPDATE ON localizacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_categorias_updated_at
  BEFORE UPDATE ON categorias_patrimonio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_patrimonios_updated_at
  BEFORE UPDATE ON patrimonios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_perfis_updated_at
  BEFORE UPDATE ON perfis_usuario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. PROTEÇÃO DE HISTÓRICO (impedir UPDATE/DELETE em tabelas imutáveis)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Operação não permitida: registros históricos são imutáveis';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_movimentacoes_imutavel
  BEFORE UPDATE OR DELETE ON movimentacoes_patrimonio
  FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();

CREATE TRIGGER tr_auditoria_imutavel
  BEFORE UPDATE OR DELETE ON registros_auditoria
  FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE localizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_patrimonio ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrimonios ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_patrimonio ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE acessos_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_auditoria ENABLE ROW LEVEL SECURITY;

-- ---- FUNÇÕES AUXILIARES PARA RLS ----

-- Obter role do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM perfis_usuario
  WHERE user_id = auth.uid() AND ativo = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- Verificar se usuário tem acesso a uma empresa
CREATE OR REPLACE FUNCTION user_has_empresa_access(p_empresa_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM acessos_empresa
    WHERE user_id = auth.uid() AND empresa_id = p_empresa_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- Verificar se é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis_usuario
    WHERE user_id = auth.uid() AND role = 'ADMINISTRADOR' AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- ---- POLÍTICAS: EMPRESAS ----
CREATE POLICY "empresas_select" ON empresas
  FOR SELECT TO authenticated
  USING (
    user_has_empresa_access(id)
    OR is_admin()
  );

CREATE POLICY "empresas_insert" ON empresas
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "empresas_update" ON empresas
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- POLÍTICAS: SETORES ----
CREATE POLICY "setores_select" ON setores
  FOR SELECT TO authenticated
  USING (
    user_has_empresa_access(empresa_id)
    OR is_admin()
  );

CREATE POLICY "setores_insert" ON setores
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (get_user_role() = 'OPERADOR' AND user_has_empresa_access(empresa_id))
  );

CREATE POLICY "setores_update" ON setores
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR (get_user_role() = 'OPERADOR' AND user_has_empresa_access(empresa_id))
  )
  WITH CHECK (
    is_admin()
    OR (get_user_role() = 'OPERADOR' AND user_has_empresa_access(empresa_id))
  );

-- ---- POLÍTICAS: LOCALIZAÇÕES ----
CREATE POLICY "localizacoes_select" ON localizacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM setores s
      WHERE s.id = setor_id
      AND (user_has_empresa_access(s.empresa_id) OR is_admin())
    )
  );

CREATE POLICY "localizacoes_insert" ON localizacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM setores s
      WHERE s.id = setor_id
      AND (is_admin() OR (get_user_role() = 'OPERADOR' AND user_has_empresa_access(s.empresa_id)))
    )
  );

CREATE POLICY "localizacoes_update" ON localizacoes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM setores s
      WHERE s.id = setor_id
      AND (is_admin() OR (get_user_role() = 'OPERADOR' AND user_has_empresa_access(s.empresa_id)))
    )
  );

-- ---- POLÍTICAS: CATEGORIAS ----
CREATE POLICY "categorias_select" ON categorias_patrimonio
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "categorias_insert" ON categorias_patrimonio
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "categorias_update" ON categorias_patrimonio
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- POLÍTICAS: PATRIMÔNIOS ----
CREATE POLICY "patrimonios_select" ON patrimonios
  FOR SELECT TO authenticated
  USING (
    user_has_empresa_access(empresa_atual_id)
    OR is_admin()
  );

CREATE POLICY "patrimonios_insert" ON patrimonios
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_admin() OR get_user_role() = 'OPERADOR')
    AND user_has_empresa_access(empresa_atual_id)
  );

CREATE POLICY "patrimonios_update" ON patrimonios
  FOR UPDATE TO authenticated
  USING (
    (is_admin() OR get_user_role() = 'OPERADOR')
    AND user_has_empresa_access(empresa_atual_id)
  )
  WITH CHECK (
    (is_admin() OR get_user_role() = 'OPERADOR')
    AND user_has_empresa_access(empresa_atual_id)
  );

-- ---- POLÍTICAS: MOVIMENTAÇÕES ----
CREATE POLICY "movimentacoes_select" ON movimentacoes_patrimonio
  FOR SELECT TO authenticated
  USING (
    user_has_empresa_access(empresa_origem_id)
    OR user_has_empresa_access(empresa_destino_id)
    OR is_admin()
  );

-- INSERT controlado pela função RPC (não diretamente pelo cliente)
CREATE POLICY "movimentacoes_insert" ON movimentacoes_patrimonio
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_admin() OR get_user_role() = 'OPERADOR')
  );

-- ---- POLÍTICAS: PERFIS DE USUÁRIO ----
CREATE POLICY "perfis_select_own" ON perfis_usuario
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Apenas admin pode editar perfis
CREATE POLICY "perfis_update" ON perfis_usuario
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "perfis_insert" ON perfis_usuario
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- ---- POLÍTICAS: ACESSOS EMPRESA ----
CREATE POLICY "acessos_select" ON acessos_empresa
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "acessos_insert" ON acessos_empresa
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "acessos_delete" ON acessos_empresa
  FOR DELETE TO authenticated
  USING (is_admin());

-- ---- POLÍTICAS: AUDITORIA ----
CREATE POLICY "auditoria_select" ON registros_auditoria
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "auditoria_insert" ON registros_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Qualquer usuário autenticado pode gerar registros de auditoria

-- ============================================================================
-- 7. FUNÇÃO RPC: TRANSFERÊNCIA SEGURA DE PATRIMÔNIO
-- ============================================================================

CREATE OR REPLACE FUNCTION realizar_transferencia(
  p_patrimonio_id UUID,
  p_empresa_destino_id UUID,
  p_setor_destino_id UUID DEFAULT NULL,
  p_localizacao_destino_id UUID DEFAULT NULL,
  p_responsavel_entrega TEXT DEFAULT NULL,
  p_responsavel_recebimento TEXT DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_patrimonio RECORD;
  v_empresa_destino RECORD;
  v_setor_destino RECORD;
  v_localizacao_destino RECORD;
  v_tipo tipo_movimentacao;
  v_operacao_id UUID;
  v_movimentacao_id UUID;
BEGIN
  -- 1. Identificar o usuário autenticado (NUNCA confiar em parâmetro do cliente)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verificar role do usuário
  SELECT role INTO v_user_role
  FROM perfis_usuario
  WHERE user_id = v_user_id AND ativo = true;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado ou inativo';
  END IF;

  IF v_user_role NOT IN ('ADMINISTRADOR', 'OPERADOR') THEN
    RAISE EXCEPTION 'Usuário sem permissão para realizar transferências';
  END IF;

  -- 3. Buscar e bloquear o patrimônio (FOR UPDATE impede concorrência)
  SELECT p.* INTO v_patrimonio
  FROM patrimonios p
  WHERE p.id = p_patrimonio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patrimônio não encontrado: %', p_patrimonio_id;
  END IF;

  IF v_patrimonio.status != 'ativo' THEN
    RAISE EXCEPTION 'Patrimônio não está ativo. Status atual: %', v_patrimonio.status;
  END IF;

  -- 4. Verificar permissão na empresa de origem
  IF NOT EXISTS (
    SELECT 1 FROM acessos_empresa
    WHERE user_id = v_user_id AND empresa_id = v_patrimonio.empresa_atual_id
  ) AND v_user_role != 'ADMINISTRADOR' THEN
    RAISE EXCEPTION 'Sem acesso à empresa de origem';
  END IF;

  -- 5. Verificar empresa de destino
  SELECT * INTO v_empresa_destino
  FROM empresas
  WHERE id = p_empresa_destino_id AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa de destino não encontrada ou inativa';
  END IF;

  -- 6. Verificar permissão na empresa de destino
  IF NOT EXISTS (
    SELECT 1 FROM acessos_empresa
    WHERE user_id = v_user_id AND empresa_id = p_empresa_destino_id
  ) AND v_user_role != 'ADMINISTRADOR' THEN
    RAISE EXCEPTION 'Sem acesso à empresa de destino';
  END IF;

  -- 7. Verificar setor de destino (se informado)
  IF p_setor_destino_id IS NOT NULL THEN
    SELECT * INTO v_setor_destino
    FROM setores
    WHERE id = p_setor_destino_id AND ativo = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Setor de destino não encontrado ou inativo';
    END IF;

    -- Validar vínculo setor-empresa
    IF v_setor_destino.empresa_id != p_empresa_destino_id THEN
      RAISE EXCEPTION 'Setor de destino não pertence à empresa de destino';
    END IF;
  END IF;

  -- 8. Verificar localização de destino (se informada)
  IF p_localizacao_destino_id IS NOT NULL THEN
    IF p_setor_destino_id IS NULL THEN
      RAISE EXCEPTION 'Localização requer um setor de destino';
    END IF;

    SELECT * INTO v_localizacao_destino
    FROM localizacoes
    WHERE id = p_localizacao_destino_id AND ativo = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Localização de destino não encontrada ou inativa';
    END IF;

    IF v_localizacao_destino.setor_id != p_setor_destino_id THEN
      RAISE EXCEPTION 'Localização não pertence ao setor de destino';
    END IF;
  END IF;

  -- 9. Determinar tipo de movimentação
  IF v_patrimonio.empresa_atual_id = p_empresa_destino_id THEN
    v_tipo := 'transferencia_setor';
  ELSE
    v_tipo := 'transferencia_empresa';
  END IF;

  -- 10. Verificar se já há uma transferência idêntica recente (anti-duplicação)
  IF EXISTS (
    SELECT 1 FROM movimentacoes_patrimonio
    WHERE patrimonio_id = p_patrimonio_id
      AND empresa_destino_id = p_empresa_destino_id
      AND COALESCE(setor_destino_id, '00000000-0000-0000-0000-000000000000'::UUID) =
          COALESCE(p_setor_destino_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND tipo IN ('transferencia_setor', 'transferencia_empresa')
      AND created_at > now() - INTERVAL '10 seconds'
  ) THEN
    RAISE EXCEPTION 'Transferência duplicada detectada. Aguarde antes de tentar novamente.';
  END IF;

  -- 11. Gerar ID de operação
  v_operacao_id := uuid_generate_v4();

  -- 12. Inserir movimentação no histórico
  INSERT INTO movimentacoes_patrimonio (
    patrimonio_id, tipo,
    empresa_origem_id, setor_origem_id, localizacao_origem_id,
    empresa_destino_id, setor_destino_id, localizacao_destino_id,
    usuario_id, responsavel_entrega, responsavel_recebimento,
    motivo, observacoes, operacao_id
  ) VALUES (
    p_patrimonio_id, v_tipo,
    v_patrimonio.empresa_atual_id, v_patrimonio.setor_atual_id, v_patrimonio.localizacao_atual_id,
    p_empresa_destino_id, p_setor_destino_id, p_localizacao_destino_id,
    v_user_id, p_responsavel_entrega, p_responsavel_recebimento,
    p_motivo, p_observacoes, v_operacao_id
  ) RETURNING id INTO v_movimentacao_id;

  -- 13. Atualizar localização atual do patrimônio
  UPDATE patrimonios SET
    empresa_atual_id = p_empresa_destino_id,
    setor_atual_id = p_setor_destino_id,
    localizacao_atual_id = p_localizacao_destino_id,
    updated_at = now()
  WHERE id = p_patrimonio_id;

  -- 14. Registrar auditoria
  INSERT INTO registros_auditoria (
    tipo, entidade_tipo, entidade_id, usuario_id,
    dados_anteriores, dados_novos, descricao
  ) VALUES (
    'transferencia_realizada', 'patrimonio', p_patrimonio_id, v_user_id,
    jsonb_build_object(
      'empresa_id', v_patrimonio.empresa_atual_id,
      'setor_id', v_patrimonio.setor_atual_id,
      'localizacao_id', v_patrimonio.localizacao_atual_id
    ),
    jsonb_build_object(
      'empresa_id', p_empresa_destino_id,
      'setor_id', p_setor_destino_id,
      'localizacao_id', p_localizacao_destino_id
    ),
    'Transferência de patrimônio: ' || v_patrimonio.codigo
  );

  -- 15. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'movimentacao_id', v_movimentacao_id,
    'operacao_id', v_operacao_id,
    'tipo', v_tipo::TEXT,
    'patrimonio_codigo', v_patrimonio.codigo,
    'mensagem', 'Transferência realizada com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Revogar acesso direto e conceder apenas execução
REVOKE ALL ON FUNCTION realizar_transferencia FROM PUBLIC;
GRANT EXECUTE ON FUNCTION realizar_transferencia TO authenticated;

-- ============================================================================
-- 8. FUNÇÃO RPC: ESTORNAR TRANSFERÊNCIA
-- ============================================================================

CREATE OR REPLACE FUNCTION estornar_transferencia(
  p_movimentacao_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_movimentacao RECORD;
  v_patrimonio RECORD;
  v_operacao_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar role (apenas admin pode estornar)
  SELECT role INTO v_user_role
  FROM perfis_usuario
  WHERE user_id = v_user_id AND ativo = true;

  IF v_user_role != 'ADMINISTRADOR' THEN
    RAISE EXCEPTION 'Apenas administradores podem estornar transferências';
  END IF;

  -- Buscar movimentação
  SELECT * INTO v_movimentacao
  FROM movimentacoes_patrimonio
  WHERE id = p_movimentacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação não encontrada';
  END IF;

  IF v_movimentacao.tipo NOT IN ('transferencia_setor', 'transferencia_empresa') THEN
    RAISE EXCEPTION 'Apenas transferências podem ser estornadas';
  END IF;

  -- Buscar e bloquear patrimônio
  SELECT * INTO v_patrimonio
  FROM patrimonios
  WHERE id = v_movimentacao.patrimonio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patrimônio não encontrado';
  END IF;

  v_operacao_id := uuid_generate_v4();

  -- Registrar estorno
  INSERT INTO movimentacoes_patrimonio (
    patrimonio_id, tipo,
    empresa_origem_id, setor_origem_id, localizacao_origem_id,
    empresa_destino_id, setor_destino_id, localizacao_destino_id,
    usuario_id, motivo, operacao_id, movimentacao_referencia_id
  ) VALUES (
    v_movimentacao.patrimonio_id, 'estorno',
    v_patrimonio.empresa_atual_id, v_patrimonio.setor_atual_id, v_patrimonio.localizacao_atual_id,
    v_movimentacao.empresa_origem_id, v_movimentacao.setor_origem_id, v_movimentacao.localizacao_origem_id,
    v_user_id, p_motivo, v_operacao_id, p_movimentacao_id
  );

  -- Reverter localização
  UPDATE patrimonios SET
    empresa_atual_id = v_movimentacao.empresa_origem_id,
    setor_atual_id = v_movimentacao.setor_origem_id,
    localizacao_atual_id = v_movimentacao.localizacao_origem_id,
    updated_at = now()
  WHERE id = v_movimentacao.patrimonio_id;

  -- Auditoria
  INSERT INTO registros_auditoria (
    tipo, entidade_tipo, entidade_id, usuario_id,
    dados_anteriores, dados_novos, descricao
  ) VALUES (
    'transferencia_estornada', 'patrimonio', v_movimentacao.patrimonio_id, v_user_id,
    jsonb_build_object('movimentacao_id', p_movimentacao_id),
    jsonb_build_object('operacao_id', v_operacao_id),
    'Estorno de transferência - Motivo: ' || p_motivo
  );

  RETURN jsonb_build_object(
    'success', true,
    'operacao_id', v_operacao_id,
    'mensagem', 'Transferência estornada com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION estornar_transferencia FROM PUBLIC;
GRANT EXECUTE ON FUNCTION estornar_transferencia TO authenticated;

-- ============================================================================
-- 9. DADOS INICIAIS
-- ============================================================================

-- Empresas
INSERT INTO empresas (nome) VALUES
  ('Coopercar'),
  ('Coopercar Store'),
  ('Cooperauto');

-- Categorias
INSERT INTO categorias_patrimonio (nome, descricao) VALUES
  ('Informática', 'Computadores, impressoras, monitores, periféricos e equipamentos de TI'),
  ('Mobiliário', 'Mesas, cadeiras, armários, estantes e demais móveis'),
  ('Veículos', 'Automóveis, motocicletas, caminhões e outros veículos'),
  ('Pneus', 'Pneus novos, usados e recapados'),
  ('Ferramentas', 'Ferramentas manuais e elétricas'),
  ('Máquinas', 'Máquinas industriais e equipamentos pesados'),
  ('Telefonia', 'Telefones fixos, celulares, centrais telefônicas'),
  ('Equipamentos Operacionais', 'Equipamentos utilizados nas operações diárias'),
  ('Outros', 'Itens que não se enquadram nas categorias acima');

-- ============================================================================
-- 10. COMENTÁRIOS NAS TABELAS
-- ============================================================================

COMMENT ON TABLE empresas IS 'Empresas do grupo (Coopercar, Coopercar Store, Cooperauto)';
COMMENT ON TABLE setores IS 'Setores organizacionais vinculados a empresas';
COMMENT ON TABLE localizacoes IS 'Localização física detalhada dentro de setores';
COMMENT ON TABLE categorias_patrimonio IS 'Categorias para classificação de patrimônios';
COMMENT ON TABLE patrimonios IS 'Bens patrimoniais com localização e estado atual';
COMMENT ON TABLE movimentacoes_patrimonio IS 'Histórico imutável de todas as movimentações';
COMMENT ON TABLE perfis_usuario IS 'Perfil e role vinculado ao auth.users do Supabase';
COMMENT ON TABLE acessos_empresa IS 'Controle de acesso por empresa por usuário';
COMMENT ON TABLE registros_auditoria IS 'Log de auditoria imutável de todas as ações';
COMMENT ON FUNCTION realizar_transferencia IS 'Transferência transacional segura de patrimônio entre empresas/setores';
COMMENT ON FUNCTION estornar_transferencia IS 'Estorno de transferência com registro histórico';
