# RotaFacil Turbo

![RotaFacil Turbo](./docs/screenshot.png)

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/seu-repo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

SaaS moderno para gestão de rotas de entrega, com sistema de assinatura, integração Mercado Pago, interface profissional e experiência robusta mesmo em ambiente demo.

---

## ✨ Funcionalidades
- Gestão de entregas e rotas com visualização no mapa
- Sistema de assinatura (4 planos, trial de 7 dias)
- Importação de entregas (Excel/CSV)
- Histórico de ações do usuário
- Integração Mercado Pago (checkout e webhooks)
- UX responsiva, banners inteligentes e feedback visual
- Fallback mock automático para planos em caso de erro de conexão/Supabase

## 🚀 Como rodar localmente
1. Instale Node.js e npm
2. Clone o repositório
3. Copie `.env.example` para `.env` e configure as variáveis (Supabase, Mercado Pago, etc)
4. Instale as dependências:
   ```sh
   npm install
   ```
5. Inicie o servidor de desenvolvimento:
   ```sh
   npm run dev
   ```

> **Dica:** Consulte a seção de variáveis de ambiente e exemplos de configuração em `.env.example`.

## 🏗️ Stack
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database + Auth)
- Mercado Pago (Pagamentos)

---

## 🔐 Sistema Administrativo

### Visão Geral
O RotaFacil possui um sistema administrativo completo para gerenciamento de usuários, assinaturas e monitoramento da plataforma. O painel admin é acessível via `/admin` e oferece controle total sobre o sistema.

### Funcionalidades do Admin

#### 📊 **Dashboard Analytics**
- Métricas em tempo real de usuários ativos
- Estatísticas de assinaturas por plano
- Gráficos de crescimento e receita
- Indicadores de performance do sistema

#### 👥 **Gerenciamento de Usuários**
- **Visualização completa**: Lista todos os usuários com filtros avançados
- **Detalhes do cliente**: Modal com informações completas incluindo:
  - Nome completo e email
  - CPF (formatado e validado)
  - Status da assinatura
  - Plano atual e datas
  - Histórico de criação e atualizações
- **Ações administrativas**: Ativar/desativar usuários, gerenciar assinaturas

#### 🛡️ **Gerenciamento de Administradores**
- **Criação de novos admins**: Interface para cadastrar administradores diretamente pelo painel
- **Validação de campos**: Email, nome completo e senha obrigatórios
- **Integração completa**: Cria usuário no Supabase Auth + perfil + entrada na tabela admins
- **Feedback visual**: Toasts de sucesso/erro e validação em tempo real

#### 💰 **Gestão Financeira**
- Relatórios de receita por período
- Status de pagamentos e cobranças
- Integração com Mercado Pago
- Análise de conversão de trials

#### ⚙️ **Configurações do Sistema**
- Configuração de planos de assinatura
- Parâmetros do sistema
- Logs de auditoria
- Backup e manutenção

### Autenticação Administrativa

#### **Sistema de Login Seguro**
O sistema de autenticação administrativa foi completamente refatorado para garantir máxima segurança:

```typescript
// Fluxo de autenticação admin
1. Verificação na tabela 'admins' (email + status ativo)
2. Validação de senha via cliente temporário Supabase
3. Criação de sessão administrativa local
4. Logs de auditoria completos
```

#### **Características de Segurança**
- ✅ **Validação real de senha**: Usa Supabase Auth para verificar credenciais
- ✅ **Cliente temporário**: Evita conflitos de sessão com `persistSession: false`
- ✅ **Sem credenciais hardcoded**: Todas as credenciais são validadas no banco
- ✅ **Logs de auditoria**: Registro completo de tentativas de login
- ✅ **Sessão isolada**: Sistema administrativo independente da sessão do usuário

#### **Resolução de Problemas**
Problemas anteriores resolvidos:
- ❌ **Erro 400**: Conflitos de sessão com signInWithPassword
- ✅ **Solução**: Cliente temporário isolado para validação
- ❌ **Credenciais hardcoded**: Sistema inseguro
- ✅ **Solução**: Validação real contra Supabase Auth
- ❌ **RLS conflicts**: Políticas conflitantes na tabela admins
- ✅ **Solução**: RLS desabilitado para tabela admins

