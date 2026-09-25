import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PaymentStatus = 'active' | 'pending_payment' | 'expired' | 'cancelled';

export interface MercadoPagoSettings {
  publicKey: string;
  accessToken: string;
  webhookUrl: string;
  sandboxMode: boolean;
}

export interface MercadoPagoPayment {
  id: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  date_approved?: string | null;
  transaction_amount?: number | null;
  payer?: {
    email?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
}

export interface MercadoPagoPreapproval {
  id: string;
  status?: string | null;
  external_reference?: string | null;
  payer_email?: string | null;
  preapproval_plan_id?: string | null;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  back_url?: string | null;
  reason?: string | null;
  date_created?: string | null;
  last_modified?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number | null;
    frequency_type?: string | null;
    transaction_amount?: number | null;
    currency_id?: string | null;
  } | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export async function getAuthenticatedContext(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Token de autorizacao necessario');
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error('Usuario nao autenticado');
  }

  return { client, user };
}

const ADMIN_ROLES = ['admin', 'super_admin', 'moderator'];

// Fonte unica de verdade para permissao administrativa: profiles.role.
// A tabela `admins`, usada por uma versao anterior, nao existe neste banco.
// O trigger profiles_prevent_role_escalation impede que o proprio usuario
// eleve o seu role, entao confiar nesta coluna e seguro.
export async function assertAdmin(userId: string, _email?: string | null) {
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Falha ao validar perfil administrativo: ${profileError.message}`);
  }

  if (!profile || !ADMIN_ROLES.includes(profile.role ?? '')) {
    throw new Error('Acesso negado');
  }
}

export async function getMercadoPagoSettings(): Promise<MercadoPagoSettings> {
  const { data, error } = await adminClient
    .from('system_settings')
    .select('key, value')
    .in('key', ['mp_public_key', 'mp_access_token', 'mp_webhook_url', 'mp_sandbox_mode']);

  if (error) {
    throw new Error(`Falha ao carregar configuracoes do Mercado Pago: ${error.message}`);
  }

  const settingsMap = new Map<string, string>();
  for (const row of data ?? []) {
    settingsMap.set(row.key, row.value ?? '');
  }

  return {
    publicKey: settingsMap.get('mp_public_key') ?? '',
    accessToken: settingsMap.get('mp_access_token') ?? Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '',
    webhookUrl: settingsMap.get('mp_webhook_url') ?? '',
    sandboxMode: (settingsMap.get('mp_sandbox_mode') ?? 'false') === 'true',
  };
}

export async function createPendingSubscription(params: {
  userId: string;
  userEmail: string | null;
  planId: string;
  source?: string;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  await adminClient
    .from('user_subscriptions')
    .update({
      status: 'expired',
      is_active: false,
      updated_at: now.toISOString(),
    })
    .eq('user_id', params.userId)
    .eq('status', 'pending_payment');

  const { data, error } = await adminClient
    .from('user_subscriptions')
    .insert({
      user_id: params.userId,
      email: params.userEmail,
      plan_id: params.planId,
      status: 'pending_payment',
      is_active: false,
      is_trial: false,
      current_period_start: now.toISOString(),
      current_period_end: expiresAt.toISOString(),
      metadata: {
        source: params.source ?? 'mercadopago_checkout',
        created_by: 'edge_function',
      },
      updated_at: now.toISOString(),
    })
    .select('id, user_id, plan_id, metadata')
    .single();

  if (error) {
    throw new Error(`Falha ao criar assinatura pendente: ${error.message}`);
  }

  return data;
}

function normalizeFrequencyType(type?: string | null) {
  const value = (type ?? 'month').toLowerCase();

  if (value === 'day' || value === 'days') return 'day';
  if (value === 'year' || value === 'years') return 'year';
  return 'month';
}

export function getMercadoPagoFrequencyConfig(frequency: number, frequencyType: string) {
  const normalizedType = normalizeFrequencyType(frequencyType);

  if (normalizedType === 'day') {
    return { frequency, frequencyType: 'days' };
  }

  if (normalizedType === 'year') {
    return { frequency: frequency * 12, frequencyType: 'months' };
  }

  return { frequency, frequencyType: 'months' };
}

export function calculatePeriodEnd(startIso: string, frequency: number, frequencyType: string) {
  const start = new Date(startIso);
  const amount = Number.isFinite(frequency) && frequency > 0 ? frequency : 1;
  const normalizedType = normalizeFrequencyType(frequencyType);

  if (normalizedType === 'day') {
    start.setDate(start.getDate() + amount);
    return start.toISOString();
  }

  if (normalizedType === 'year') {
    start.setFullYear(start.getFullYear() + amount);
    return start.toISOString();
  }

  start.setMonth(start.getMonth() + amount);
  return start.toISOString();
}

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  const settings = await getMercadoPagoSettings();
  if (!settings.accessToken) {
    throw new Error('Access Token do Mercado Pago nao configurado');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mercado Pago retornou ${response.status}: ${errorText}`);
  }

  return (await response.json()) as MercadoPagoPayment;
}

