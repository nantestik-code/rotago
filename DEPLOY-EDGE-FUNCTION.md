# 🚀 Deploy da Edge Function - Email Real

## Passo 1: Acesse o Painel Supabase
1. Vá para https://supabase.com/dashboard
2. Entre no seu projeto RotaGo

## Passo 2: Criar Edge Function
1. Menu lateral → **Edge Functions**
2. Clique em **"Create a new function"**
3. Nome: `send-email-hostinger`

## Passo 3: Cole o Código Completo
Copie todo o conteúdo do arquivo `supabase/functions/send-email-hostinger/index.ts` e cole no editor do painel.

## Passo 4: Configurar Variável de Ambiente
1. No painel → **Settings** → **Environment Variables**
2. Adicionar nova variável:
   - **Nome:** `HOSTINGER_EMAIL_PASSWORD`
   - **Valor:** `933755ViTor**`

## Passo 5: Deploy
1. Clique em **"Deploy function"**
2. Aguarde o deploy completar

## Passo 6: Testar
1. Vá no painel administrativo do RotaGo
2. Envie um email de teste
3. Monitore logs no console

## Logs Esperados (Produção):
```
📧 [EMAIL] Enviando via SMTP Hostinger (Edge Function)
📧 [EMAIL DATA] {destinatario, nome, assunto, template, provedor}
✅ [EMAIL] Enviado com sucesso via SMTP
```

## Fallback
Se SMTP falhar, sistema usa simulação automaticamente.
