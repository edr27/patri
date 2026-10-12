-- ============================================================================
-- SEED: Dados de Teste (NÃO usar em produção)
-- 
-- ATENÇÃO: Este arquivo contém dados de demonstração.
-- Utilize apenas em ambiente de desenvolvimento/teste.
-- ============================================================================

-- Setores para Coopercar
INSERT INTO setores (nome, empresa_id) VALUES
  ('Administrativo', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('RH', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('Financeiro', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('Contabilidade', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('TI', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('Monitoramento', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('24 Horas', (SELECT id FROM empresas WHERE nome = 'Coopercar')),
  ('Diretoria', (SELECT id FROM empresas WHERE nome = 'Coopercar'));

-- Setores para Coopercar Store
INSERT INTO setores (nome, empresa_id) VALUES
  ('Administrativo', (SELECT id FROM empresas WHERE nome = 'Coopercar Store')),
  ('Financeiro', (SELECT id FROM empresas WHERE nome = 'Coopercar Store')),
  ('Vendas', (SELECT id FROM empresas WHERE nome = 'Coopercar Store')),
  ('Estoque', (SELECT id FROM empresas WHERE nome = 'Coopercar Store')),
  ('Expedição', (SELECT id FROM empresas WHERE nome = 'Coopercar Store'));

-- Setores para Cooperauto
INSERT INTO setores (nome, empresa_id) VALUES
  ('Administrativo', (SELECT id FROM empresas WHERE nome = 'Cooperauto')),
  ('Financeiro', (SELECT id FROM empresas WHERE nome = 'Cooperauto')),
  ('Oficina', (SELECT id FROM empresas WHERE nome = 'Cooperauto')),
  ('Peças', (SELECT id FROM empresas WHERE nome = 'Cooperauto')),
  ('Atendimento', (SELECT id FROM empresas WHERE nome = 'Cooperauto'));

-- ============================================================================
-- NOTA: Para criar o primeiro administrador, siga estas etapas:
--
-- 1. Crie um usuário pelo Supabase Dashboard (Authentication → Users → Add User)
--    ou pelo Supabase Auth API.
--
-- 2. Execute o SQL abaixo substituindo 'USER_ID_AQUI' pelo UUID do usuário:
--
--    INSERT INTO perfis_usuario (user_id, nome_completo, role)
--    VALUES ('USER_ID_AQUI', 'Nome do Admin', 'ADMINISTRADOR');
--
--    INSERT INTO acessos_empresa (user_id, empresa_id)
--    SELECT 'USER_ID_AQUI', id FROM empresas;
--
-- Nunca deixe uma rota pública para auto-cadastro como administrador.
-- ============================================================================
