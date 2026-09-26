// E-mails de autenticação do RotaGo, enviados por nós via Resend.
//
// O Supabase Auth só guarda os usuários: os links de confirmação e de
// redefinição de senha são gerados com auth.admin.generateLink, que NÃO
// dispara o e-mail do Supabase, e o envio sai daqui, de contato@rotago.site.
// A chave do Resend fica em system_settings (resend_api_key, is_secret).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const FROM = 'RotaGo <contato@rotago.site>';
const SITE_URL = 'https://rotago.site';
const ALLOWED_ORIGINS = [SITE_URL, 'http://localhost:8080'];

type Body =
  | { action: 'signup'; email: string; password: string; full_name: string; cpf: string; phone: string; redirect_to?: string }
  | { action: 'resend_signup'; email: string; redirect_to?: string }
  | { action: 'recovery'; email: string; redirect_to?: string };

async function resendKey(): Promise<string> {
  const { data, error } = await adminClient
    .from('system_settings')
    .select('value')
    .eq('key', 'resend_api_key')
    .single();
  if (error || !data?.value) throw new Error('Chave do Resend não configurada');
  return String(data.value);
}

async function send(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await resendKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Só aceita redirecionar para o próprio site, para o link não virar phishing. */
function safeRedirect(url: string | undefined, fallbackPath: string) {
  if (url && ALLOWED_ORIGINS.some((o) => url === o || url.startsWith(`${o}/`))) return url;
  return `${SITE_URL}${fallbackPath}`;
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px;color:#111827">
    <div style="font-size:24px;font-weight:800;color:#2563eb;margin-bottom:24px">RotaGo</div>
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
      RotaGo · <a href="${SITE_URL}" style="color:#9ca3af">rotago.site</a> · contato@rotago.site
    </p>
  </div></body></html>`;
}

function button(link: string, label: string) {
  return `<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700">${label}</a></p>
  <p style="font-size:12px;color:#6b7280">Se o botão não funcionar, copie e cole este link no navegador:<br>
  <a href="${link}" style="color:#2563eb;word-break:break-all">${link}</a></p>`;
}

function firstName(full?: unknown) {
  return String(full ?? '').trim().split(/\s+/)[0] ?? '';
}

function welcomeEmail(name: string, link: string) {
  return layout(
    `Bem-vindo ao RotaGo${name ? `, ${name}` : ''}!`,
    `<p>Que bom ter você com a gente. Sua conta foi criada e seu <b>teste grátis</b> já está garantido.</p>
     <p>Para começar, confirme seu e-mail:</p>
     ${button(link, 'Confirmar meu e-mail')}
     <p>Depois é só entrar, cadastrar suas entregas e deixar o RotaGo montar a melhor rota.</p>
     <p style="font-size:13px;color:#6b7280">Não criou uma conta no RotaGo? Pode ignorar este e-mail.</p>`,
  );
}

function recoveryEmail(name: string, link: string) {
  return layout(
    'Redefinição de senha',
    `<p>Olá${name ? `, ${name}` : ''}!</p>
     <p>Recebemos um pedido para redefinir a senha da sua conta no RotaGo.</p>
     ${button(link, 'Criar nova senha')}
     <p style="font-size:13px;color:#6b7280">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'Email inválido' }, 400);

  try {
    if (body.action === 'signup') {
      if (!body.password || body.password.length < 6) {
        return jsonResponse({ error: 'A senha deve ter pelo menos 6 caracteres' }, 400);
      }
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'signup',
        email,
        password: body.password,
        options: {
          // O gatilho handle_new_user cria o perfil a partir destes campos
          // e recusa CPF/telefone inválido ou duplicado.
          data: { full_name: body.full_name, cpf: body.cpf, phone: body.phone },
          redirectTo: safeRedirect(body.redirect_to, '/app'),
        },
      });
      if (error) return jsonResponse({ error: error.message }, error.status ?? 400);

      await send(email, 'Bem-vindo ao RotaGo! Confirme seu e-mail', welcomeEmail(firstName(body.full_name), data.properties.action_link));
      return jsonResponse({ ok: true });
    }

    if (body.action === 'resend_signup' || body.action === 'recovery') {
      const isRecovery = body.action === 'recovery';
      // magiclink confirma o e-mail ao ser aberto, então serve de reenvio.
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: isRecovery ? 'recovery' : 'magiclink',
        email,
        options: { redirectTo: safeRedirect(body.redirect_to, isRecovery ? '/auth/reset-password' : '/app') },
      });
      // Resposta igual exista ou não a conta, para não revelar quem é cliente.
      if (error) {
        console.warn('[auth-email] generateLink', body.action, error.message);
        return jsonResponse({ ok: true });
      }
      const name = firstName(data.user?.user_metadata?.full_name);
      if (isRecovery) {
        await send(email, 'Redefinir sua senha do RotaGo', recoveryEmail(name, data.properties.action_link));
      } else if (!data.user?.email_confirmed_at) {
        await send(email, 'Confirme seu e-mail no RotaGo', welcomeEmail(name, data.properties.action_link));
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Ação inválida' }, 400);
  } catch (err) {
    console.error('[auth-email]', err);
    return jsonResponse({ error: 'Não foi possível enviar o e-mail agora. Tente novamente.' }, 500);
  }
});
