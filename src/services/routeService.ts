
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Interface simples para evitar problemas de instanciação de tipos
interface RouteData {
  id: string;
  name: string;
  status: string;
  date: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id?: string;
}

export interface Route {
  id: string;
  name: string;
  status: "ativo" | "concluido" | "cancelado";
  date: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const getRoutes = async (user?: User | null): Promise<Route[]> => {
  // Obter o usuário atual da sessão se não for fornecido
  if (!user) {
    const { data: sessionData } = await supabase.auth.getSession();
    user = sessionData.session?.user || null;
  }
  
  // Se não houver usuário, retornar array vazio
  if (!user) {
    console.warn('Tentativa de obter rotas sem usuário autenticado');
    return [];
  }
  
  // Filtrar rotas pelo ID do usuário atual
  const userId = user?.id;
  if (!userId) {
    return [];
  }
  
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return [];
  }

  // Mapear os dados para o formato esperado
  return data.map((item: RouteData): Route => ({
    id: item.id,
    name: item.name,
    status: mapStatusToType(item.status),
    date: item.date || '',
    description: item.description,
    created_at: item.created_at || undefined,
    updated_at: item.updated_at || undefined,
  }));
};

// Map the string status from database to the expected enum type
function mapStatusToType(status: string): "ativo" | "concluido" | "cancelado" {
  switch(status) {
    case "ativo": return "ativo";
    case "concluido": return "concluido";
    case "cancelado": return "cancelado";
    default: return "ativo"; // Default fallback
  }
}
