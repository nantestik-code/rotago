
import { supabase } from '@/integrations/supabase/client';
import { Delivery, DeliveryStatus } from '@/types/delivery';

// Interface matching the Supabase deliveries table
export interface SupabaseDelivery {
  id: string;
  client_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  order_number: string;
  notes: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Convert Supabase delivery to client delivery model
export const mapSupabaseToDelivery = (data: SupabaseDelivery): Delivery => ({
  id: data.id,
  clientName: data.client_name,
  address: data.address,
  city: data.city,
  state: data.state,
  zipCode: data.zip_code,
  phone: data.phone,
  orderNumber: data.order_number,
  notes: data.notes || '',
  status: data.status as DeliveryStatus,
  location: data.latitude && data.longitude 
    ? { lat: data.latitude, lng: data.longitude } 
    : null,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
});

// Convert client delivery model to Supabase format
export const mapDeliveryToSupabase = (delivery: Delivery): SupabaseDelivery => ({
  id: delivery.id,
  client_name: delivery.clientName,
  address: delivery.address,
  city: delivery.city,
  state: delivery.state,
  zip_code: delivery.zipCode,
  phone: delivery.phone,
  order_number: delivery.orderNumber,
  notes: delivery.notes || null,
  status: delivery.status,
  latitude: delivery.location ? delivery.location.lat : null,
  longitude: delivery.location ? delivery.location.lng : null,
  created_at: delivery.createdAt,
  updated_at: delivery.updatedAt,
});

// Fetch all deliveries
export const fetchDeliveries = async (): Promise<Delivery[]> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*');
    
    if (error) {
      console.error('Error fetching deliveries:', error);
      throw new Error(`Failed to fetch deliveries: ${error.message}`);
    }
    
    return (data || []).map(mapSupabaseToDelivery);
  } catch (error) {
    console.error('Error in fetchDeliveries:', error);
    throw error;
  }
};

// Fetch a single delivery by ID
export const fetchDeliveryById = async (id: string): Promise<Delivery | null> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned (not found)
        return null;
      }
      console.error('Error fetching delivery:', error);
      throw new Error(`Failed to fetch delivery: ${error.message}`);
    }
    
    return data ? mapSupabaseToDelivery(data) : null;
  } catch (error) {
    console.error('Error in fetchDeliveryById:', error);
    throw error;
  }
};

// Create a new delivery
export const createDelivery = async (delivery: Omit<Delivery, 'id'>): Promise<Delivery> => {
  try {
    // Convert to Supabase format, omitting id
    const supabaseDelivery: Omit<SupabaseDelivery, 'id'> = {
      client_name: delivery.clientName,
      address: delivery.address,
      city: delivery.city,
      state: delivery.state,
      zip_code: delivery.zipCode,
      phone: delivery.phone,
      order_number: delivery.orderNumber,
      notes: delivery.notes || null,
      status: delivery.status,
      latitude: delivery.location ? delivery.location.lat : null,
      longitude: delivery.location ? delivery.location.lng : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('deliveries')
      .insert(supabaseDelivery)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating delivery:', error);
      throw new Error(`Failed to create delivery: ${error.message}`);
    }
    
    return mapSupabaseToDelivery(data);
  } catch (error) {
    console.error('Error in createDelivery:', error);
    throw error;
  }
};

// Create multiple deliveries
export const createDeliveries = async (deliveries: Omit<Delivery, 'id'>[]): Promise<Delivery[]> => {
  try {
    // Convert to Supabase format, omitting id
    const supabaseDeliveries = deliveries.map(delivery => ({
      client_name: delivery.clientName,
      address: delivery.address,
      city: delivery.city,
      state: delivery.state,
      zip_code: delivery.zipCode,
      phone: delivery.phone,
      order_number: delivery.orderNumber,
      notes: delivery.notes || null,
      status: delivery.status,
      latitude: delivery.location ? delivery.location.lat : null,
      longitude: delivery.location ? delivery.location.lng : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const { data, error } = await supabase
      .from('deliveries')
      .insert(supabaseDeliveries)
      .select();
    
    if (error) {
      console.error('Error creating deliveries:', error);
      throw new Error(`Failed to create deliveries: ${error.message}`);
    }
    
    return (data || []).map(mapSupabaseToDelivery);
  } catch (error) {
    console.error('Error in createDeliveries:', error);
    throw error;
  }
};

// Update a delivery
export const updateDelivery = async (delivery: Delivery): Promise<Delivery> => {
  try {
    const supabaseDelivery = mapDeliveryToSupabase(delivery);
    
    const { data, error } = await supabase
      .from('deliveries')
      .update(supabaseDelivery)
      .eq('id', delivery.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating delivery:', error);
      throw new Error(`Failed to update delivery: ${error.message}`);
    }
    
    return mapSupabaseToDelivery(data);
  } catch (error) {
    console.error('Error in updateDelivery:', error);
    throw error;
  }
};

// Update delivery status
export const updateDeliveryStatus = async (id: string, status: DeliveryStatus): Promise<Delivery> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating delivery status:', error);
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }
    
    return mapSupabaseToDelivery(data);
  } catch (error) {
    console.error('Error in updateDeliveryStatus:', error);
    throw error;
  }
};

// Delete a delivery
export const deleteDelivery = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting delivery:', error);
      throw new Error(`Failed to delete delivery: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteDelivery:', error);
    throw error;
  }
};
