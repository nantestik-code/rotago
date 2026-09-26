// E-mails de autenticação do RotaGo, enviados por nós via Resend.
//
// O Supabase Auth só guarda os usuários. Os tokens de confirmação e de
// redefinição de senha são gerados com auth.admin.generateLink, que NÃO
// dispara o e-mail do Supabase, e o envio sai daqui, de contato@rotago.site.
//
// O link do e-mail aponta para /auth/confirm do próprio site com o token_hash;
// a página valida com supabase.auth.verifyOtp. Não usamos o action_link do
// generateLink porque ele volta no formato implícito (#access_token), que o
// cliente do app (flowType 'pkce') recusa.
//
// A chave do Resend fica em system_settings (resend_api_key, is_secret) e cada
// envio é registrado em auth_email_log, que também limita tentativas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { LOGO_PNG_BASE64 } from './logo.ts';
import {
  type Email,
  SITE_URL,
  SUPPORT_EMAIL,
  confirmEmail,
  passwordChangedEmail,
  recoveryEmail,
  welcomeEmail,
} from './templates.ts';

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

const FROM = `RotaGo <${SUPPORT_EMAIL}>`;
const ALLOWED_ORIGINS = [SITE_URL, 'https://www.rotago.site', 'http://localhost:8080'];
const MAX_EMAILS_PER_HOUR = 5;

type Action = 'signup' | 'resend_signup' | 'recovery' | 'password_changed';
type Body = {
  action: Action;
  email?: string;
  password?: string;
  full_name?: string;
  cpf?: string;
  phone?: string;
  redirect_to?: string;
};

// ---------------------------------------------------------------- helpers

async function getSetting(key: string): Promise<string | null> {
  const { data } = await adminClient.from('system_settings').select('value').eq('key', key).maybeSingle();
  return data?.value != null ? String(data.value) : null;
}

async function log(email: string, action: Action, status: string, extra: { resend_id?: string; error?: string } = {}) {
  const { error } = await adminClient.from('auth_email_log').insert({ email, action, status, ...extra });
  if (error) console.error('[auth-email] falha ao registrar log', error.message);
}

async function isRateLimited(email: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from('auth_email_log')
    .select('id', { count: 'exact', head: true })
    .ilike('email', email)
    .in('status', ['sent', 'failed'])
    .gte('created_at', since);
  return (count ?? 0) >= MAX_EMAILS_PER_HOUR;
}

async function send(to: string, action: Action, email: Email) {
  const key = await getSetting('resend_api_key');
  if (!key) throw new Error('Chave do Resend não configurada (system_settings.resend_api_key)');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: SUPPORT_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [
        { filename: 'rotago.png', content: LOGO_PNG_BASE64, content_type: 'image/png', content_id: 'rotago-logo' },
      ],
      tags: [{ name: 'category', value: action }],
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = `Resend ${res.status}: ${payload?.message ?? JSON.stringify(payload)}`;
    await log(to, action, 'failed', { error: message });
    throw new Error(message);
  }
  await log(to, action, 'sent', { resend_id: payload?.id });
}

/** Origem do link: só o próprio site (ou localhost em dev), nunca outro domínio. */
function originFrom(redirectTo?: string) {
  if (redirectTo) {
    try {
      const origin = new URL(redirectTo).origin;
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
    } catch {
      // URL inválida: usa o site
    }
  }
  return SITE_URL;
}

