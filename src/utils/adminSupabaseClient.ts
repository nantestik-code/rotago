import { adminAuthService } from '@/services/adminAuthService';

/**
 * Utilitario para obter o cliente Supabase das operacoes administrativas.
 *
 * O comentario anterior aqui dizia que havia um cliente com "service key" que
 * ignorava RLS. Isso nunca foi verdade: o cliente usava a chave anonima e so
 * funcionava porque o papel `anon` tinha grants amplos. Hoje existe um unico
 * cliente autenticado, e quem autoriza cada consulta e o RLS, pelas policies
 * que chamam `public.is_admin()`.
 */
export const getAdminSupabaseClient = () => {
  return adminAuthService.getAdminSupabaseClient();
};

/**
 * Hook para usar em componentes React que precisam de acesso admin aos dados
 */
export const useAdminSupabaseClient = () => {
  return getAdminSupabaseClient();
};
