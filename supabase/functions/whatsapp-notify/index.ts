import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  mode?: 'expired_trials' | 'expiring_soon' | 'single';
  action?: 'get_evolution_settings' | 'save_evolution_settings' | 'test_evolution_connection';
  userId?: string;       // Para mode=single
  phone?: string;        // Para mode=single (override)
  message?: string;      // Mensagem customizada
  dryRun?: boolean;      // true = só simula, não envia
  // Action-specific fields
  api_url?: string;
  instance?: string;
  api_key?: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse body early (needed for both action and mode branches)
    const body: NotifyRequest = await req.json();

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Token de autorização necessário');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Usuário não autenticado');

    // Cliente com service role para acesso total
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar se é admin. Fonte unica de verdade: profiles.role.
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .in('role', ['admin', 'super_admin', 'moderator'])
      .maybeSingle();

    if (adminError) throw new Error(`Falha ao validar permissao: ${adminError.message}`);
    if (!adminData) throw new Error('Acesso negado: apenas admins podem disparar notificações');

    // ─── Action-based requests (settings management) ───────────────
    if (body.action) {
      switch (body.action) {
        case 'get_evolution_settings': {
          const { data: getSettings } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .in('key', ['evolution_api_url', 'evolution_instance', 'evolution_api_key']);

          const getConfig: Record<string, string> = {};
          getSettings?.forEach((s: { key: string; value: string }) => { getConfig[s.key] = s.value; });

          const apiKey = getConfig['evolution_api_key'] || '';
          const maskedKey = apiKey.length > 4
            ? '****' + apiKey.slice(-4).toUpperCase()
            : apiKey ? '****' : '';

          return jsonResponse({
            api_url: getConfig['evolution_api_url'] || '',
            instance: getConfig['evolution_instance'] || '',
            api_key: maskedKey,
          });
        }

        case 'save_evolution_settings': {
          const { api_url, instance, api_key } = body;

          if (!api_url || !instance) {
            throw new Error('API URL e Instance são obrigatórios');
          }

          const upserts: { key: string; value: string; category: string; is_secret: boolean; updated_at: string }[] = [
            {
              key: 'evolution_api_url',
              value: api_url.trim(),
              category: 'notifications',
              is_secret: false,
              updated_at: new Date().toISOString(),
            },
            {
              key: 'evolution_instance',
              value: instance.trim(),
              category: 'notifications',
              is_secret: false,
              updated_at: new Date().toISOString(),
            },
          ];

          // Only update api_key if provided and not masked (i.e. user actually changed it)
          if (api_key && api_key.trim().length > 0 && !api_key.startsWith('****')) {
            upserts.push({
              key: 'evolution_api_key',
              value: api_key.trim(),
              category: 'notifications',
              is_secret: true,
              updated_at: new Date().toISOString(),
            });
          }

          const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert(upserts, { onConflict: 'key' });

          if (error) {
            throw new Error(`Falha ao salvar configurações: ${error.message}`);
          }

          return jsonResponse({ success: true });
        }

        case 'test_evolution_connection': {
          const { data: testSettings } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .in('key', ['evolution_api_url', 'evolution_instance', 'evolution_api_key']);

          const testConfig: Record<string, string> = {};
          testSettings?.forEach((s: { key: string; value: string }) => { testConfig[s.key] = s.value; });

          const apiUrl = testConfig['evolution_api_url'];
          const instanceName = testConfig['evolution_instance'];
          const apiKeyVal = testConfig['evolution_api_key'];

          if (!apiUrl || !instanceName || !apiKeyVal) {
            throw new Error('Configurações da Evolution API não encontradas. Configure antes de testar.');
          }

          try {
            const response = await fetch(
              `${apiUrl}/instance/connectionState/${instanceName}`,
              {
                headers: { 'apikey': apiKeyVal },
              }
            );

            if (!response.ok) {
              const errText = await response.text();
              return jsonResponse({
                connected: false,
                instanceName,
                state: 'error',
                error: `HTTP ${response.status}: ${errText}`,
              });
            }

            const result = await response.json();
            const state = result?.instance?.state || result?.state || 'unknown';
            const connected = state === 'open' || state === 'connected';

            return jsonResponse({
              connected,
              instanceName,
              state,
            });
          } catch (fetchError: any) {
            return jsonResponse({
              connected: false,
              instanceName,
              state: 'error',
              error: fetchError.message,
            });
          }
        }

        default:
          throw new Error('Ação não suportada');
      }
    }

    // ─── Mode-based requests (notification sending) ────────────────
    const { mode, userId, phone: overridePhone, message: customMessage, dryRun = false } = body;

    // Buscar configurações da Evolution
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['evolution_api_url', 'evolution_instance', 'evolution_api_key']);

    const notifyConfig: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { notifyConfig[s.key] = s.value; });

    const EVOLUTION_URL = notifyConfig['evolution_api_url'];
    const EVOLUTION_INSTANCE = notifyConfig['evolution_instance'];
    const EVOLUTION_KEY = notifyConfig['evolution_api_key'];

    if (!EVOLUTION_URL || !EVOLUTION_INSTANCE || !EVOLUTION_KEY) {
      throw new Error('Configurações da Evolution API não encontradas');
    }

    const results: { phone: string; email: string; name: string; status: string; error?: string }[] = [];

    if (mode === 'single' && userId) {
      // Enviar para um usuário específico
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', userId)
        .single();

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const phone = overridePhone || profile?.phone;

      if (!phone) {
        return new Response(JSON.stringify({ error: 'Usuário sem telefone cadastrado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const msg = customMessage || buildTrialExpiredMessage(profile?.full_name || 'Cliente');
      const result = await sendWhatsApp(EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_KEY, phone, msg, dryRun);
      results.push({ phone, email: authUser?.user?.email || '', name: profile?.full_name || '', ...result });

    } else if (mode === 'expired_trials') {
      // Buscar todos os trials expirados sem notificação enviada
      const { data: expiredSubs } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, user_id, trial_ends_at, whatsapp_notified_at')
        .eq('is_trial', true)
        .eq('is_active', false)
        .eq('status', 'expired')
        .is('whatsapp_notified_at', null);

      if (!expiredSubs || expiredSubs.length === 0) {
        return new Response(JSON.stringify({ message: 'Nenhum trial expirado sem notificação', results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const sub of expiredSubs) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, phone')
          .eq('id', sub.user_id)
          .single();

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
        const phone = profile?.phone;

        if (!phone) {
          results.push({ phone: '', email: authUser?.user?.email || '', name: profile?.full_name || '', status: 'skipped', error: 'Sem telefone' });
          continue;
        }

        const msg = customMessage || buildTrialExpiredMessage(profile?.full_name || 'Cliente');
        const result = await sendWhatsApp(EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_KEY, phone, msg, dryRun);
        results.push({ phone, email: authUser?.user?.email || '', name: profile?.full_name || '', ...result });

        // Marcar como notificado (mesmo em dry run para rastreamento)
        if (!dryRun && result.status === 'sent') {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({ whatsapp_notified_at: new Date().toISOString() })
            .eq('id', sub.id);
        }

        // Rate limit: aguardar 1s entre envios
        await new Promise(r => setTimeout(r, 1000));
      }

    } else if (mode === 'expiring_soon') {
      // Buscar trials que expiram nos próximos 2 dias e ainda não foram notificados
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const { data: expiringSubs } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, user_id, trial_ends_at, whatsapp_notified_at')
        .eq('is_trial', true)
        .eq('is_active', true)
        .gte('trial_ends_at', now.toISOString())
        .lte('trial_ends_at', twoDaysFromNow.toISOString())
        .is('whatsapp_notified_at', null);

      if (!expiringSubs || expiringSubs.length === 0) {
        return new Response(JSON.stringify({ message: 'Nenhum trial expirando em breve', results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const sub of expiringSubs) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, phone')
          .eq('id', sub.user_id)
          .single();

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
        const phone = profile?.phone;

        if (!phone) {
          results.push({ phone: '', email: authUser?.user?.email || '', name: profile?.full_name || '', status: 'skipped', error: 'Sem telefone' });
          continue;
        }

        const trialEnd = new Date(sub.trial_ends_at!);
        const diffHours = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
        const msg = customMessage || buildExpiringSoonMessage(profile?.full_name || 'Cliente', diffHours);
        const result = await sendWhatsApp(EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_KEY, phone, msg, dryRun);
        results.push({ phone, email: authUser?.user?.email || '', name: profile?.full_name || '', ...result });

        if (!dryRun && result.status === 'sent') {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({ whatsapp_notified_at: new Date().toISOString() })
            .eq('id', sub.id);
        }

        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      summary: { total: results.length, sent, failed, skipped },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro na função whatsapp-notify:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function sendWhatsApp(
  baseUrl: string,
  instance: string,
  apiKey: string,
  phone: string,
  text: string,
  dryRun: boolean
): Promise<{ status: string; error?: string }> {
  if (dryRun) return { status: 'sent' }; // Simula envio

  // Formata número: remove tudo não numérico, adiciona 55 se necessário
  let number = phone.replace(/\D/g, '');
  if (!number.startsWith('55')) number = `55${number}`;

  try {
    const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, text }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { status: 'error', error: `HTTP ${response.status}: ${err}` };
    }

    return { status: 'sent' };
  } catch (e: any) {
    return { status: 'error', error: e.message };
  }
}

function buildTrialExpiredMessage(name: string): string {
  const firstName = name.split(' ')[0];
  return `Olá, ${firstName}! 👋

Seu período de teste gratuito do *RotaFacil* expirou.

🚚 Para continuar organizando suas rotas de entrega sem interrupções, ative seu plano agora:

👉 https://rotago.site/subscription

Escolha o plano que melhor se encaixa na sua operação. Se tiver dúvidas, é só responder essa mensagem!

Equipe RotaFacil 🗺️`;
}

function buildExpiringSoonMessage(name: string, hoursLeft: number): string {
  const firstName = name.split(' ')[0];
  const timeLabel = hoursLeft <= 24 ? `${hoursLeft} horas` : `${Math.ceil(hoursLeft / 24)} dias`;
  return `Olá, ${firstName}! ⏰

Seu período de teste gratuito do *RotaFacil* vai expirar em *${timeLabel}*.

Não perca o acesso às suas rotas! Assine agora e continue sem interrupções:

👉 https://rotago.site/subscription

Equipe RotaFacil 🗺️`;
}
