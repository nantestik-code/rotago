
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
