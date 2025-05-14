
import { supabase } from '@/integrations/supabase/client';
import { Delivery, DeliveryStatus } from '@/types/delivery';

// Função para buscar todas as entregas
export const fetchDeliveries = async (): Promise<Delivery[]> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deliveries:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchDeliveries:', error);
    throw error;
  }
};

// Função para formatar dados da entrega para API
const formatDeliveryForAPI = (delivery: Partial<Delivery>): any => {
  return {
    client_name: delivery.client_name,
    address: delivery.address,
    city: delivery.city,
    state: delivery.state,
    zip_code: delivery.zip_code,
    phone: delivery.phone,
    notes: delivery.notes,
    order_number: delivery.order_number,
    status: delivery.status,
    latitude: delivery.latitude,
    longitude: delivery.longitude
  };
};

// Função para converter dados da API para o formato da aplicação
const formatDeliveryFromAPI = (data: any): Delivery => {
  return {
    id: data.id,
    client_name: data.client_name,
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: data.zip_code,
    phone: data.phone,
    notes: data.notes,
    order_number: data.order_number,
    status: data.status,
    latitude: data.latitude,
    longitude: data.longitude,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

// Função para buscar uma entrega específica
export const fetchDelivery = async (id: string): Promise<Delivery> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching delivery with ID ${id}:`, error);
      throw error;
    }
    
    return formatDeliveryFromAPI(data);
  } catch (error) {
    console.error(`Error in fetchDelivery with ID ${id}:`, error);
    throw error;
  }
};

// Função para criar uma nova entrega
export const createDelivery = async (delivery: Omit<Delivery, 'id'>): Promise<Delivery> => {
  try {
    const formattedDelivery = formatDeliveryForAPI(delivery);
    
    const { data, error } = await supabase
      .from('deliveries')
      .insert(formattedDelivery)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
    
    return formatDeliveryFromAPI(data);
  } catch (error) {
    console.error('Error in createDelivery:', error);
    throw error;
  }
};

// Função para criar múltiplas entregas
export const createMultipleDeliveries = async (deliveries: Omit<Delivery, 'id'>[]): Promise<Delivery[]> => {
  try {
    const formattedDeliveries = deliveries.map(delivery => formatDeliveryForAPI(delivery));
    
    const { data, error } = await supabase
      .from('deliveries')
      .insert(formattedDeliveries)
      .select();
    
    if (error) {
      console.error('Error creating multiple deliveries:', error);
      throw error;
    }
    
    return data.map(formatDeliveryFromAPI);
  } catch (error) {
    console.error('Error in createMultipleDeliveries:', error);
    throw error;
  }
};

// Função para atualizar uma entrega
export const updateDelivery = async (id: string, delivery: Omit<Delivery, 'id'>): Promise<Delivery> => {
  try {
    const formattedDelivery = formatDeliveryForAPI(delivery);
    
    const { data, error } = await supabase
      .from('deliveries')
      .update(formattedDelivery)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating delivery with ID ${id}:`, error);
      throw error;
    }
    
    return formatDeliveryFromAPI(data);
  } catch (error) {
    console.error(`Error in updateDelivery with ID ${id}:`, error);
    throw error;
  }
};

// Função para atualizar o status de uma entrega
export const updateDeliveryStatus = async (id: string, status: DeliveryStatus): Promise<Delivery> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating status for delivery with ID ${id}:`, error);
      throw error;
    }
    
    return formatDeliveryFromAPI(data);
  } catch (error) {
    console.error(`Error in updateDeliveryStatus for delivery with ID ${id}:`, error);
    throw error;
  }
};

// Função para excluir uma entrega
export const deleteDelivery = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting delivery with ID ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in deleteDelivery with ID ${id}:`, error);
    throw error;
  }
};
