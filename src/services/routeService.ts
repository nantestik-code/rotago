
import { supabase } from "@/integrations/supabase/client";
import { Route } from "@/types/route";

export const getRoutes = async (): Promise<Route[]> => {
  const { data, error } = await supabase
    .from("routes")
    .select("*");

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
