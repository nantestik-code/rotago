
import { supabase } from '@/integrations/supabase/client';
import { Route, RouteWithDeliveries, DeliveryWithSequence } from '@/types/route';
import { Delivery } from '@/types/delivery';

// Função para buscar todas as rotas
export const fetchRoutes = async (): Promise<Route[]> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching routes:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchRoutes:', error);
    throw error;
  }
};

// Função para formatar dados da rota
const formatRoute = (route: Partial<Route>): any => {
  return {
    name: route.name,
    date: route.date,
    status: route.status || "ativo",
    driver_id: route.driver_id
  };
};

// Função para converter dados da API para o formato da aplicação
const formatRouteFromAPI = (data: any): Route => {
  return {
    id: data.id,
    name: data.name,
    date: data.date,
    status: data.status,
    driver_id: data.driver_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

// Função para buscar uma rota específica com suas entregas
export const fetchRouteWithDeliveries = async (id: string): Promise<RouteWithDeliveries> => {
  try {
    // Primeiro, busca a rota
    const { data: routeData, error: routeError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (routeError) {
      console.error(`Error fetching route with ID ${id}:`, routeError);
      throw routeError;
    }
    
    // Depois, busca as entregas associadas a esta rota
    const { data: deliveriesData, error: deliveriesError } = await supabase
      .from('route_deliveries')
      .select(`
        sequence_number,
        deliveries:delivery_id(*)
      `)
      .eq('route_id', id)
      .order('sequence_number', { ascending: true });
    
    if (deliveriesError) {
      console.error(`Error fetching deliveries for route with ID ${id}:`, deliveriesError);
      throw deliveriesError;
    }
    
    // Formata as entregas
    const deliveries: DeliveryWithSequence[] = deliveriesData.map((item: any) => ({
      ...item.deliveries,
      sequence_number: item.sequence_number
    }));
    
    return {
      ...formatRouteFromAPI(routeData),
      deliveries
    };
  } catch (error) {
    console.error(`Error in fetchRouteWithDeliveries for route with ID ${id}:`, error);
    throw error;
  }
};

// Função para criar uma nova rota
export const createRoute = async (route: Omit<Route, 'id'>): Promise<Route> => {
  try {
    const formattedRoute = formatRoute(route);
    
    const { data, error } = await supabase
      .from('routes')
      .insert(formattedRoute)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating route:', error);
      throw error;
    }
    
    return formatRouteFromAPI(data);
  } catch (error) {
    console.error('Error in createRoute:', error);
    throw error;
  }
};

// Função para atualizar uma rota
export const updateRoute = async (id: string, route: Partial<Route>): Promise<Route> => {
  try {
    const formattedRoute = formatRoute(route);
    
    const { data, error } = await supabase
      .from('routes')
      .update(formattedRoute)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating route with ID ${id}:`, error);
      throw error;
    }
    
    return formatRouteFromAPI(data);
  } catch (error) {
    console.error(`Error in updateRoute for route with ID ${id}:`, error);
    throw error;
  }
};

// Função para excluir uma rota
export const deleteRoute = async (id: string): Promise<void> => {
  try {
    // Primeiro, exclui as associações com entregas
    const { error: deliveriesError } = await supabase
      .from('route_deliveries')
      .delete()
      .eq('route_id', id);
    
    if (deliveriesError) {
      console.error(`Error deleting route_deliveries for route with ID ${id}:`, deliveriesError);
      throw deliveriesError;
    }
    
    // Depois, exclui a rota
    const { error: routeError } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);
    
    if (routeError) {
      console.error(`Error deleting route with ID ${id}:`, routeError);
      throw routeError;
    }
  } catch (error) {
    console.error(`Error in deleteRoute for route with ID ${id}:`, error);
    throw error;
  }
};

// Função para adicionar entregas a uma rota
export const addDeliveriesToRoute = async (
  routeId: string, 
  deliveries: Delivery[], 
  startSequence = 1
): Promise<void> => {
  try {
    const routeDeliveries = deliveries.map((delivery, index) => ({
      route_id: routeId,
      delivery_id: delivery.id,
      sequence_number: startSequence + index
    }));
    
    const { error } = await supabase
      .from('route_deliveries')
      .insert(routeDeliveries);
    
    if (error) {
      console.error(`Error adding deliveries to route with ID ${routeId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in addDeliveriesToRoute for route with ID ${routeId}:`, error);
    throw error;
  }
};

// Função para remover uma entrega de uma rota
export const removeDeliveryFromRoute = async (routeId: string, deliveryId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('route_deliveries')
      .delete()
      .eq('route_id', routeId)
      .eq('delivery_id', deliveryId);
    
    if (error) {
      console.error(`Error removing delivery ${deliveryId} from route ${routeId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in removeDeliveryFromRoute for route ${routeId} and delivery ${deliveryId}:`, error);
    throw error;
  }
};

// Função para atualizar a sequência de entregas em uma rota
export const updateDeliverySequence = async (
  routeId: string, 
  deliveryId: string, 
  newSequence: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('route_deliveries')
      .update({ sequence_number: newSequence })
      .eq('route_id', routeId)
      .eq('delivery_id', deliveryId);
    
    if (error) {
      console.error(`Error updating sequence for delivery ${deliveryId} in route ${routeId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error in updateDeliverySequence for route ${routeId} and delivery ${deliveryId}:`, error);
    throw error;
  }
};
