# Sistema de Autenticação de Administrador - RotaGo

## 📋 Visão Geral

O RotaGo agora possui um sistema de autenticação dedicado para administradores, separado do sistema de usuários regulares. Este sistema permite acesso seguro ao painel administrativo sem depender da verificação de e-mail ou do sistema de usuários padrão.

## 🔐 Credenciais de Administrador

### Administradores Pré-configurados:

1. **Super Administrador**
   - Email: `admin@rotago.com`
   - Senha: `admin123`
   - Permissões: Acesso total ao sistema

2. **Administrador**
   - Email: `suporte@rotago.com`
   - Senha: `suporte123`
   - Permissões: Acesso padrão ao painel

3. **Moderador**
   - Email: `moderador@rotago.com`
   - Senha: `mod123`
   - Permissões: Acesso limitado

## 🚀 Como Acessar o Painel Administrativo

### Método 1: Acesso Direto
1. Navegue para: `http://localhost:8080/admin`
2. Você será redirecionado automaticamente para `/admin/login`
3. Use uma das credenciais acima para fazer login

### Método 2: Login Direto
1. Navegue para: `http://localhost:8080/admin/login`
2. Insira as credenciais de administrador
3. Clique em "Entrar no Painel"

## 🏗️ Arquitetura do Sistema

### Componentes Principais:

1. **`adminAuthService.ts`**
   - Serviço de autenticação com lista de admins
   - Gerenciamento de sessão via localStorage
   - Validação de credenciais e permissões

2. **`use-admin-auth.tsx`**
   - Hook de contexto para estado global de autenticação
   - Gerencia login, logout e verificação de permissões
   - Provider para toda a aplicação

3. **`AdminLogin.tsx`**
   - Página de login específica para administradores
   - Interface moderna com validações
   - Redirecionamento automático após login

4. **`AdminRoute.tsx`**
   - Componente de rota protegida para admins
   - Verificação de permissões por nível
   - Redirecionamento automático para login

5. **`AdminPanel.tsx`**
   - Painel principal simplificado
   - Usa o novo sistema de autenticação
   - Botão de logout integrado

## 🔒 Níveis de Permissão

### Hierarquia de Papéis:
1. **super_admin** - Acesso total
2. **admin** - Acesso padrão ao painel
3. **moderator** - Acesso limitado

### Verificação de Permissões:
```typescript
// Verificar se tem permissão específica
const { hasPermission } = useAdminAuth();
const canAccess = hasPermission('admin'); // true para admin e super_admin

// Hooks simplificados
const { isAdmin, isSuperAdmin, isModeratorOrAbove } = useIsAdmin();
```

## 🛠️ Funcionalidades

### ✅ Implementado:
- [x] Sistema de login dedicado para admins
- [x] Gerenciamento de sessão seguro
- [x] Verificação de permissões por nível
- [x] Redirecionamento automático
- [x] Interface moderna e responsiva
- [x] Logout com limpeza de sessão
- [x] Proteção de rotas administrativas

### 🔄 Fluxo de Autenticação:
1. Usuário acessa `/admin`
2. Sistema verifica se está logado como admin
3. Se não, redireciona para `/admin/login`
4. Após login bem-sucedido, redireciona para `/admin`
5. Painel carrega com informações do admin logado

## 🚨 Segurança

### Medidas Implementadas:
- Senhas são verificadas com hash (simulado)
- Sessão expira automaticamente
- Validação de permissões em tempo real
- Limpeza de dados sensíveis no logout
- Proteção contra acesso não autorizado

### Considerações:
- Sistema atual usa lista estática (temporário)
- Em produção, integrar com banco de dados
- Implementar hash real de senhas
- Adicionar logs de auditoria
- Configurar rate limiting

## 📱 Interface do Usuário

### Página de Login:
- Design moderno com gradiente
- Campos de email e senha
- Botão de mostrar/ocultar senha
- Validações em tempo real
- Mensagens de erro claras
- Loading states

### Painel Administrativo:
- Header com informações do admin
- Badge indicando nível de permissão
- Botão de logout visível
- Todas as funcionalidades existentes mantidas

## 🔧 Configuração e Manutenção

### Adicionar Novo Administrador:
1. Edite `src/services/adminAuthService.ts`
2. Adicione entrada no array `ADMIN_USERS`
3. Defina email, senha e role apropriados

### Modificar Permissões:
1. Ajuste a função `hasPermission` no serviço
2. Atualize a hierarquia conforme necessário
3. Teste todas as funcionalidades afetadas

## 🧪 Testes

### Cenários de Teste:
1. **Login com credenciais válidas**
   - Deve redirecionar para `/admin`
   - Deve mostrar informações corretas do admin

2. **Login com credenciais inválidas**
   - Deve mostrar mensagem de erro
   - Não deve permitir acesso

3. **Acesso direto a `/admin` sem login**
   - Deve redirecionar para `/admin/login`
   - Deve preservar URL original

4. **Logout**
   - Deve limpar sessão
   - Deve redirecionar para login

5. **Verificação de permissões**
   - Cada nível deve ter acesso apropriado
   - Deve bloquear acesso não autorizado

## 📞 Suporte

Para questões sobre o sistema de autenticação admin:
1. Verifique este documento primeiro
2. Teste com as credenciais fornecidas
3. Verifique logs do navegador para erros
4. Confirme que o servidor está rodando

---

**Nota**: Este sistema foi implementado como solução temporária. Para produção, recomenda-se integração com banco de dados e implementação de medidas de segurança adicionais.