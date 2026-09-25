import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  adminClient,
  assertAdmin,
  corsHeaders,
  createPendingSubscription,
  fetchMercadoPagoPayment,
  getAuthenticatedContext,
  getMercadoPagoSettings,
  jsonResponse,
  syncSubscriptionFromPayment,
} from '../_shared/mercadopago.ts';

type RequestAction =
  | 'create_checkout_pro_preference'
  | 'sync_payment_status'
  | 'get_admin_settings'
  | 'save_admin_settings'
  | 'test_admin_connection';

interface MercadoPagoRequest {
  action: RequestAction;
  planId?: string;
  payerName?: string;
  payerEmail?: string;
  origin?: string;
  paymentId?: string;
  mp_public_key?: string;
  mp_access_token?: string;
  mp_webhook_url?: string;
  mp_sandbox_mode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Metodo nao permitido' }, 405);
    }

    const body = (await req.json()) as MercadoPagoRequest;
    const { user } = await getAuthenticatedContext(req);

    switch (body.action) {
      case 'create_checkout_pro_preference': {
        if (!body.planId) {
          return jsonResponse({ error: 'planId obrigatorio' }, 400);
        }

        const settings = await getMercadoPagoSettings();
        if (!settings.accessToken) {
          return jsonResponse({ error: 'Access Token do Mercado Pago nao configurado no painel admin' }, 400);
        }

        const { data: plan, error: planError } = await adminClient
          .from('subscription_plans')
          .select('id, name, description, total, frequency, frequency_type, is_active, mercadopago_plan_id')
          .eq('id', body.planId)
          .eq('is_active', true)
          .maybeSingle();

        if (planError) {
          return jsonResponse({ error: `Falha ao buscar plano: ${planError.message}` }, 400);
        }

        if (!plan) {
          return jsonResponse({ error: 'Plano nao encontrado ou inativo' }, 404);
        }

        const pendingSubscription = await createPendingSubscription({
          userId: user.id,
          userEmail: body.payerEmail ?? user.email ?? null,
          planId: plan.id,
          source: 'mercadopago_checkout_pro',
        });

        const origin =
          body.origin ||
          req.headers.get('origin') ||
          'https://rotago.site';

        const sanitizedOrigin = origin.replace(/\/$/, '');
        const webhookUrl =
          settings.webhookUrl?.trim() ||
          `${sanitizedOrigin}/functions/v1/mercadopago-webhook`;

        const isLocalhost = sanitizedOrigin.includes('localhost') || sanitizedOrigin.includes('127.0.0.1');

        const preference: Record<string, unknown> = {
          items: [
            {
              id: plan.id,
              title: `${plan.name} - RotaGo`,
              description: plan.description ?? plan.name,
              quantity: 1,
              unit_price: Number(plan.total),
              currency_id: 'BRL',
            },
          ],
          payer: {
            name: body.payerName || user.user_metadata?.full_name || 'Usuario',
            email: body.payerEmail || user.email || '',
          },
          back_urls: {
            success: `${sanitizedOrigin}/subscription?payment=success`,
            failure: `${sanitizedOrigin}/subscription?payment=failure`,
            pending: `${sanitizedOrigin}/subscription?payment=pending`,
          },
          external_reference: pendingSubscription.id,
          metadata: {
            user_id: user.id,
            plan_id: plan.id,
            user_subscription_id: pendingSubscription.id,
          },
          notification_url: webhookUrl,
        };

        // auto_return requer back_url.success com URL pública — não funciona em localhost
        if (!isLocalhost) {
          preference.auto_return = 'approved';
        }

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.accessToken}`,
          },
          body: JSON.stringify(preference),
        });

        if (!mpResponse.ok) {
          const errorText = await mpResponse.text();
          console.error('[mercadopago-checkout] MP error:', mpResponse.status, errorText);
          console.error('[mercadopago-checkout] preference payload:', JSON.stringify(preference));
          return jsonResponse(
            { error: `Mercado Pago retornou ${mpResponse.status}: ${errorText}` },
            400,
          );
        }

        const mpPreference = await mpResponse.json();

        await adminClient
          .from('user_subscriptions')
          .update({
            external_id: String(mpPreference.id),
            metadata: {
              ...(pendingSubscription.metadata ?? {}),
              mercadopago: {
                preference_id: mpPreference.id,
                checkout_type: 'checkout_pro',
                init_point: mpPreference.init_point ?? null,
                sandbox_init_point: mpPreference.sandbox_init_point ?? null,
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingSubscription.id);

        return jsonResponse({
          id: mpPreference.id,
          status: mpPreference.status ?? 'pending',
          init_point: mpPreference.init_point,
          sandbox_init_point: mpPreference.sandbox_init_point,
          user_subscription_id: pendingSubscription.id,
        });
      }

      case 'sync_payment_status': {
        if (!body.paymentId) {
          return jsonResponse({ error: 'paymentId obrigatorio' }, 400);
        }

        const payment = await fetchMercadoPagoPayment(body.paymentId);
        const syncResult = await syncSubscriptionFromPayment(payment);

        return jsonResponse({
          success: true,
          status: syncResult.subscription.status,
          subscription: syncResult.subscription,
        });
      }

      case 'get_admin_settings': {
        await assertAdmin(user.id, user.email);
        const settings = await getMercadoPagoSettings();

        return jsonResponse({
          mp_public_key: settings.publicKey,
          mp_webhook_url: settings.webhookUrl,
          mp_sandbox_mode: settings.sandboxMode ? 'true' : 'false',
          access_token_configured: Boolean(settings.accessToken),
        });
      }

      case 'save_admin_settings': {
        await assertAdmin(user.id, user.email);

        const settings = await getMercadoPagoSettings();
        const nextAccessToken =
          body.mp_access_token && body.mp_access_token.trim().length > 0
            ? body.mp_access_token.trim()
            : settings.accessToken;

        const upserts = [
          {
            key: 'mp_public_key',
            value: body.mp_public_key?.trim() ?? settings.publicKey,
            category: 'payment',
            is_secret: false,
            updated_at: new Date().toISOString(),
          },
          {
            key: 'mp_access_token',
            value: nextAccessToken,
            category: 'payment',
            is_secret: true,
            updated_at: new Date().toISOString(),
          },
          {
            key: 'mp_webhook_url',
            value: body.mp_webhook_url?.trim() ?? settings.webhookUrl,
            category: 'payment',
            is_secret: false,
            updated_at: new Date().toISOString(),
          },
          {
            key: 'mp_sandbox_mode',
            value: body.mp_sandbox_mode === 'true' ? 'true' : 'false',
            category: 'payment',
            is_secret: false,
            updated_at: new Date().toISOString(),
          },
        ];

        const { error } = await adminClient
          .from('system_settings')
          .upsert(upserts, { onConflict: 'key' });

        if (error) {
          return jsonResponse({ error: `Falha ao salvar configuracoes: ${error.message}` }, 400);
        }

        return jsonResponse({
          success: true,
          mp_public_key: upserts[0].value,
          mp_webhook_url: upserts[2].value,
          mp_sandbox_mode: upserts[3].value,
          access_token_configured: Boolean(nextAccessToken),
        });
      }

      case 'test_admin_connection': {
        await assertAdmin(user.id, user.email);

        const settings = await getMercadoPagoSettings();
        const token =
          body.mp_access_token && body.mp_access_token.trim().length > 0
            ? body.mp_access_token.trim()
            : settings.accessToken;

        if (!token) {
          return jsonResponse({ error: 'Access Token nao configurado' }, 400);
        }

        const response = await fetch('https://api.mercadopago.com/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return jsonResponse({ error: `Mercado Pago retornou ${response.status}: ${errorText}` }, 400);
        }

        const account = await response.json();

        return jsonResponse({
          success: true,
          account: {
            id: account.id,
            email: account.email ?? null,
            nickname: account.nickname ?? null,
          },
        });
      }

      default:
        return jsonResponse({ error: 'Acao nao suportada' }, 400);
    }
  } catch (error) {
    console.error('[mercadopago-checkout] erro:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      500,
    );
  }
});
