// Helpers compartilhados pelas edge functions.
//
// Este arquivo substitui o antigo `_shared/mercadopago.ts`, que misturava
// utilidades genericas (cliente Supabase, CORS, autenticacao, assinaturas)
// com codigo especifico do Mercado Pago. O Mercado Pago foi descontinuado:
// o unico gateway e o Asaas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Cliente com service_role: ignora RLS. Nunca exponha ao navegador. */
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

/** Valida o JWT recebido e devolve o usuario autenticado. */
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

/**
 * Fonte unica de verdade para permissao administrativa: `profiles.role`.
 *
 * O trigger `profiles_prevent_role_escalation` impede que o proprio usuario
 * eleve o seu papel, entao confiar nesta coluna e seguro. A tabela `admins`,
 * usada por uma versao anterior, nunca existiu neste banco.
 */
export async function assertAdmin(userId: string) {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar perfil administrativo: ${error.message}`);
  }

  if (!profile || !ADMIN_ROLES.includes(profile.role ?? '')) {
    throw new Error('Acesso negado');
  }
}

/**
 * Cria a linha `pending_payment` antes de mandar o cliente ao gateway.
 * Pendencias anteriores do mesmo usuario sao marcadas como expiradas.
 */
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
        source: params.source ?? 'asaas_checkout',
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

/** Soma o ciclo do plano a uma data e devolve o fim do periodo. */
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