export async function fetchMercadoPagoPreapproval(preapprovalId: string) {
  const settings = await getMercadoPagoSettings();
  if (!settings.accessToken) {
    throw new Error('Access Token do Mercado Pago nao configurado');
  }

  const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mercado Pago retornou ${response.status}: ${errorText}`);
  }

  return (await response.json()) as MercadoPagoPreapproval;
}

export async function syncSubscriptionFromPayment(payment: MercadoPagoPayment) {
  const subscriptionId =
    payment.external_reference ??
    (typeof payment.metadata?.user_subscription_id === 'string'
      ? payment.metadata.user_subscription_id
      : null);

  if (!subscriptionId) {
    throw new Error('Pagamento sem external_reference / user_subscription_id');
  }

  const { data: subscription, error: subscriptionError } = await adminClient
    .from('user_subscriptions')
    .select('id, user_id, plan_id, metadata, email, current_period_start, current_period_end, subscription_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Falha ao buscar assinatura pendente: ${subscriptionError.message}`);
  }

  if (!subscription) {
    throw new Error('Assinatura pendente nao encontrada para este pagamento');
  }

  const { data: plan, error: planError } = await adminClient
    .from('subscription_plans')
    .select('id, frequency, frequency_type')
    .eq('id', subscription.plan_id)
    .maybeSingle();

  if (planError) {
    throw new Error(`Falha ao buscar plano da assinatura: ${planError.message}`);
  }

  if (!plan) {
    throw new Error('Plano da assinatura nao encontrado');
  }

  const nowIso = new Date().toISOString();
  const approvedAt = payment.date_approved || nowIso;
  const currentPeriodEnd = calculatePeriodEnd(
    approvedAt,
    Number(plan.frequency ?? 1),
    plan.frequency_type ?? 'month',
  );

  let nextStatus: PaymentStatus = 'expired';
  let isActive = false;

  if (payment.status === 'approved') {
    nextStatus = 'active';
    isActive = true;
  } else if (payment.status === 'pending' || payment.status === 'in_process') {
    nextStatus = 'pending_payment';
  } else if (payment.status === 'cancelled') {
    nextStatus = 'cancelled';
  }

  if (isActive) {
    await adminClient
      .from('user_subscriptions')
      .update({
        is_active: false,
        status: 'expired',
        updated_at: nowIso,
      })
      .eq('user_id', subscription.user_id)
      .neq('id', subscription.id)
      .eq('is_active', true);
  }

  const metadata = {
    ...(subscription.metadata ?? {}),
    mercadopago: {
      ...((subscription.metadata ?? {}).mercadopago ?? {}),
      payment_id: payment.id,
      payment_status: payment.status ?? null,
      status_detail: payment.status_detail ?? null,
      payer_email: payment.payer?.email ?? subscription.email ?? null,
      synced_at: nowIso,
    },
  };

  const { data: updatedSubscription, error: updateError } = await adminClient
    .from('user_subscriptions')
    .update({
      status: nextStatus,
      is_active: isActive,
      is_trial: false,
      trial_ends_at: null,
      current_period_start: isActive ? approvedAt : subscription.current_period_start,
      current_period_end: isActive ? currentPeriodEnd : subscription.current_period_end,
      external_id: String(payment.id),
      subscription_id: subscription.subscription_id ?? null,
      email: payment.payer?.email ?? subscription.email ?? null,
      metadata,
      updated_at: nowIso,
    })
    .eq('id', subscription.id)
    .select('id, user_id, plan_id, status, is_active, current_period_start, current_period_end, external_id, subscription_id')
    .single();

  if (updateError) {
    throw new Error(`Falha ao atualizar assinatura apos pagamento: ${updateError.message}`);
  }

  return {
    subscription: updatedSubscription,
    payment,
  };
}

