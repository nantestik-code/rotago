# 📧 Sistema de Email - RotaGo

## 📋 Visão Geral

O sistema de email do RotaGo foi completamente reformulado para resolver problemas de CORS e garantir envio real de emails. Atualmente utiliza:

1. **Edge Function Supabase** (Principal - sem CORS)
2. **Hostinger SMTP** (Provedor de email)
3. **Fallback Inteligente** (Simulação se falhar)

## ⚠️ Problemas Resolvidos

### CORS (Cross-Origin Resource Sharing)
- **Problema:** Erro "Response to preflight request doesn't pass access control check"
- **Causa:** Servidor externo não enviava headers CORS adequados
- **Solução:** Uso da Edge Function do Supabase que contorna CORS

### Execução PHP Local
- **Problema:** Código PHP retornado como texto (`"<?php // P"... is not valid JSON`)
- **Causa:** Servidor local não executando PHP corretamente
- **Solução:** Migração para Edge Function Supabase

### Autenticação Admin
- **Problema:** Sistema admin usa sessões locais, não Supabase Auth
- **Solução:** Removida verificação de sessão, uso direto da service key

## 🚀 Funcionalidades

- ✅ Envio de emails transacionais
- ✅ Templates HTML responsivos
- ✅ Sistema de logs e tracking
- ✅ Interface administrativa
- ✅ Múltiplos provedores (SendGrid + Hostinger)
- ✅ Fallback automático
- ✅ Validação de emails
- ✅ Rate limiting

## 📁 Estrutura de Arquivos

```
rotago/
├── src/
│   ├── components/admin/EmailManager.tsx    # Interface administrativa
│   ├── hooks/use-email-manager.ts           # Hook principal
│   └── types/email.ts                       # Tipos TypeScript
├── supabase/functions/
│   ├── send-email/index.ts                  # Edge Function SendGrid
│   └── send-email-hostinger/index.ts        # Edge Function Hostinger
├── api/
│   └── send-email-hostinger.php             # Script PHP alternativo
├── vendor/                                  # PHPMailer (auto-instalado)
└── docs/
    └── EMAIL_SYSTEM.md                      # Esta documentação
```

## ⚙️ Configuração

### 1. SendGrid (Produção)

```bash
# Variáveis de ambiente no Supabase
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=contato@rotago.site
FROM_NAME=RotaGo
```

### 2. Hostinger SMTP (Alternativa)

```typescript
// Configurações já implementadas
const config = {
  host: 'smtp.hostinger.com',
  port: 465, // SSL
  secure: true,
  auth: {
    user: 'contato@rotago.site',
    pass: '933755ViTor**'
  }
};
```

## 🔧 Como Usar

### No React (Frontend)

```typescript
import { useEmailManager } from '@/hooks/use-email-manager';

function MyComponent() {
  const { sendEmail, isLoading } = useEmailManager();
  
  const handleSendEmail = async () => {
    try {
      await sendEmail({
        to: 'usuario@email.com',
        subject: 'Bem-vindo ao RotaGo',
        template: 'welcome',
        data: { userName: 'João' },
        provider: 'hostinger' // ou 'sendgrid'
      });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  };
  
  return (
    <button onClick={handleSendEmail} disabled={isLoading}>
      Enviar Email
    </button>
  );
}
```

### Via Edge Function (Supabase)

```typescript
// SendGrid
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'usuario@email.com',
    subject: 'Assunto',
    template: 'welcome',
    data: { userName: 'João' }
  }
});

// Hostinger SMTP
const { data, error } = await supabase.functions.invoke('send-email-hostinger', {
  body: {
    to: 'usuario@email.com',
    subject: 'Assunto',
    html: '<h1>Olá!</h1>'
  }
});
```

### Via PHP (Alternativa)

```php
// POST para /api/send-email-hostinger.php
$data = [
    'to' => 'usuario@email.com',
    'subject' => 'Assunto',
    'message' => 'Mensagem em texto',
    'html' => '<h1>Mensagem HTML</h1>'
];

$response = file_get_contents('http://localhost/rotago/api/send-email-hostinger.php', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query($data)
    ]
]));
```

## 📊 Comparação de Provedores