### Estrutura Técnica

#### **Arquivos Principais**
```
src/
├── components/admin/
│   ├── AdminPanel.tsx          # Painel principal com tabs
│   ├── UsersManagement.tsx     # Gerenciamento de usuários
│   └── AdminLogin.tsx          # Tela de login admin
├── services/
│   └── adminAuthService.ts     # Serviço de autenticação
├── pages/admin/
│   └── AdminPanel.tsx          # Página principal do admin
└── hooks/
    └── useAdminAuth.ts         # Hook para autenticação admin
```

#### **Banco de Dados**
```sql
-- Tabela de administradores
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- RLS desabilitado para acesso direto
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
```

### Como Usar o Sistema Admin

#### **Acesso Inicial**
1. Navegue para `/admin`
2. Faça login com credenciais de administrador
3. Acesse o painel principal com todas as funcionalidades

#### **Criar Novo Administrador**
1. No painel admin, vá para a aba "Usuários"
2. Clique em "Criar Admin"
3. Preencha: email, nome completo e senha
4. O sistema criará automaticamente:
   - Usuário no Supabase Auth
   - Perfil na tabela profiles
   - Entrada na tabela admins

#### **Gerenciar Usuários**
1. Visualize lista completa de usuários
2. Use filtros para encontrar usuários específicos
3. Clique em qualquer usuário para ver detalhes completos
4. Execute ações administrativas conforme necessário

### Logs e Monitoramento

O sistema inclui logging completo:
- 📝 **Tentativas de login**: Sucessos e falhas
- 👤 **Ações administrativas**: Criação/edição de usuários
- 🔍 **Auditoria**: Rastro completo de ações sensíveis
- ⚠️ **Erros**: Captura e log de exceções

### Manutenção e Troubleshooting

#### **Problemas Comuns**
1. **Admin não consegue fazer login**:
   - Verificar se existe na tabela `admins` com `is_active = true`
   - Confirmar senha no Supabase Auth
   - Verificar logs no console do navegador

2. **Erro ao criar admin**:
   - Verificar se email já existe
   - Confirmar conexão com Supabase
   - Verificar permissões da tabela

3. **Usuários não aparecem na lista**:
   - Verificar políticas RLS na tabela `profiles`
   - Confirmar sessão administrativa ativa
   - Verificar filtros aplicados

---

## Histórico de Mudanças e Decisões Técnicas

### 2025-08-08 — Correção das Estatísticas no Histórico de Rotas e Documentação do Carregamento de Rotas

#### 1) Problema
- As estatísticas exibidas no histórico de rotas estavam incorretas, pois o código lia `status` diretamente de `route_deliveries`.
- A coluna `status` não existe na tabela `route_deliveries` (status pertence à tabela `deliveries`).

#### 2) Causa Raiz
- Consulta ao Supabase fazia `select('*')` em `route_deliveries` e depois filtrava por `status`, resultando em contagens inconsistentes ou sempre zeradas.

#### 3) Solução Implementada
- Ajuste da consulta para usar join com `deliveries` e retornar o campo de status corretamente:
  - De: `select('*')` em `route_deliveries`
  - Para: `select('delivery_id, deliveries(status)')` com `.eq('route_id', routeId)`
- Cálculo de estatísticas atualizado para utilizar `d?.deliveries?.status`:
  - `entregue`: status == `entregue`
  - `ocorrencia`: status == `ocorrencia`
  - `pendente`: `total - entregue - ocorrencia`

#### 4) Arquivos Alterados
- `src/components/RouteHistoryList.tsx`
  - Função: `loadRouteStats()`
  - Mudança: join em `deliveries(status)` e ajuste do cálculo das contagens.

