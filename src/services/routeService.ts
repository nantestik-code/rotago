
import { supabase } from '@/integrations/supabase/client';
import { Route } from '@/types/route';
import { Delivery } from '@/types/delivery';
import { mapSupabaseToDelivery } from './deliveryService';

// Interface matching the Supabase routes table
export interface SupabaseRoute {
  id: string;
  name: string;
  description: string | null;
  date: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

// Interface for route_deliveries join table
export interface SupabaseRouteDelivery {
  id: string;
  route_id: string;
  delivery_id: string;
  sequence_number: number;
  created_at: string | null;
  updated_at: string | null;
}

// Convert Supabase route to client route model
export const mapSupabaseToRoute = (data: SupabaseRoute): Route => ({
  id: data.id,
  name: data.name,
  description: data.description || '',
  date: data.date || new Date().toISOString(),
  status: data.status,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
  deliveries: []
});

// Convert client route model to Supabase format
export const mapRouteToSupabase = (route: Route): SupabaseRoute => ({
  id: route.id,
  name: route.name,
  description: route.description || null,
  date: route.date,
  status: route.status,
  created_at: route.createdAt || new Date().toISOString(),
  updated_at: route.updatedAt || new Date().toISOString()
});

// Fetch all routes
export const fetchRoutes = async (): Promise<Route[]> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*');
    
    if (error) {
      console.error('Error fetching routes:', error);
      throw new Error(`Failed to fetch routes: ${error.message}`);
    }
    
    return (data as SupabaseRoute[] || []).map(mapSupabaseToRoute);
  } catch (error) {
    console.error('Error in fetchRoutes:', error);
    throw error;
  }
};

// Fetch a single route by ID with its deliveries
export const fetchRouteById = async (id: string): Promise<Route | null> => {
  try {
    // Fetch the route
    const { data: routeData, error: routeError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (routeError) {
      if (routeError.code === 'PGRST116') {
        // No rows returned (not found)
        return null;
      }
      console.error('Error fetching route:', routeError);
      throw new Error(`Failed to fetch route: ${routeError.message}`);
    }
    
    if (!routeData) return null;
    
    // Fetch the route's deliveries through route_deliveries
    const { data: routeDeliveriesData, error: routeDeliveriesError } = await supabase
      .from('route_deliveries')
      .select(`
        delivery_id,
        sequence_number,
        deliveries:delivery_id(*)
      `)
      .eq('route_id', id)
      .order('sequence_number');
    
    if (routeDeliveriesError) {
      console.error('Error fetching route deliveries:', routeDeliveriesError);
      throw new Error(`Failed to fetch route deliveries: ${routeDeliveriesError.message}`);
    }
    
    // Map to Route type
    const route = mapSupabaseToRoute(routeData as SupabaseRoute);
    
    // Add deliveries to the route
    if (routeDeliveriesData && routeDeliveriesData.length > 0) {
      route.deliveries = routeDeliveriesData
        .filter(item => item.deliveries)
        .map(item => mapSupabaseToDelivery(item.deliveries as any))
        .sort((a, b) => {
          const aSequence = routeDeliveriesData.find(d => d.delivery_id === a.id)?.sequence_number || 0;
          const bSequence = routeDeliveriesData.find(d => d.delivery_id === b.id)?.sequence_number || 0;
          return aSequence - bSequence;
        });
    }
    
    return route;
  } catch (error) {
    console.error('Error in fetchRouteById:', error);
    throw error;
  }
};

// Create a new route
export const createRoute = async (route: Omit<Route, 'id'>): Promise<Route> => {
  try {
    // Convert to Supabase format, omitting id
    const supabaseRoute: Omit<SupabaseRoute, 'id'> = {
      name: route.name,
      description: route.description || null,
      date: route.date,
      status: route.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('routes')
      .insert(supabaseRoute)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating route:', error);
      throw new Error(`Failed to create route: ${error.message}`);
    }
    
    const newRoute = mapSupabaseToRoute(data as SupabaseRoute);
    
    // If deliveries are provided, associate them with the route
    if (route.deliveries && route.deliveries.length > 0) {
      await associateDeliveriesWithRoute(newRoute.id, route.deliveries);
      newRoute.deliveries = route.deliveries;
    }
    
    return newRoute;
  } catch (error) {
    console.error('Error in createRoute:', error);
    throw error;
  }
};

// Update a route
export const updateRoute = async (route: Route): Promise<Route> => {
  try {
    const supabaseRoute = mapRouteToSupabase(route);
    
    const { data, error } = await supabase
      .from('routes')
      .update(supabaseRoute)
      .eq('id', route.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating route:', error);
      throw new Error(`Failed to update route: ${error.message}`);
    }
    
    const updatedRoute = mapSupabaseToRoute(data as SupabaseRoute);
    
    // If deliveries are provided, update the route-delivery associations
    if (route.deliveries && route.deliveries.length > 0) {
      // First remove all existing associations
      await supabase
        .from('route_deliveries')
        .delete()
        .eq('route_id', route.id);
      
      // Then add the new ones
      await associateDeliveriesWithRoute(route.id, route.deliveries);
      updatedRoute.deliveries = route.deliveries;
    }
    
    return updatedRoute;
  } catch (error) {
    console.error('Error in updateRoute:', error);
    throw error;
  }
};

// Delete a route
export const deleteRoute = async (id: string): Promise<void> => {
  try {
    // The cascade delete will handle route_deliveries due to the foreign key constraint
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting route:', error);
      throw new Error(`Failed to delete route: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteRoute:', error);
    throw error;
  }
};

// Associate deliveries with a route (creating route_deliveries entries)
export const associateDeliveriesWithRoute = async (
  routeId: string, 
  deliveries: Delivery[]
): Promise<void> => {
  try {
    const routeDeliveries = deliveries.map((delivery, index) => ({
      route_id: routeId,
      delivery_id: delivery.id,
      sequence_number: index + 1, // 1-based sequence
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('route_deliveries')
      .insert(routeDeliveries);
    
    if (error) {
      console.error('Error associating deliveries with route:', error);
      throw new Error(`Failed to associate deliveries with route: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in associateDeliveriesWithRoute:', error);
    throw error;
  }
};
