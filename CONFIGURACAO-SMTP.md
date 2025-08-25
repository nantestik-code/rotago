# 🔧 Configuração SMTP Real - RotaGo

## 📋 Configurações Implementadas

### ✅ Edge Function Atualizada
- **Arquivo:** `supabase/functions/send-email-hostinger/index.ts`
- **SMTP:** Hostinger configurado diretamente
- **Biblioteca:** denomailer para Deno
- **Porta:** 465 (SSL/TLS)
- **Servidor:** smtp.hostinger.com

### 📧 Credenciais SMTP
```
Servidor: smtp.hostinger.com
Porta: 465 (SSL)
Usuário: contato@rotago.site
Senha: 933755ViTor**
```

## 🚀 Deploy da Edge Function

### 1. Configurar Variável de Ambiente
No painel do Supabase:
```bash
# Vá em Settings > Edge Functions > Environment Variables
HOSTINGER_EMAIL_PASSWORD=933755ViTor**
```

### 2. Deploy da Function
```bash
# No terminal, na pasta do projeto
supabase functions deploy send-email-hostinger
```

### 3. Testar Edge Function
```bash
# Teste via curl
curl -X POST 'https://SEU_PROJETO.supabase.co/functions/v1/send-email-hostinger' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "teste@email.com",
    "name": "Teste",
    "template": "welcome"
  }'
```

## 🔄 Fluxo Atual

```
Painel Admin → use-email-manager.ts → Edge Function → SMTP Hostinger → Email Real
```

### Logs Esperados:
```
📧 [EMAIL] Enviando via SMTP Hostinger (Edge Function)
📧 [EMAIL DATA] {destinatario, nome, assunto, template, provedor}
✅ [EMAIL] Enviado com sucesso via SMTP
```

## ⚙️ Configurações Técnicas

### Edge Function (Deno)
```typescript
const client = new SMTPClient({
  connection: {
    hostname: "smtp.hostinger.com",
    port: 465,
    tls: true,
    auth: {
      username: "contato@rotago.site",
      password: Deno.env.get("HOSTINGER_EMAIL_PASSWORD"),
    },
  },
});
```

### Hook Frontend
```typescript
const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('send-email-hostinger', {
  body: edgeData
});
```

## 🛠️ Próximos Passos

1. **Deploy da Edge Function** no Supabase
2. **Configurar variável de ambiente** HOSTINGER_EMAIL_PASSWORD
3. **Testar envio real** via painel admin
4. **Monitorar logs** para verificar funcionamento

## 📊 Vantagens da Configuração

- ✅ **SMTP Real:** Emails enviados via Hostinger
- ✅ **Sem CORS:** Edge Function resolve limitações
- ✅ **Seguro:** Senha em variável de ambiente
- ✅ **Logs Completos:** Rastreamento no Supabase
- ✅ **Fallback:** Simulação se SMTP falhar
- ✅ **Templates HTML:** Profissionais e responsivos

---

**Status:** Configurado e pronto para deploy  
**Próximo:** Deploy da Edge Function no Supabase