#### 5) Impacto e Compatibilidade
- Estatísticas do diálogo de histórico passam a refletir fielmente os dados de `deliveries.status`.
- Nenhuma mudança estrutural no banco; compatível com as colunas existentes (`sequence_number` em `route_deliveries` e `status` em `deliveries`).
- Requer que as políticas RLS permitam leitura das entregas relacionadas do usuário autenticado.

#### 6) Como Testar
1. Acesse `Histórico de Rotas` e abra as estatísticas de uma rota.
2. Verifique:
  - `Total` = quantidade de registros em `route_deliveries` para a rota.
  - `Entregue`/`Ocorrência` = contagem por `deliveries.status`.
  - `Pendente` = `Total - Entregue - Ocorrência`.
3. Compare com a tela principal `/app` na mesma rota e confirme que os números batem.

#### 7) Checklist Pós-Deploy
- [ ] Estatísticas batem com a listagem em `/app`.
- [ ] Nenhum erro de RLS nas consultas do histórico.
- [ ] Join retorna `deliveries.status` corretamente.

#### 8) Como Reverter (se necessário)
- Reverter a consulta em `loadRouteStats()` para o estado anterior (não recomendado): trocar `select('delivery_id, deliveries(status)')` por `select('*')` e ajustar o cálculo (o que reintroduz o bug). Alternativa melhor é manter o join e revisar RLS caso a consulta falhe.

#### 9) Relação com o Objetivo Principal
- Esta correção complementa a iniciativa de garantir consistência ao carregar rotas do histórico e apresentar dados corretos na UI. Não altera o fluxo de carregamento; apenas corrige a exibição de estatísticas, mantendo compatibilidade com as mudanças já aplicadas em `sequence_number`/`delivery_order` e com o restauro de estado pós-autenticação.

### 2025-07 — Refatoração Completa de Login, Logout e Perfis (RotaFacil Turbo)

#### 1. **Logout e Limpeza de Sessão**
- Refatorado o hook `useAuth` e utilitários para garantir que o logout:
  - Limpa todos os tokens, cookies e localStorage relacionados à autenticação (inclusive Supabase e resíduos).
  - Remove headers de autorização do cliente Supabase.
  - Limpa o estado React (user, session, profile) e timers.
  - Redireciona o usuário para `/login` com parâmetro de cache busting e reload forçado.
  - Adicionada UX com toasts e alertas para feedback do usuário.
- Criado utilitário centralizado em `src/utils/authUtils.ts` para limpeza de cookies, localStorage, sessionStorage e detecção de resíduos.
- O botão "Sair" no Header agora chama esse fluxo robusto, com logs detalhados para debug.

#### 2. **Login Seguro e Criação de Perfil**
- **Removido** fluxo que criava usuários automaticamente no login (mesmo em dev).
- Agora, ao tentar login:
  - Apenas autentica usuários já existentes no Supabase Auth.
  - Se as credenciais estiverem erradas, mostra mensagem amigável.
  - Após login bem-sucedido, verifica se existe um perfil na tabela `profiles`.
    - Se não existir, cria automaticamente o perfil com dados do Auth (email, nome, avatar).
    - Se já existir, segue o fluxo normal.
- Cadastro de usuário (signup) permanece como único local de criação de contas.
- Nenhuma conta "Usuário de Teste" é criada automaticamente no painel Auth.

#### 3. **Tratamento de Sessão Expirada e Redirecionamento**
- Página de login agora trata parâmetros de URL (`logout=true`, `session_expired=true`, `error=true`, `source`) para:
  - Limpar resíduos de sessão ao chegar na tela de login.
  - Exibir mensagens de toast contextualizadas para o usuário.
  - Logar a origem do redirecionamento para facilitar debug.

#### 4. **Resumo do Fluxo Atual**
- **Login**: Só autentica usuários já existentes. Após login, garante que o perfil existe no banco.
- **Logout**: Remove completamente todos os dados de sessão, cookies, tokens e estado local, com UX aprimorada.
- **Signup**: Cria usuário e perfil normalmente.
- **Segurança**: Nenhum usuário de teste é criado automaticamente. Perfis são sempre consistentes.

