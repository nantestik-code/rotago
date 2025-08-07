import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Cliente Supabase administrativo
// TEMPORÁRIO: Usando anon key até obtermos a service role key correta
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://seu-novo-projeto.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Cliente administrativo temporário com anon key
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public'
  }
});

// Função para testar a conexão administrativa
export const testAdminConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('count')
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

// Função para buscar admin usando política RLS pública
export const getAdminByEmail = async (email: string) => {
  try {
    console.log('🔍 Buscando admin via anon key (política pública):', email);
    
    // Fazer logout temporário para garantir que não há sessão ativa
    await supabaseAdmin.auth.signOut();
    
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na consulta admin (anon key):', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ Admin não encontrado:', email);
      return null;
    }
    
    console.log('✅ Admin encontrado via política pública:', data[0]);
    return data[0];
    
  } catch (error) {
    console.error('❌ Erro ao buscar admin:', error);
    throw error;
  }
};
