import { adminAuthService } from '@/services/adminAuthService';

/**
 * Utilitário para obter o cliente Supabase apropriado para operações administrativas
 * 
 * - Se admin tem sessão Supabase Auth ativa: usa cliente padrão (com RLS)
 * - Se admin tem apenas sessão local: usa cliente admin (bypass RLS)
 * 
 * Isso permite que admins como evandromromero@gmail.com funcionem mesmo
 * sem existir no Supabase Auth, usando service key para bypass RLS.
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
