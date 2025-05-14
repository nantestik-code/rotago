
import { supabase } from "@/integrations/supabase/client";
import { Delivery } from "@/types/delivery";

export const getDeliveries = async (): Promise<Delivery[]> => {
  const { data, error } = await supabase
    .from("deliveries")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  // Ensure the data conforms to the Delivery type by mapping status
  return data.map(item => ({
    ...item,
    status: mapStatusToType(item.status),
    latitude: item.latitude || null,
    longitude: item.longitude || null,
    notes: item.notes || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
};

// Map the string status from database to the expected enum type
function mapStatusToType(status: string): "pendente" | "em_rota" | "entregue" | "cancelado" {
  switch(status) {
    case "pendente": return "pendente";
    case "em_rota": return "em_rota";
    case "entregue": return "entregue";
    case "cancelado": return "cancelado";
    default: return "pendente"; // Default fallback
  }
}
