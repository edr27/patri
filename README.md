# PatriControl - Sistema de Gestão Patrimonial

Sistema profissional de gestão patrimonial multiempresa para **Coopercar**, **Coopercar Store** e **Cooperauto**.

## Tecnologias

- **Frontend:** React 19 + TypeScript + Vite 8
- **UI:** Tailwind CSS 4 + Componentes customizados
- **Backend:** Supabase (Auth, PostgreSQL, RLS, RPC)
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Hospedagem:** Vercel

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy)
- Git

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd patri

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

## Configuração do Supabase

### Criar o projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **New Project**
3. Defina nome, senha do banco e região

### Obter as credenciais

1. Vá em **Settings → API**
2. Copie a **URL** e a **anon key** (pública)
3. Cole no arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seuprojetoref.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> ⚠️ **NUNCA** coloque a `service_role` key no frontend ou em variáveis `VITE_`.

### Aplicar as migrações

1. Vá em **SQL Editor** no painel do Supabase
2. Copie e execute o conteúdo de `supabase/migrations/001_schema_inicial.sql`
3. Opcionalmente, execute `supabase/seed.sql` para dados de teste

### Criar o primeiro administrador

1. Vá em **Authentication → Users → Add User**
2. Crie um usuário com e-mail e senha
3. Copie o **User UID** do usuário criado
4. Execute no SQL Editor:

```sql
INSERT INTO perfis_usuario (user_id, nome_completo, role)
VALUES ('USER_UID_AQUI', 'Seu Nome', 'ADMINISTRADOR');

INSERT INTO acessos_empresa (user_id, empresa_id)
SELECT 'USER_UID_AQUI', id FROM empresas;
```

## Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Executar suíte de testes automatizados
npm test

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

## Funcionalidades Principais

1. **Dashboard Executivo:** Indicadores em tempo real por empresa, setor, categoria e estado de conservação.
2. **Cadastro & Gestão de Patrimônios:** Códigos patrimoniais legíveis únicos, detalhamento completo e histórico.
3. **Etiquetas com QR Code:** Geração visual de etiquetas patrimoniais com QR Code SVG de alta precisão e suporte a impressão direta em impressoras térmicas e a laser.
4. **Consulta Rápida / Bipagem:** Pesquisa instantânea por leitor de código de barras ou digitação.
5. **Transferências Atômicas Seguras:** Wizard de 3 etapas com execução via RPC no PostgreSQL com bloqueio de concorrência (`SELECT FOR UPDATE`).
6. **Conferência de Inventário Físico:** Auditoria setorial em tempo real com leitor, comparação automática de bens localizados vs pendentes vs divergentes e exportação em CSV.
7. **Relatórios Completos:** Inventário geral, por empresa, por setor, transferências e histórico com exportação CSV formatada.
8. **Gestão de Usuários e Permissões:** RBAC multiempresa com perfis Administrador, Operador e Visualizador com isolamento estrito via RLS.
9. **Configurações & Auditoria:** CRUD de categorias de patrimônio e inspeção de logs imutáveis do sistema.

## Deploy na Vercel

### Configuração Automática

O projeto já contém o arquivo `vercel.json` configurado com rewrites de SPA e cabeçalhos de segurança HTTP.

### Via GitHub

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático a cada push

### Configurar redirecionamentos no Supabase

Após o deploy, configure no Supabase:

1. **Authentication → URL Configuration**
2. Adicione a URL da Vercel em:
   - **Site URL**: `https://seu-projeto.vercel.app`
   - **Redirect URLs**: `https://seu-projeto.vercel.app/**`

## Estrutura do Projeto

```
src/
  components/
    layout/           # Sidebar, Header, Layout principal
    ui/               # Componentes reutilizáveis
    forms/            # Formulários
    tables/           # Tabelas de dados
  pages/
    dashboard/        # Dashboard com indicadores
    patrimonios/      # CRUD de patrimônios
    empresas/         # Gerenciamento de empresas
    setores/          # Gerenciamento de setores
    movimentacoes/    # Transferências
    relatorios/       # Relatórios e exportações
    usuarios/         # Gestão de usuários (admin)
    configuracoes/    # Configurações (admin)
  services/           # Integração com Supabase
  hooks/              # Hooks customizados
  types/              # Tipos TypeScript
  utils/              # Funções utilitárias
  lib/                # Bibliotecas auxiliares

supabase/
  migrations/         # Migrações SQL versionadas
  seed.sql            # Dados de teste
  functions/          # Edge Functions (futuro)
```

## Perfis de Acesso

| Perfil         | Cadastrar | Transferir | Relatórios | Usuários |
|----------------|-----------|------------|------------|----------|
| Administrador  | ✅        | ✅         | ✅         | ✅       |
| Operador       | ✅        | ✅         | ✅         | ❌       |
| Visualizador   | ❌        | ❌         | ✅         | ❌       |

## Segurança

- RLS habilitado em todas as tabelas
- Funções RPC com `SECURITY DEFINER` e `search_path` fixo
- Transferências atômicas com `FOR UPDATE` (bloqueio de concorrência)
- Histórico imutável (triggers impedem UPDATE/DELETE)
- Auditoria completa de operações
- Usuário identificado por `auth.uid()`, nunca por parâmetro do cliente

## Licença

Uso interno - Coopercar, Coopercar Store, Cooperauto.
