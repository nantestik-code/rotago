
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Usar as credenciais do projeto do .env ou .env.production
// Você deve atualizar estas credenciais com as do seu novo projeto Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://seu-novo-projeto.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sua-nova-chave-anon";

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

// Cliente Supabase com configurações otimizadas para autenticação
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // Persistir a sessão no localStorage
    autoRefreshToken: true,     // Renovar o token automaticamente
    detectSessionInUrl: true,   // Detectar sessão na URL (para login via magic link)
    storage: safeLocalStorage,  // Usar localStorage com fallback seguro
    debug: true,                // Habilitar logs de debug para autenticação
    flowType: 'pkce',           // Usar PKCE flow para autenticação mais segura
    storageKey: 'supabase.auth.token', // Chave consistente para armazenamento
  }
});