#### 5. **Como implementar esse padrão em outro projeto**
1. Centralize toda autenticação e logout em um hook (ex: `useAuth`).
2. Crie utilitários para limpeza profunda de tokens/cookies.
3. No login, nunca crie usuário automaticamente. Apenas autentique.
4. Após login, verifique/crie perfil na tabela de perfis.
5. No logout, limpe tudo e redirecione para login com reload.
6. Sempre forneça feedback visual ao usuário.

#### 6. **Arquivos Alterados**
- `src/hooks/use-auth.tsx`
- `src/pages/auth/Login.tsx`
- `src/components/Header.tsx`
- `src/utils/authUtils.ts`
- `src/integrations/supabase/client.ts`

---

### 1. Migração e Correção do Fluxo de Autenticação (React + Supabase)
- Refatorado o hook `useAuth` para garantir autenticação centralizada e segura, seguindo o padrão:
  - O contexto fornece `user`, `session`, `profile`, `isLoading`, `signOut`, entre outros.
  - Todos os componentes e serviços devem consumir o usuário autenticado via `useAuth()`.
  - Serviços não acessam mais `auth.currentUser` diretamente, mas recebem o usuário como parâmetro.
- Corrigido o fluxo de logout:
  - O botão "Sair" agora chama `signOut` do contexto, que executa o logout no Supabase, limpa estados locais e redireciona para `/login`.
  - Removido redirecionamento duplicado no listener de autenticação para evitar conflitos.
  - Adicionado timeout de segurança para nunca travar o loading.
- Adicionados logs no fluxo de autenticação para facilitar debug.

### 2. Integração e Políticas Supabase
- Implementado schema SQL para tabela `profiles` com políticas RLS:
  - Usuários só podem ler/atualizar/inserir seus próprios perfis.
  - Trigger automática para criar perfil ao registrar novo usuário.
- Corrigidas queries de acesso para sempre filtrar por `contaId` e tipo de usuário.

### 3. Módulo de Relatórios para Departamento Pessoal
- Criado o componente `RelatoriosDP` com:
  - Seleção de tipo de relatório, período, filtros e exportação PDF/Excel.
  - Integração com `relatoriosDPService` e dados de vales, despesas e comissões.
  - Layout responsivo, feedback via notificações e uso de inputs nativos de data.
- Corrigido uso de props e estados para melhor compatibilidade com o padrão do projeto.
- Ajustada busca de funcionários para usar apenas a coleção `usuarios` com filtro `tipo='funcionario'`.

### 4. Tratamento de Erros de Autenticação
- Mensagens amigáveis para erros comuns:
  - "E-mail já cadastrado" ao tentar criar usuário existente.
  - "E-mail ou senha inválidos" no login.
- No ambiente de desenvolvimento, verificação prévia antes de tentar criar usuário.

### 5. Recomendações de Uso
- Sempre utilize o hook `useAuth()` para acessar o usuário e perfil.
- Para novos relatórios ou integrações, siga o padrão de passar o objeto `user` para os serviços.
- Consulte os logs do navegador para mensagens detalhadas em caso de erro.

### 6. Correções na Página de Assinatura (SubscriptionPage)
**Data**: Janeiro 2025

#### Problemas Identificados e Soluções:

**6.1. Erro "error is not defined"**
- **Problema**: Variável `error` não estava sendo desestruturada do hook `useSubscription`
- **Solução**: Adicionado `error` na desestruturação do hook na SubscriptionPage.tsx
- **Arquivo**: `src/pages/SubscriptionPage.tsx` (linha 33)

**6.2. Loading Dependente de Autenticação**
- **Problema**: Planos de assinatura só eram carregados quando usuário estava autenticado
- **Solução**: Modificado `useSubscription` para buscar planos independentemente da autenticação:
  - Adicionado useEffect separado para buscar planos na inicialização
  - Planos são buscados sempre (dados públicos)
  - Assinatura do usuário apenas se logado
  - Loading definido como false após carregar planos
