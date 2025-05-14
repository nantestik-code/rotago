
import { supabase } from '@/integrations/supabase/client';
import { DeliveryItem } from '@/utils/deliveryUtils';

// Interface para mapear os dados do Supabase para o formato da aplicação
interface SupabaseDelivery {
  id: string;
  order_number: string;
  client_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  notes: string | null;
  status: 'pendente' | 'entregue' | 'ocorrencia';
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

// Converter de formato Supabase para formato da aplicação
const mapSupabaseToDelivery = (data: SupabaseDelivery): DeliveryItem => {
  return {
    id: data.id,
    cliente: data.client_name,
    endereco: data.address,
    cidade: data.city,
    estado: data.state,
    cep: data.zip_code,
    telefone: data.phone,
    observacoes: data.notes || '',
    status: data.status,
    lat: data.latitude || undefined,
    lng: data.longitude || undefined,
  };
};

// Converter de formato da aplicação para Supabase
const mapDeliveryToSupabase = (delivery: DeliveryItem): Partial<SupabaseDelivery> => {
  return {
    order_number: delivery.id, // Usando o ID como número de ordem
    client_name: delivery.cliente,
    address: delivery.endereco,
    city: delivery.cidade,
    state: delivery.estado,
    zip_code: delivery.cep,
    phone: delivery.telefone,
    notes: delivery.observacoes,
    status: delivery.status,
    latitude: delivery.lat,
    longitude: delivery.lng,
    updated_at: new Date().toISOString(),
  };
};

// Buscar todas as entregas
export const fetchDeliveries = async (): Promise<DeliveryItem[]> => {
  try {
    // Utilizando o tipo explícito para a resposta
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false }) as { data: SupabaseDelivery[] | null, error: any };

    if (error) {
      console.error('Erro ao buscar entregas:', error);
      throw error;
    }

    return (data || []).map(mapSupabaseToDelivery);
  } catch (error) {
    console.error('Erro ao buscar entregas:', error);
    throw error;
  }
};

// Buscar entregas por rota
export const fetchDeliveriesByRoute = async (routeId: string): Promise<DeliveryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('route_deliveries')
      .select('delivery_id, sequence_number')
      .eq('route_id', routeId)
      .order('sequence_number', { ascending: true });

    if (error) {
      console.error('Erro ao buscar entregas da rota:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    const deliveryIds = data.map(item => item.delivery_id);
    
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('*')
      .in('id', deliveryIds) as { data: SupabaseDelivery[] | null, error: any };

    if (deliveriesError) {
      console.error('Erro ao buscar detalhes das entregas:', deliveriesError);
      throw deliveriesError;
    }

    // Mapeando entregas e ordenando segundo a sequência original
    const deliveriesMap = new Map<string, SupabaseDelivery>();
    (deliveries || []).forEach(delivery => {
      deliveriesMap.set(delivery.id, delivery);
    });

    return data
      .map(item => {
        const delivery = deliveriesMap.get(item.delivery_id);
        return delivery ? mapSupabaseToDelivery(delivery) : null;
      })
      .filter((delivery): delivery is DeliveryItem => delivery !== null);
  } catch (error) {
    console.error('Erro ao buscar entregas da rota:', error);
    throw error;
  }
};

// Criar uma nova entrega
export const createDelivery = async (delivery: DeliveryItem): Promise<DeliveryItem> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .insert(mapDeliveryToSupabase(delivery))
      .select()
      .single() as { data: SupabaseDelivery | null, error: any };

    if (error) {
      console.error('Erro ao criar entrega:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Nenhum dado retornado ao criar entrega');
    }

    return mapSupabaseToDelivery(data);
  } catch (error) {
    console.error('Erro ao criar entrega:', error);
    throw error;
  }
};

// Criar múltiplas entregas
export const createDeliveries = async (deliveries: DeliveryItem[]): Promise<DeliveryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .insert(deliveries.map(mapDeliveryToSupabase))
      .select() as { data: SupabaseDelivery[] | null, error: any };

    if (error) {
      console.error('Erro ao criar entregas em lote:', error);
      throw error;
    }

    return (data || []).map(mapSupabaseToDelivery);
  } catch (error) {
    console.error('Erro ao criar entregas em lote:', error);
    throw error;
  }
};

// Atualizar uma entrega
export const updateDelivery = async (delivery: DeliveryItem): Promise<DeliveryItem> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update(mapDeliveryToSupabase(delivery))
      .eq('id', delivery.id)
      .select()
      .single() as { data: SupabaseDelivery | null, error: any };

    if (error) {
      console.error('Erro ao atualizar entrega:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Nenhum dado retornado ao atualizar entrega');
    }

    return mapSupabaseToDelivery(data);
  } catch (error) {
    console.error('Erro ao atualizar entrega:', error);
    throw error;
  }
};

// Atualizar o status de uma entrega
export const updateDeliveryStatus = async (
  id: string, 
  status: 'pendente' | 'entregue' | 'ocorrencia'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deliveries')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar status da entrega:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar status da entrega:', error);
    throw error;
  }
};

// Excluir uma entrega
export const deleteDelivery = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir entrega:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir entrega:', error);
    throw error;
  }
};
