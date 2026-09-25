import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  adminClient,
  assertAdmin,
  corsHeaders,
  getAuthenticatedContext,
  jsonResponse,
} from '../_shared/mercadopago.ts';
import {
  activatePaidSubscription,
  asaasBaseUrl,
  asaasFetch,
  createPendingSubscription,
  ensureAsaasCustomer,
  getAsaasSettings,
  mapPlanCycle,
} from '../_shared/asaas.ts';

type RequestAction =
  | 'create_checkout'
  | 'sync_payment'
  | 'get_admin_settings'
  | 'save_admin_settings'
  | 'test_admin_connection'
  | 'admin_activate'
  | 'admin_sync';

interface AsaasRequest {
  action: RequestAction;
  planId?: string;
  payerName?: string;
  payerEmail?: string;
  origin?: string;
  subscriptionId?: string;
  asaas_api_key?: string;
  asaas_sandbox?: string;
  asaas_webhook_token?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Metodo nao permitido' }, 405);
    }

    const body = (await req.json()) as AsaasRequest;
    const { user } = await getAuthenticatedContext(req);

    switch (body.action) {
      case 'create_checkout': {
        if (!body.planId) {
          return jsonResponse({ error: 'planId obrigatorio' }, 400);
        }

        const settings = await getAsaasSettings();
        if (!settings.apiKey) {
          return jsonResponse({ error: 'API Key do Asaas nao configurada no painel admin' }, 400);
        }

        const { data: plan, error: planError } = await adminClient
          .from('subscription_plans')
          .select('id, name, description, total, price, frequency, frequency_type, is_active')
          .eq('id', body.planId)
          .eq('is_active', true)
          .maybeSingle();

        if (planError) return jsonResponse({ error: planError.message }, 400);
        if (!plan) return jsonResponse({ error: 'Plano nao encontrado ou inativo' }, 404);

        const pending = await createPendingSubscription({
          userId: user.id,
          userEmail: body.payerEmail ?? user.email ?? null,
          planId: plan.id,
          source: 'asaas_checkout',
        });

        const origin = (body.origin || req.headers.get('origin') || 'https://rotago.site').replace(/\/$/, '');
        const customerId = await ensureAsaasCustomer({
          userId: user.id,
          name: body.payerName || user.user_metadata?.full_name || 'Usuario RotaGo',
          email: body.payerEmail || user.email || '',
        });

        const value = Number(plan.total ?? plan.price ?? 0);
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 1);
        const nextDueDate = nextDue.toISOString().slice(0, 10);

        const checkout = await asaasFetch('/checkouts', {
          method: 'POST',
          body: JSON.stringify({
            billingTypes: ['PIX', 'CREDIT_CARD'],
            chargeTypes: ['RECURRENT'],
            minutesToExpire: 60,
            externalReference: pending.id,
            customer: customerId,
            callback: {
              successUrl: `${origin}/subscription?payment=success&ref=${pending.id}`,
              cancelUrl: `${origin}/subscription?payment=failure&ref=${pending.id}`,
              expiredUrl: `${origin}/subscription?payment=expired&ref=${pending.id}`,
              autoRedirect: true,
            },
            items: [
              {
                name: `${plan.name} - RotaGo`,
                description: plan.description ?? plan.name,
                quantity: 1,
                value,
              },
            ],
            subscription: {
              cycle: mapPlanCycle(Number(plan.frequency ?? 1), plan.frequency_type),
              nextDueDate,
            },
          }),
        });

        const initPoint = String(checkout.link || checkout.url || '');
        await adminClient
          .from('user_subscriptions')
          .update({
            metadata: {
              ...(pending.metadata ?? {}),
              asaas: {
                customerId,
                checkoutId: checkout.id,
                init_point: initPoint,
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', pending.id);

        if (!initPoint) {
          return jsonResponse({ error: 'Asaas nao retornou link de pagamento' }, 400);
        }

        return jsonResponse({
          id: checkout.id,
          status: checkout.status ?? 'pending',
          init_point: initPoint,
          user_subscription_id: pending.id,
        });
      }

      case 'sync_payment': {
        if (!body.subscriptionId) {
          return jsonResponse({ error: 'subscriptionId obrigatorio' }, 400);
        }

        const { data: subscription, error } = await adminClient
          .from('user_subscriptions')
          .select('id, user_id, metadata, status, is_active')
          .eq('id', body.subscriptionId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) return jsonResponse({ error: error.message }, 400);
        if (!subscription) return jsonResponse({ error: 'Assinatura nao encontrada' }, 404);

        if (subscription.is_active && subscription.status === 'active') {
          return jsonResponse({ status: 'active', subscription_id: subscription.id });
        }

        const asaasMeta = ((subscription.metadata ?? {}) as Record<string, unknown>).asaas as Record<string, unknown> | undefined;
        const checkoutId = asaasMeta?.checkoutId ? String(asaasMeta.checkoutId) : '';
        const asaasSubId = asaasMeta?.subscriptionId ? String(asaasMeta.subscriptionId) : '';

        if (asaasSubId) {
          const remote = await asaasFetch(`/subscriptions/${asaasSubId}`);
          if (String(remote.status).toUpperCase() === 'ACTIVE') {
            const updated = await activatePaidSubscription({
              subscriptionId: subscription.id,
              asaas: { ...asaasMeta, subscriptionId: asaasSubId, status: remote.status },
            });
            return jsonResponse({ status: updated.status, subscription_id: updated.id });
          }
        }

        if (checkoutId) {
          const remote = await asaasFetch(`/checkouts/${checkoutId}`);
          if (String(remote.status).toUpperCase() === 'PAID') {
            const updated = await activatePaidSubscription({
              subscriptionId: subscription.id,
              asaas: { ...asaasMeta, checkoutId, status: remote.status },
            });
            return jsonResponse({ status: updated.status, subscription_id: updated.id });
          }
          return jsonResponse({ status: remote.status ?? subscription.status, subscription_id: subscription.id });
        }

        return jsonResponse({ status: subscription.status, subscription_id: subscription.id });
      }

      case 'get_admin_settings': {
        await assertAdmin(user.id, user.email);
        const settings = await getAsaasSettings();
        return jsonResponse({
          asaas_sandbox: settings.sandbox ? 'true' : 'false',
          asaas_webhook_token_configured: Boolean(settings.webhookToken),
          api_key_configured: Boolean(settings.apiKey),
          webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/asaas-webhook`,
        });
      }

      case 'save_admin_settings': {
        await assertAdmin(user.id, user.email);
        const upserts = [
          { key: 'asaas_sandbox', value: body.asaas_sandbox === 'false' ? 'false' : 'true' },
        ];
        if (body.asaas_api_key) upserts.push({ key: 'asaas_api_key', value: body.asaas_api_key });
        if (body.asaas_webhook_token) upserts.push({ key: 'asaas_webhook_token', value: body.asaas_webhook_token });

        for (const row of upserts) {
          const { error } = await adminClient
            .from('system_settings')
            .upsert({
              key: row.key,
              value: row.value,
              category: 'payment',
              is_secret: row.key !== 'asaas_sandbox',
              description: row.key,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });
          if (error) return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse({ ok: true });
      }

      case 'test_admin_connection': {
        await assertAdmin(user.id, user.email);
        const settings = await getAsaasSettings();
        const apiKey = body.asaas_api_key || settings.apiKey;
        if (!apiKey) return jsonResponse({ error: 'API Key ausente' }, 400);
        const sandbox = (body.asaas_sandbox ?? (settings.sandbox ? 'true' : 'false')) === 'true';
        const response = await fetch(`${asaasBaseUrl(sandbox)}/finance/balance`, {
          headers: {
            accept: 'application/json',
            access_token: apiKey,
            'User-Agent': 'RotaGo/1.0',
          },
        });
        if (!response.ok) {
          return jsonResponse({ error: `Asaas retornou ${response.status}` }, 400);
        }
        const balance = await response.json();
        return jsonResponse({ ok: true, balance });
      }

      case 'admin_activate': {
        await assertAdmin(user.id, user.email);
        if (!body.subscriptionId) return jsonResponse({ error: 'subscriptionId obrigatorio' }, 400);
        const updated = await activatePaidSubscription({
          subscriptionId: body.subscriptionId,
          asaas: { source: 'admin_activate' },
        });
        return jsonResponse({ status: updated.status, subscription_id: updated.id });
      }

      case 'admin_sync': {
        await assertAdmin(user.id, user.email);
        if (!body.subscriptionId) return jsonResponse({ error: 'subscriptionId obrigatorio' }, 400);
        const { data: subscription } = await adminClient
          .from('user_subscriptions')
          .select('id, metadata')
          .eq('id', body.subscriptionId)
          .maybeSingle();
        if (!subscription) return jsonResponse({ error: 'Assinatura nao encontrada' }, 404);
        const asaasMeta = ((subscription.metadata ?? {}) as Record<string, unknown>).asaas as Record<string, unknown> | undefined;
        const asaasSubId = asaasMeta?.subscriptionId ? String(asaasMeta.subscriptionId) : '';
        if (!asaasSubId) return jsonResponse({ error: 'Sem subscriptionId Asaas para sincronizar' }, 400);
        const remote = await asaasFetch(`/subscriptions/${asaasSubId}`);
        if (String(remote.status).toUpperCase() === 'ACTIVE') {
          const updated = await activatePaidSubscription({
            subscriptionId: subscription.id,
            asaas: { ...asaasMeta, subscriptionId: asaasSubId, status: remote.status },
          });
          return jsonResponse({ status: updated.status, subscription_id: updated.id });
        }
        return jsonResponse({ status: remote.status });
      }

      default:
        return jsonResponse({ error: 'Acao invalida' }, 400);
    }
  } catch (error) {
    console.error('[asaas-checkout]', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
