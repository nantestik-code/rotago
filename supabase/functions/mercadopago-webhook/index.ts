import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  fetchMercadoPagoPayment,
  fetchMercadoPagoPreapproval,
  jsonResponse,
  syncSubscriptionFromPayment,
  syncSubscriptionFromPreapproval,
} from '../_shared/mercadopago.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let resourceId =
      url.searchParams.get('data.id') ||
      url.searchParams.get('id') ||
      null;

    let topic =
      url.searchParams.get('type') ||
      url.searchParams.get('topic') ||
      null;

    if (req.method === 'POST') {
      const rawBody = await req.text();
      if (rawBody) {
        try {
          const body = JSON.parse(rawBody);
          resourceId =
            body?.data?.id?.toString?.() ||
            body?.id?.toString?.() ||
            resourceId;
          topic =
            body?.type?.toString?.() ||
            body?.topic?.toString?.() ||
            body?.action?.toString?.().split('.')?.[0] ||
            topic;
        } catch {
          // Mantem fallback via querystring.
        }
      }
    }

    if (!resourceId) {
      return jsonResponse({
        received: true,
        ignored: true,
        reason: 'notificacao sem identificador',
      });
    }

    if (topic === 'payment') {
      const payment = await fetchMercadoPagoPayment(resourceId);
      const result = await syncSubscriptionFromPayment(payment);

      return jsonResponse({
        received: true,
        topic,
        payment_id: resourceId,
        status: result.subscription.status,
        subscription_id: result.subscription.id,
      });
    }

    if (topic === 'subscription_preapproval') {
      const preapproval = await fetchMercadoPagoPreapproval(resourceId);
      const result = await syncSubscriptionFromPreapproval(preapproval);

      return jsonResponse({
        received: true,
        topic,
        preapproval_id: resourceId,
        status: result.subscription.status,
        subscription_id: result.subscription.id,
      });
    }

    return jsonResponse({
      received: true,
      ignored: true,
      reason: `topico ignorado: ${topic ?? 'desconhecido'}`,
    });
  } catch (error) {
    console.error('[mercadopago-webhook] erro:', error);
    return jsonResponse(
      {
        received: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
      },
      500,
    );
  }
});
