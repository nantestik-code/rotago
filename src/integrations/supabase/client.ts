
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { clearAllAuthData } from '@/utils/authUtils';

// Usar as credenciais do projeto do .env ou .env.production
// Você deve atualizar estas credenciais com as do seu novo projeto Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dsmbytaxyknrmrxcjsww.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbWJ5dGF4eWtucm1yeGNqc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMjczODksImV4cCI6MjEwNTcwMzM4OX0.Fo69eV8YV0TebW9IJamd_hfoehaJjtfEM78l9oWf7b0";

// Função segura para acessar localStorage com fallback para ambientes sem localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Erro ao acessar localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Erro ao escrever no localStorage:', error);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erro ao remover do localStorage:', error);
    }
  }
};

// Função para limpar todos os tokens do Supabase no localStorage
export const clearSupabaseTokens = () => {

  try {
    // Usar a função de utilitário para limpar todos os dados de autenticação
    clearAllAuthData();
    
    // Limpar tokens específicos do Supabase (garantia adicional)
    safeLocalStorage.removeItem('supabase.auth.token');
    safeLocalStorage.removeItem('sb-refresh-token');
    safeLocalStorage.removeItem('sb-access-token');
    safeLocalStorage.removeItem('supabase-auth-token');
    
  
  } catch (error) {
    console.error('❌ Erro ao limpar tokens do Supabase:', error);
  }
};

// Cliente Supabase com configurações otimizadas para autenticação
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // Persistir a sessão no localStorage
    autoRefreshToken: true,     // Renovar o token automaticamente
    detectSessionInUrl: true,   // Detectar sessão na URL (para login via magic link)
    storage: safeLocalStorage,  // Usar localStorage com fallback seguro
    debug: import.meta.env.DEV,
    flowType: 'pkce',           // Usar PKCE flow para autenticação mais segura
    storageKey: 'supabase.auth.token', // Chave consistente para armazenamento
    onAuthStateChange: (event, session) => {
    
      
      // Se o evento for SIGNED_OUT, garantir limpeza completa
      if (event === 'SIGNED_OUT') {
    
        clearSupabaseTokens();
      }
    }
  }
});
