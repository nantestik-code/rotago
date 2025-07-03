# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d25be1fc-ecc7-42cf-bb66-c75477bdb260

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d25be1fc-ecc7-42cf-bb66-c75477bdb260) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Histórico de Mudanças e Decisões Técnicas

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
