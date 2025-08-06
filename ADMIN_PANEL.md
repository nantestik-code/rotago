# 🔧 Painel Administrativo RotaGo

## 📋 Visão Geral

O painel administrativo do RotaGo é uma interface completa para gerenciar todos os aspectos da plataforma, incluindo usuários, assinaturas, finanças e configurações do sistema.

## 🚀 Acesso

- **URL**: `/admin`
- **Requisito**: Usuário deve ter `is_early_adopter: true` no perfil
- **Autenticação**: Integrada com Supabase Auth

## 📊 Funcionalidades

### 1. **Dashboard Financeiro**
- Receita total e mensal
- Assinaturas ativas e em trial
- ARPU (Average Revenue Per User)
- Taxa de conversão
- Gráficos de receita e distribuição de planos

### 2. **Gerenciamento de Usuários**
- Visualização de todos os usuários
- Filtros por status (ativo, inativo, premium, gratuito)
- Alternância de status de administrador
- Exportação de dados para CSV
- Estatísticas de usuários

### 3. **Gerenciamento de Assinaturas**
- Visualização de todas as assinaturas
- Filtros por status e plano
- Atualização de assinaturas
- Gerenciamento de planos (criar, editar, excluir)
- Estatísticas de assinaturas

### 4. **Configurações do Sistema**
- Estatísticas gerais do sistema
- Configurações categorizadas:
  - Geral
  - Limites
  - Notificações
  - Pagamentos
  - Manutenção
- Ações do sistema (backup, limpeza, sincronização)

### 5. **Relatórios e Exportações**
- Geração de relatórios personalizados
- Tipos: Usuários, Financeiro, Entregas, Assinaturas
- Formatos: CSV, XLSX, PDF
- Filtros por período
- Histórico de relatórios

### 6. **Logs de Auditoria**
- Visualização de logs do sistema
- Filtros por severidade e tipo de ação
- Busca por usuário ou evento
- Exportação de logs
- Detalhes completos dos eventos

### 7. **Análises**
- Estatísticas gerais (usuários, entregas, rotas)
- Taxa de conclusão
- Gráficos de usuários ativos
- Distribuição de entregas por status

## 🏗️ Estrutura de Arquivos

```
src/
├── pages/admin/
│   └── AdminPanel.tsx          # Componente principal
├── components/admin/
│   ├── Analytics.tsx           # Análises e estatísticas
│   ├── AuditLogs.tsx          # Logs de auditoria
│   ├── FinancialDashboard.tsx # Dashboard financeiro
│   ├── ReportsAndExports.tsx  # Relatórios e exportações
│   ├── SiteContent.tsx        # Gerenciamento de conteúdo
│   ├── SubscriptionManagement.tsx # Gerenciamento de assinaturas
│   ├── SystemSettings.tsx     # Configurações do sistema
│   └── UsersManagement.tsx    # Gerenciamento de usuários
└── components/ui/
    └── date-range-picker.tsx   # Seletor de intervalo de datas
```

## 🔐 Segurança

- **Autenticação**: Verificação de `is_early_adopter` no perfil
- **Autorização**: Middleware de verificação de admin
- **Auditoria**: Logs de todas as ações administrativas
- **Validação**: Validação de dados em todas as operações

## 🎨 Design

- **Framework**: shadcn/ui + TailwindCSS
- **Responsivo**: Otimizado para desktop e mobile
- **Tema**: Suporte a modo claro/escuro
- **Ícones**: Lucide React
- **Gráficos**: Recharts

## 📈 Métricas Monitoradas

### Financeiras
- Receita total e mensal
- ARPU (Average Revenue Per User)
- Taxa de conversão trial → premium
- Distribuição de receita por plano

### Usuários
- Total de usuários
- Usuários ativos/inativos
- Administradores
- Usuários premium vs gratuito

### Sistema
- Total de rotas criadas
- Entregas realizadas
- Taxa de conclusão
- Performance do sistema

## 🔧 Configurações Disponíveis

### Gerais
- Nome da aplicação
- URL base
- Timezone
- Idioma padrão

### Limites
- Máximo de rotas por usuário
- Máximo de entregas por rota
- Limite de upload de arquivos

### Notificações
- Email de notificações
- Push notifications
- SMS (se habilitado)

### Pagamentos
- Configurações do Mercado Pago
- Webhooks
- Moedas aceitas

### Manutenção
- Modo de manutenção
- Mensagem personalizada
- Backup automático

## 🚀 Como Usar

1. **Acesso**: Navegue para `/admin` após fazer login
2. **Navegação**: Use as abas para alternar entre seções
3. **Filtros**: Utilize os filtros para refinar visualizações
4. **Exportação**: Gere relatórios conforme necessário
5. **Configuração**: Ajuste configurações do sistema conforme necessário

## 📝 Notas Importantes

- Todas as ações são logadas para auditoria
- Backups são recomendados antes de alterações críticas
- Configurações de pagamento devem ser testadas em ambiente de desenvolvimento
- Logs de auditoria são mantidos por 90 dias por padrão

## 🔄 Atualizações Futuras

- Dashboard em tempo real
- Notificações push para administradores
- Relatórios automatizados
- Integração com ferramentas de monitoramento
- API para integrações externas