| Característica | SendGrid | Hostinger SMTP |
|---|---|---|
| **Custo** | Pago (após limite) | Gratuito |
| **Limite diário** | 100/dia (gratuito) | 100/dia |
| **Deliverabilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Analytics** | Completo | Básico |
| **Templates** | Avançados | Simples |
| **Configuração** | Complexa | Simples |
| **Reputação** | Excelente | Boa |
| **Suporte** | 24/7 | Limitado |

## 🧪 Testes

### 1. Teste via Interface Web

Acesse: `http://localhost:8082/test-email-form.html`

### 2. Teste via Admin

No painel administrativo do RotaGo:
1. Acesse "Gerenciar Emails"
2. Selecione o provedor (SendGrid ou Hostinger)
3. Preencha o formulário de teste
4. Clique em "Enviar Teste"

### 3. Teste via Terminal

```bash
# Instalar PHPMailer
php install-phpmailer.php

# Iniciar servidor de teste
php -S localhost:8082

# Testar envio
curl -X POST http://localhost:8082/api/send-email-hostinger.php \
  -d "to=teste@email.com" \
  -d "subject=Teste" \
  -d "message=Mensagem de teste"
```

## 🔍 Logs e Monitoramento

### Tabela de Logs (Supabase)

```sql
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID REFERENCES contas(id),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,
  provider TEXT DEFAULT 'sendgrid',
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);
```

### Visualização de Logs

```typescript
const { emailLogs, loadEmailLogs } = useEmailManager();

// Carregar logs
await loadEmailLogs();

// Exibir estatísticas
console.log('Total enviados:', emailLogs.length);
console.log('Taxa de abertura:', emailLogs.filter(log => log.opened_at).length / emailLogs.length);
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. "Composer não encontrado"
```bash
# Solução: Use o instalador manual
php install-phpmailer.php
```

#### 2. "SMTP Authentication failed"
```
# Verifique:
- Email: contato@rotago.site
- Senha: 933755ViTor**
- Host: smtp.hostinger.com
- Porta: 465 (SSL) ou 587 (TLS)
```

#### 3. "Edge Function timeout"
```typescript
// Use o fallback PHP
const response = await fetch('/api/send-email-hostinger.php', {
  method: 'POST',
  body: formData
});
```

#### 4. "Email não chegou"
```
1. Verifique spam/lixo eletrônico
2. Confirme o email de destino
3. Verifique logs de erro
4. Teste com outro provedor
```

### Logs de Debug

```typescript
// Ativar debug no hook
const { sendEmail } = useEmailManager({ debug: true });

// Verificar console do navegador
// Verificar logs do Supabase
// Verificar logs do servidor PHP
```

## 🔄 Migração e Backup

### Backup de Configurações

```bash
# Exportar variáveis de ambiente
echo "SENDGRID_API_KEY=$SENDGRID_API_KEY" > .env.backup
echo "FROM_EMAIL=$FROM_EMAIL" >> .env.backup

# Backup da tabela de logs
pg_dump -t email_logs rotago_db > email_logs_backup.sql
```

### Migração entre Provedores

```typescript
// Configurar fallback automático
const sendEmailWithFallback = async (emailData) => {
  try {
    // Tentar SendGrid primeiro
    return await sendEmail({ ...emailData, provider: 'sendgrid' });
  } catch (error) {
    console.warn('SendGrid falhou, usando Hostinger:', error);
    // Fallback para Hostinger
    return await sendEmail({ ...emailData, provider: 'hostinger' });
  }
};
```

## 📈 Otimizações

### Performance

1. **Rate Limiting**: Máximo 10 emails/minuto
2. **Queue System**: Implementar fila para grandes volumes
3. **Caching**: Cache de templates
4. **Compression**: Minificar HTML dos emails

### Segurança

1. **Validação**: Sempre validar emails de destino
2. **Sanitização**: Limpar dados de entrada
3. **Rate Limiting**: Prevenir spam
4. **Logs**: Monitorar tentativas suspeitas

## 🎯 Próximos Passos

- [ ] Implementar sistema de filas
- [ ] Adicionar mais templates
- [ ] Integrar com analytics
- [ ] Implementar A/B testing
- [ ] Adicionar webhooks
- [ ] Criar dashboard de métricas

---

**Documentação atualizada em:** 21/08/2025  
**Versão:** 2.0  
**Autor:** Equipe RotaGo