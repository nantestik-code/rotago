import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { adminClient, corsHeaders, jsonResponse } from '../_shared/core.ts';
import { activatePaidSubscription, getAsaasSettings } from '../_shared/asaas.ts';

// Comparacao em tempo constante, para o endpoint nao virar um oraculo que
// revela o token caractere a caractere pela variacao no tempo de resposta.
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const settings = await getAsaasSettings();
    const incomingToken = req.headers.get('asaas-access-token') || '';

    // Falha fechada: sem token configurado, o endpoint fica recusando.
    // Antes ele so validava quando havia token, o que permitia a qualquer um
    // ativar uma assinatura com um POST (a funcao roda com verify_jwt=false).
    if (!settings.webhookToken) {
      console.error('[asaas-webhook] asaas_webhook_token nao configurado; recusando');
      return jsonResponse({ error: 'Webhook nao configurado' }, 503);
    }

    if (!timingSafeEqual(incomingToken, settings.webhookToken)) {
      return jsonResponse({ error: 'Webhook nao autorizado' }, 401);
    }

    const payload = await req.json();
    const event = String(payload.event || '');
    const payment = payload.payment as Record<string, unknown> | undefined;
    const checkout = payload.checkout as Record<string, unknown> | undefined;
    const subscription = payload.subscription as Record<string, unknown> | undefined;

    // SUBSCRIPTION_CREATED foi removido de proposito: no Asaas ele significa
    // que a assinatura foi criada, nao que foi paga. Tratar como pago liberava
    // acesso antes da cobranca ser confirmada.
    const paidEvents = new Set([
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'CHECKOUT_PAID',
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
