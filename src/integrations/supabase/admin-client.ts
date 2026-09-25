import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

/**
 * Cliente usado pelas telas administrativas.
 *
 * Antes este arquivo criava um segundo cliente com `persistSession: false`.
 * Como nada nunca fazia login nele, toda requisicao saia como `anon` — e
 * funcionava apenas porque o papel `anon` tinha SELECT/INSERT/UPDATE/DELETE
 * nas tabelas. A migration `harden_rls_and_admin` revogou esses grants, entao
 * um cliente sem sessao passa a receber 401/403.
 *
 * Agora ele e o mesmo cliente autenticado da aplicacao: as consultas levam o
 * JWT do admin e quem decide o que ele pode ver e o RLS, atraves das policies
 * `*_admin` que chamam `public.is_admin()`. Forjar `rotago_admin_session` no
 * localStorage nao ajuda mais: sem `profiles.role` de admin, o banco recusa.
 *
 * O tipo e afrouxado de proposito porque `integrations/supabase/types.ts` esta
 * desatualizado e nao descreve varias tabelas que o painel consulta.
 */
export const supabaseAdmin = supabase as unknown as SupabaseClient;

/** Testa se a sessao atual consegue ler dados administrativos. */
export const testAdminConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);

    if (error) {
      console.error('❌ Erro ao testar conexão admin:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Erro na conexão administrativa:', error);
    return false;
  }
};

/** Busca um perfil administrativo pelo id do usuario autenticado. */
export const getAdminProfile = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .in('role', ['admin', 'super_admin', 'moderator'])
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};
