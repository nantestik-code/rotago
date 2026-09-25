import {
  adminClient,
  calculatePeriodEnd,
  createPendingSubscription,
} from './core.ts';

export interface AsaasSettings {
  apiKey: string;
  sandbox: boolean;
  webhookToken: string;
}

export function asaasBaseUrl(sandbox: boolean) {
  return sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
}

export async function getAsaasSettings(): Promise<AsaasSettings> {
  const { data, error } = await adminClient
    .from('system_settings')
    .select('key, value')
    .in('key', ['asaas_api_key', 'asaas_sandbox', 'asaas_webhook_token']);

  if (error) {
    throw new Error(`Falha ao carregar configuracoes do Asaas: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.key, row.value ?? '');
  }

  return {
    apiKey: map.get('asaas_api_key') || Deno.env.get('ASAAS_API_KEY') || '',
    sandbox: (map.get('asaas_sandbox') ?? 'true') === 'true',
    webhookToken: map.get('asaas_webhook_token') || Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '',
  };
}

export async function asaasFetch(path: string, init: RequestInit = {}) {
  const settings = await getAsaasSettings();
  if (!settings.apiKey) {
    throw new Error('API Key do Asaas nao configurada no painel admin');
  }

  const response = await fetch(`${asaasBaseUrl(settings.sandbox)}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: settings.apiKey,
      'User-Agent': 'RotaGo/1.0',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Asaas ${response.status}: ${text}`);
  }

  return json as Record<string, unknown>;
}

export function mapPlanCycle(frequency: number, frequencyType?: string | null) {
  const type = (frequencyType ?? 'month').toLowerCase();
  const amount = Number.isFinite(frequency) && frequency > 0 ? frequency : 1;

  if (type.startsWith('year') || amount === 12) return 'YEARLY';
  if (amount === 6) return 'SEMIANNUALLY';
  if (amount === 3) return 'QUARTERLY';
  if (type.startsWith('week')) return 'WEEKLY';
  return 'MONTHLY';
}

export async function ensureAsaasCustomer(params: {
  userId: string;
  name: string;
  email: string;
}) {
  const existing = await asaasFetch(
    `/customers?externalReference=${encodeURIComponent(params.userId)}&limit=1`,
  );
  const list = (existing.data as Array<Record<string, unknown>> | undefined) ?? [];
  if (list[0]?.id) {
    return String(list[0].id);
  }

  const created = await asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name || params.email,
      email: params.email,
      externalReference: params.userId,
    }),
  });

  return String(created.id);
}

export async function deactivateOtherSubscriptions(userId: string, keepId: string) {
  const nowIso = new Date().toISOString();
  await adminClient
    .from('user_subscriptions')
    .update({
      is_active: false,
      status: 'expired',
      updated_at: nowIso,
    })
    .eq('user_id', userId)
    .neq('id', keepId)
    .eq('is_active', true);
}

/**
 * Encerra o preco promocional quando os ciclos de promocao acabam.
 *
 * O plano cobra promo_price nos primeiros promo_cycles ciclos e depois o
 * preco cheio. A Asaas nao tem "desconto nos N primeiros ciclos", entao a
 * assinatura e criada no valor promocional e o valor e atualizado por aqui
 * assim que o ultimo pagamento promocional e confirmado.
 */
async function endPromoIfDue(params: {
  asaasSubscriptionId: string | null;
  paidCycles: number;
  promoCycles: number;
  fullValue: number;
  promoValue: number | null;
}) {
  const { asaasSubscriptionId, paidCycles, promoCycles, fullValue, promoValue } = params;

  if (!asaasSubscriptionId) return;
  if (promoCycles <= 0 || promoValue == null) return;
  if (paidCycles < promoCycles) return;
  if (!(fullValue > 0) || fullValue === promoValue) return;

  try {
    await asaasFetch(`/subscriptions/${asaasSubscriptionId}`, {
      method: 'POST',
      body: JSON.stringify({ value: fullValue, updatePendingPayments: true }),
    });
    console.log(
      `[asaas] fim da promocao: assinatura ${asaasSubscriptionId} passou de ${promoValue} para ${fullValue} apos ${paidCycles} ciclos`,
    );
  } catch (err) {
    // Nao derruba o processamento do pagamento: a cobranca foi recebida e a
    // assinatura precisa ser ativada de qualquer forma. Fica registrado para
    // ajuste manual.
    console.error('[asaas] falha ao encerrar preco promocional', err);
  }
}

export async function activatePaidSubscription(params: {
  subscriptionId: string;
  asaas: Record<string, unknown>;
  paidAt?: string;
}) {
  const { data: subscription, error } = await adminClient
    .from('user_subscriptions')
    .select('id, user_id, plan_id, metadata, email, current_period_start, current_period_end, subscription_id, paid_cycles')
    .eq('id', params.subscriptionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!subscription) throw new Error('Assinatura local nao encontrada');

  const { data: plan } = await adminClient
    .from('subscription_plans')
    .select('id, frequency, frequency_type, price, total, promo_price, promo_cycles')
    .eq('id', subscription.plan_id)
    .maybeSingle();

  const paidAt = params.paidAt || new Date().toISOString();
  const periodEnd = calculatePeriodEnd(
    paidAt,
    Number(plan?.frequency ?? 1),
    plan?.frequency_type ?? 'month',
  );

  await deactivateOtherSubscriptions(subscription.user_id, subscription.id);

  const metadata = {
    ...(subscription.metadata ?? {}),
    asaas: {
      ...(((subscription.metadata ?? {}) as Record<string, unknown>).asaas as Record<string, unknown> ?? {}),
      ...params.asaas,
      synced_at: paidAt,
    },
  };

  const paidCycles = Number(subscription.paid_cycles ?? 0) + 1;
  const asaasSubscriptionId =
    String(params.asaas.subscriptionId || subscription.subscription_id || '') || null;

  const { data: updated, error: updateError } = await adminClient
    .from('user_subscriptions')
    .update({
      status: 'active',
      is_active: true,
      is_trial: false,
      trial_ends_at: null,
      current_period_start: paidAt,
      current_period_end: periodEnd,
      paid_cycles: paidCycles,
      external_id: String(params.asaas.subscriptionId || params.asaas.paymentId || params.asaas.checkoutId || ''),
      subscription_id: asaasSubscriptionId ?? '',
      metadata,
      updated_at: paidAt,
    })
    .eq('id', subscription.id)
    .select('id, user_id, plan_id, status, is_active, current_period_start, current_period_end, external_id, subscription_id, paid_cycles')
    .single();

  if (updateError) throw new Error(updateError.message);

  await endPromoIfDue({
    asaasSubscriptionId,
    paidCycles,
    promoCycles: Number(plan?.promo_cycles ?? 0),
    fullValue: Number(plan?.total ?? plan?.price ?? 0),
    promoValue: plan?.promo_price != null ? Number(plan.promo_price) : null,
  });

  return updated;
}

export { createPendingSubscription };