- **Arquivo**: `src/hooks/useSubscription.ts` (linhas 46-60)

**6.3. Tratamento de authLoading**
- **Problema**: Página renderizava antes da autenticação estar completa
- **Solução**: 
  - Adicionado `isLoading: authLoading` do useAuth
  - Incluído nas condições de loading da página
  - Renderização condicional considerando ambos os loadings
- **Arquivo**: `src/pages/SubscriptionPage.tsx` (linhas 28, 193, 209)

**6.4. Melhor Tratamento de Erros RLS**
- **Problema**: Erros 401 causavam falha total no carregamento
- **Solução**: Implementado fallback para planos mock quando há problemas de RLS
- **Benefício**: Página funciona mesmo com configurações de RLS pendentes
- **Arquivo**: `src/hooks/useSubscription.ts` (linhas 95-111)

#### Resultado Final:
- ✅ Página carrega corretamente com planos de assinatura
- ✅ Estados de loading funcionam adequadamente
- ✅ Tratamento de erros robusto com fallbacks
- ✅ Autenticação e timeout resolvidos
- ✅ Interface responsiva e moderna mantida
- ✅ Integração com Mercado Pago preservada

#### Logs de Debug:
- Sistema detecta corretamente sessões válidas do Supabase
- Timeout de autenticação tratado com redirecionamento para login
- Planos mock utilizados quando RLS não configurado
- Erro 404 na tabela `profiles` indica necessidade de configuração RLS

---

### 2025-07-14 — Melhorias no Sistema de Assinatura, Fallback e Navegação (RotaFacil Turbo)

#### 1. **Fallback de Planos Mock e Robustez de Carregamento**
- Implementado fallback automático para exibir planos mock quando a consulta ao Supabase falha por timeout, erro de RLS ou conectividade.
- Garantido que a tela de planos nunca fique vazia, melhorando a experiência do usuário em ambientes de demo ou com Supabase restrito.
- Logs detalhados no console informam quando o modo mock está ativo e facilitam o debug.

#### 2. **Tratamento de Estados de Loading e Erro**
- O carregamento de planos agora é independente da autenticação, pois são dados públicos.
- O estado de loading considera tanto o carregamento dos planos quanto o loading do Auth (`authLoading`), evitando renderização prematura.
- Banner de erro exibido corretamente quando há falha de assinatura, sem mostrar informações enganosas ao usuário.

#### 3. **Bloqueio de Acesso e Status de Assinatura**
- O sistema bloqueia acesso ao app para usuários sem assinatura ativa ou com trial expirado.
- Não há fallback para "fingir" assinatura ativa — acesso só é liberado se realmente houver assinatura válida no banco.
- O status de assinatura é calculado apenas pela tabela `user_subscriptions`.

#### 4. **Correção de Key Duplicada no React**
- Corrigido warning "Encountered two children with the same key" na renderização da lista de planos, usando `key={plan.id + '-' + idx}`.

#### 5. **Navegação e UX Aprimorada**
- Adicionados botões de navegação destacados para retornar ao painel principal do app (`/app`) na tela de planos.
- Botão "Ir para o Painel do App" centralizado e estilizado para facilitar o fluxo do usuário.
- Mensagens e banners claros sobre status de assinatura, trial e erros.

#### 6. **Resumo Técnico**
- Hooks afetados: `useSubscription.ts`, `useAuth.ts`.
- Componentes afetados: `SubscriptionPage.tsx`, `PricingSection.tsx`, `SubscriptionBanner.tsx`.
- Integração Mercado Pago e fallback de planos mock preservados.
- RLS do Supabase permanece restritivo, mas o app é totalmente funcional em modo demo.

#### 7. **Próximos Passos**
- Ajustar políticas RLS no Supabase para liberar consulta pública de planos e leitura segura de assinaturas.
- Revisar UX de banners e loading conforme feedback de usuários reais.
- Testar todos os fluxos: assinatura ativa, trial, expirado e ambiente offline.

---

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d25be1fc-ecc7-42cf-bb66-c75477bdb260) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