function mapPreapprovalStatus(status?: string | null): PaymentStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'authorized':
      return 'active';
    case 'pending':
      return 'pending_payment';
    case 'cancelled':
    case 'paused':
      return 'cancelled';
    default:
      return 'expired';
  }
}

export async function syncSubscriptionFromPreapproval(preapproval: MercadoPagoPreapproval) {
  const userSubscriptionId = preapproval.external_reference;
  if (!userSubscriptionId) {
    throw new Error('Assinatura Mercado Pago sem external_reference');
  }

  const { data: subscription, error: subscriptionError } = await adminClient
    .from('user_subscriptions')
    .select('id, user_id, plan_id, metadata, email, current_period_start, current_period_end')
    .eq('id', userSubscriptionId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Falha ao buscar assinatura local: ${subscriptionError.message}`);
  }

  if (!subscription) {
    throw new Error('Assinatura local nao encontrada para esta recorrencia');
  }

  const { data: plan, error: planError } = await adminClient
    .from('subscription_plans')
    .select('id, frequency, frequency_type')
    .eq('id', subscription.plan_id)
    .maybeSingle();

  if (planError) {
    throw new Error(`Falha ao buscar plano da assinatura: ${planError.message}`);
  }

  if (!plan) {
    throw new Error('Plano da assinatura nao encontrado');
  }

  const nextStatus = mapPreapprovalStatus(preapproval.status);
  const isActive = nextStatus === 'active';
  const nowIso = new Date().toISOString();
  const currentPeriodStart =
    subscription.current_period_start ||
    preapproval.date_created ||
    nowIso;
  const currentPeriodEnd =
    preapproval.next_payment_date ||
    calculatePeriodEnd(
      currentPeriodStart,
      Number(plan.frequency ?? 1),
      plan.frequency_type ?? 'month',
    );

  if (isActive) {
    await adminClient
      .from('user_subscriptions')
      .update({
        is_active: false,
        status: 'expired',
        updated_at: nowIso,
      })
      .eq('user_id', subscription.user_id)
      .neq('id', subscription.id)
      .eq('is_active', true);
  }

  const metadata = {
    ...(subscription.metadata ?? {}),
    mercadopago: {
      ...((subscription.metadata ?? {}).mercadopago ?? {}),
      checkout_type: 'recurring_preapproval',
      preapproval_id: preapproval.id,
      preapproval_status: preapproval.status ?? null,
      preapproval_plan_id: preapproval.preapproval_plan_id ?? null,
      payer_email: preapproval.payer_email ?? subscription.email ?? null,
      next_payment_date: preapproval.next_payment_date ?? null,
      init_point: preapproval.init_point ?? null,
      last_modified: preapproval.last_modified ?? null,
      synced_at: nowIso,
    },
  };

  const { data: updatedSubscription, error: updateError } = await adminClient
    .from('user_subscriptions')
    .update({
      status: nextStatus,
      is_active: isActive,
      is_trial: false,
      trial_ends_at: null,
      current_period_start: isActive ? currentPeriodStart : subscription.current_period_start,
      current_period_end: isActive ? currentPeriodEnd : subscription.current_period_end,
      subscription_id: preapproval.id,
      email: preapproval.payer_email ?? subscription.email ?? null,
      metadata,
      updated_at: nowIso,
    })
    .eq('id', subscription.id)
    .select('id, user_id, plan_id, status, is_active, current_period_start, current_period_end, external_id, subscription_id')
    .single();

  if (updateError) {
    throw new Error(`Falha ao sincronizar assinatura recorrente: ${updateError.message}`);
  }

  return {
    subscription: updatedSubscription,
    preapproval,
  };
}
