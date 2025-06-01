
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Definir tipo específico para Route para evitar problemas de instanciação excessiva
export interface Route {
  id: string;
  name: string;
  status: "ativo" | "concluido" | "cancelado";
  date: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
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

  // Ensure the data conforms to the Route type by mapping status
  return data.map(item => ({
    ...item,
    status: mapStatusToType(item.status),
    date: item.date || null,
    description: item.description || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
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
