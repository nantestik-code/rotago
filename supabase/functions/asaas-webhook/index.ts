import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { adminClient, corsHeaders, jsonResponse } from '../_shared/mercadopago.ts';
import { activatePaidSubscription, getAsaasSettings } from '../_shared/asaas.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const settings = await getAsaasSettings();
    const incomingToken = req.headers.get('asaas-access-token') || '';
    if (settings.webhookToken && incomingToken !== settings.webhookToken) {
      return jsonResponse({ error: 'Webhook nao autorizado' }, 401);
    }

    const payload = await req.json();
    const event = String(payload.event || '');
    const payment = payload.payment as Record<string, unknown> | undefined;
    const checkout = payload.checkout as Record<string, unknown> | undefined;
    const subscription = payload.subscription as Record<string, unknown> | undefined;

    const paidEvents = new Set([
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'CHECKOUT_PAID',
      'SUBSCRIPTION_CREATED',
    ]);

    if (!paidEvents.has(event)) {
      return jsonResponse({ received: true, ignored: true, event });
    }

    const externalReference = String(
      payment?.externalReference ||
      checkout?.externalReference ||
      subscription?.externalReference ||
      '',
    );

    let localId = externalReference;
    if (!localId && payment?.subscription) {
      const { data } = await adminClient
        .from('user_subscriptions')
        .select('id')
        .contains('metadata', { asaas: { subscriptionId: payment.subscription } })
        .maybeSingle();
      localId = data?.id ?? '';
    }

    if (!localId) {
      return jsonResponse({ received: true, ignored: true, reason: 'sem referencia local', event });
    }

    const updated = await activatePaidSubscription({
      subscriptionId: localId,
      paidAt: String(payment?.confirmedDate || payment?.clientPaymentDate || new Date().toISOString()),
      asaas: {
        event,
        paymentId: payment?.id,
        checkoutId: checkout?.id,
        subscriptionId: payment?.subscription || subscription?.id,
        billingType: payment?.billingType,
        status: payment?.status || checkout?.status || subscription?.status,
      },
    });

    return jsonResponse({
      received: true,
      event,
      status: updated.status,
      subscription_id: updated.id,
    });
  } catch (error) {
    console.error('[asaas-webhook]', error);
    return jsonResponse(
      { received: false, error: error instanceof Error ? error.message : 'Erro interno' },
      500,
    );
  }
});
