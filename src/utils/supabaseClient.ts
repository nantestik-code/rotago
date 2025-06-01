// Este arquivo está sendo mantido apenas para compatibilidade com código legado
// Todos os novos códigos devem importar o cliente de @/integrations/supabase/client

// Importamos e reexportamos o cliente Supabase correto
import { supabase } from '@/integrations/supabase/client';
export { supabase };

// Importamos e reexportamos o tipo Database
import type { Database } from '@/integrations/supabase/types';
export type { Database };

// Definição do tipo Json para manter compatibilidade com código legado
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
          action?: string
          details?: Json | null
        }
      }
      deliveries: {
        Row: {
          id: string
          order_number: string | null
          client_name: string | null
          address: string
          city: string | null
          state: string | null
          postal_code: string | null
          lat: number | null
          lng: number | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          delivered_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          order_number?: string | null
          client_name?: string | null
          address: string
          city?: string | null
          state?: string | null
          postal_code?: string | null
          lat?: number | null
          lng?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          delivered_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          order_number?: string | null
          client_name?: string | null
          address?: string
          city?: string | null
          state?: string | null
          postal_code?: string | null
          lat?: number | null
          lng?: number | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          delivered_at?: string | null
          notes?: string | null
        }
      }
      delivery_history: {
        Row: {
          id: string
          delivery_id: string | null
          previous_status: string | null
          new_status: string | null
          changed_at: string | null
          changed_by: string | null
          notes: string | null
          lat: number | null
          lng: number | null
        }
        Insert: {
          id?: string
          delivery_id?: string | null
          previous_status?: string | null
          new_status?: string | null
          changed_at?: string | null
          changed_by?: string | null
          notes?: string | null
          lat?: number | null
          lng?: number | null
        }
        Update: {
          id?: string
          delivery_id?: string | null
          previous_status?: string | null
          new_status?: string | null
          changed_at?: string | null
          changed_by?: string | null
          notes?: string | null
          lat?: number | null
          lng?: number | null
        }
      }
      route_deliveries: {
        Row: {
          route_id: string | null
          delivery_id: string | null
          sequence_number: number | null
        }
        Insert: {
          route_id?: string | null
          delivery_id?: string | null
          sequence_number?: number | null
        }
        Update: {
          route_id?: string | null
          delivery_id?: string | null
          sequence_number?: number | null
        }
      }
      routes: {
        Row: {
          id: string
          name: string | null
          created_at: string | null
          completed_at: string | null
          status: string | null
          total_distance: number | null
          estimated_duration: number | null
          actual_duration: number | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          created_at?: string | null
          completed_at?: string | null
          status?: string | null
          total_distance?: number | null
          estimated_duration?: number | null
          actual_duration?: number | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          created_at?: string | null
          completed_at?: string | null
          status?: string | null
          total_distance?: number | null
          estimated_duration?: number | null
          actual_duration?: number | null
          notes?: string | null
          user_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

const supabaseUrl = 'https://sideyebtoulevdkaoasr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZGV5ZWJ0b3VsZXZka2FvYXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDM5MDEsImV4cCI6MjA2MjgxOTkwMX0.XpZWqmPKgdxr_SesdeU3Odmjk9FiG0kVV0DEXw0kGwI';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
