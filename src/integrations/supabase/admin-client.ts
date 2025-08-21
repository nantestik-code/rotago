import { createClient } from '@supabase/supabase-js';

// Cliente Supabase administrativo - usando anon key com sessão autenticada
const sanitizeEnv = (val?: unknown) => (typeof val === 'string' ? val.trim().replace(/^['"`]|['"`]$/g, '') : '');
const SUPABASE_URL = sanitizeEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = sanitizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
const SUPABASE_SERVICE_ROLE_KEY = sanitizeEnv(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

// Debug das variáveis de ambiente
console.log('🔍 [ADMIN CLIENT] Debug env vars:', {
  url: SUPABASE_URL,
  hasAnonKey: !!SUPABASE_ANON_KEY,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  anonKeyLength: SUPABASE_ANON_KEY.length,
  anonKeyStart: SUPABASE_ANON_KEY.substring(0, 20) + '...'
});

// Verificar se as variáveis estão definidas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ [ADMIN CLIENT] Variáveis de ambiente não configuradas:', {
    hasUrl: !!SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY
  });
}

// Cliente administrativo usando anon key (sem tipos específicos para evitar conflitos)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Não persistir sessão para evitar conflitos com admin local
    autoRefreshToken: false,
  }
});

// Função para testar a conexão administrativa
export const testAdminConnection = async (): Promise<boolean> => {
  try {
    // Usar uma tabela que sabemos que existe (profiles)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao testar conexão admin:', error);
      return false;
    }
    
    console.log('✅ Conexão administrativa funcionando');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão administrativa:', error);
    return false;
  }
};

// Função para buscar admin usando tabela profiles
export const getAdminByEmail = async (email: string) => {
  try {
    console.log('🔍 Buscando admin na tabela profiles:', email);
    
    // Buscar na tabela profiles com role admin
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .in('role', ['admin', 'super_admin', 'moderator'])
      .limit(1);
    
    if (profileError) {
      console.error('❌ Erro ao buscar admin em profiles:', profileError);
      throw profileError;
    }
    
    if (!profileData || profileData.length === 0) {
      console.log('❌ Admin não encontrado:', email);
      return null;
    }
    
    console.log('✅ Admin encontrado em profiles:', profileData[0]);
    return profileData[0];
    
  } catch (error) {
    console.error('❌ Erro ao buscar admin:', error);
    throw error;
  }
};