function confirmLink(origin: string, tokenHash: string, type: string, next: string) {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${origin}/auth/confirm?${params}`;
}

function firstName(full?: unknown) {
  const first = String(full ?? '').trim().split(/\s+/)[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
}

async function trialDays() {
  const n = Number(await getSetting('trial_duration_days'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ---------------------------------------------------------------- handlers

async function handleSignup(body: Body, email: string) {
  if (!body.password || body.password.length < 6) {
    return jsonResponse({ error: 'A senha deve ter pelo menos 6 caracteres' }, 400);
  }
  if (await isRateLimited(email)) {
    await log(email, 'signup', 'rate_limited');
    return jsonResponse({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429);
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password: body.password,
    options: {
      // O gatilho handle_new_user cria o perfil a partir destes campos
      // e recusa CPF/telefone inválido ou duplicado.
      data: { full_name: body.full_name, cpf: body.cpf, phone: body.phone },
    },
  });
  if (error) {
    // Mantém a mensagem original: o front traduz "already registered",
    // "CPF ja esta cadastrado", "telefone ja esta cadastrado" etc.
    return jsonResponse({ error: error.message }, error.status && error.status < 500 ? error.status : 400);
  }

  const origin = originFrom(body.redirect_to);
  const link = confirmLink(origin, data.properties.hashed_token, data.properties.verification_type, '/app');
  try {
    await send(email, 'signup', welcomeEmail(firstName(body.full_name), link, await trialDays()));
  } catch (err) {
    // A conta já existe; a pessoa pode pedir o reenvio na tela de login.
    console.error('[auth-email] signup criado, mas e-mail falhou', err);
    return jsonResponse({ ok: true, email_sent: false });
  }
  return jsonResponse({ ok: true, email_sent: true });
}

async function handleLinkRequest(body: Body, email: string, action: 'resend_signup' | 'recovery') {
  // Resposta sempre igual, exista ou não a conta, para não revelar quem é cliente.
  const ok = jsonResponse({ ok: true });

  if (await isRateLimited(email)) {
    await log(email, action, 'rate_limited');
    return ok;
  }

  const { data: userRow } = await adminClient.rpc('auth_email_lookup_user', { p_email: email });
  const user = Array.isArray(userRow) ? userRow[0] : userRow;
  if (!user) {
    await log(email, action, 'skipped', { error: 'usuário não encontrado' });
    return ok;
  }
  if (action === 'resend_signup' && user.email_confirmed) {
    await log(email, action, 'skipped', { error: 'e-mail já confirmado' });
    return ok;
  }

  const isRecovery = action === 'recovery';
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: isRecovery ? 'recovery' : 'magiclink',
    email,
  });
  if (error) {
    await log(email, action, 'failed', { error: error.message });
    return ok;
  }

  const origin = originFrom(body.redirect_to);
  const name = firstName(user.full_name);
  const { hashed_token, verification_type } = data.properties;
  if (isRecovery) {
    const link = confirmLink(origin, hashed_token, verification_type, '/auth/reset-password?type=recovery');
    await send(email, action, recoveryEmail(name, link));
  } else {
    const link = confirmLink(origin, hashed_token, verification_type, '/app');
    await send(email, action, confirmEmail(name, link));
  }
  return ok;
}

async function handlePasswordChanged(req: Request) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data, error } = await adminClient.auth.getUser(jwt);
  if (error || !data.user?.email) return jsonResponse({ error: 'Não autenticado' }, 401);

  const user = data.user;
  const userEmail = data.user.email;
  // Só vale logo depois de uma troca real de senha, não a qualquer momento.
  const updatedAt = new Date(user.updated_at ?? 0).getTime();
  if (Date.now() - updatedAt > 5 * 60 * 1000) {
    await log(userEmail, 'password_changed', 'skipped', { error: 'sem alteração recente' });
    return jsonResponse({ ok: true });
  }
  if (await isRateLimited(userEmail)) {
    await log(userEmail, 'password_changed', 'rate_limited');
    return jsonResponse({ ok: true });
  }

  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  await send(
    userEmail,
    'password_changed',
    passwordChangedEmail(firstName(profile?.full_name ?? user.user_metadata?.full_name), new Date()),
  );
  return jsonResponse({ ok: true });
}

// ---------------------------------------------------------------- entrada

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  try {
    if (body.action === 'password_changed') return await handlePasswordChanged(req);

    const email = String(body.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: 'Email inválido' }, 400);

    if (body.action === 'signup') return await handleSignup(body, email);
    if (body.action === 'resend_signup' || body.action === 'recovery') {
      return await handleLinkRequest(body, email, body.action);
    }
    return jsonResponse({ error: 'Ação inválida' }, 400);
  } catch (err) {
    console.error('[auth-email]', err);
    return jsonResponse({ error: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' }, 500);
  }
});
