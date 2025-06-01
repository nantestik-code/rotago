
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Usar as credenciais corretas do projeto do .env.production
const SUPABASE_URL = "https://hsubouwujfcdyuyikvbi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzdWJvdXd1amZjZHl1eWlrdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3MzE2NjAsImV4cCI6MjA1OTMwNzY2MH0.wtDdFchXnutYMu2zTQeNIPbrw7jQqHNspUc37f7W-AI";

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
