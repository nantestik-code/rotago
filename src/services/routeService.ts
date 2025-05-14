import { supabase } from '@/integrations/supabase/client';
import { DeliveryItem } from '@/utils/deliveryUtils';

// Interface para rotas no Supabase
interface SupabaseRoute {
  id: string;
  name: string;
  description: string | null;
  date: string;
  status: 'ativa' | 'concluida' | 'cancelada';
  created_at: string;
  updated_at: string;
}

// Interface para a aplicação
export interface Route {
  id: string;
  nome: string;
  descricao?: string;
  data: string;
  status: 'ativa' | 'concluida' | 'cancelada';
  criadoEm: string;
  atualizadoEm: string;
}

// Converter de formato Supabase para formato da aplicação
const mapSupabaseToRoute = (data: SupabaseRoute): Route => {
  return {
    id: data.id,
    nome: data.name,
    descricao: data.description || undefined,
    data: data.date,
    status: data.status,
    criadoEm: data.created_at,
    atualizadoEm: data.updated_at,
  };
};

// Converter de formato da aplicação para Supabase
const mapRouteToSupabase = (route: Route): Partial<SupabaseRoute> => {
  return {
    name: route.nome,
    description: route.descricao || null,
    date: route.data,
    status: route.status,
    updated_at: new Date().toISOString(),
  };
};

// Buscar todas as rotas
export const fetchRoutes = async (): Promise<Route[]> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar rotas:', error);
      throw error;
    }

    return (data as SupabaseRoute[]).map(mapSupabaseToRoute);
  } catch (error) {
    console.error('Erro ao buscar rotas:', error);
    throw error;
  }
};

// Buscar uma rota específica
export const fetchRoute = async (id: string): Promise<Route> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar rota:', error);
      throw error;
    }

    return mapSupabaseToRoute(data as SupabaseRoute);
  } catch (error) {
    console.error('Erro ao buscar rota:', error);
    throw error;
  }
};

// Criar uma nova rota
export const createRoute = async (route: Omit<Route, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Route> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .insert({
        name: route.nome,
        description: route.descricao || null,
        date: route.data,
        status: route.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar rota:', error);
      throw error;
    }

    return mapSupabaseToRoute(data as SupabaseRoute);
  } catch (error) {
    console.error('Erro ao criar rota:', error);
    throw error;
  }
};

// Atualizar uma rota
export const updateRoute = async (route: Route): Promise<Route> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .update(mapRouteToSupabase(route))
      .eq('id', route.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar rota:', error);
      throw error;
    }

    return mapSupabaseToRoute(data as SupabaseRoute);
  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    throw error;
  }
};

// Excluir uma rota
export const deleteRoute = async (id: string): Promise<void> => {
  try {
    // Primeiro excluir as relações na tabela route_deliveries
    const { error: relationError } = await supabase
      .from('route_deliveries')
      .delete()
      .eq('route_id', id);

    if (relationError) {
      console.error('Erro ao excluir relações da rota:', relationError);
      throw relationError;
    }

    // Depois excluir a rota
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir rota:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir rota:', error);
    throw error;
  }
};

// Adicionar entregas a uma rota
export const addDeliveriesToRoute = async (
  routeId: string,
  deliveries: DeliveryItem[],
): Promise<void> => {
  try {
    const routeDeliveries = deliveries.map((delivery, index) => ({
      route_id: routeId,
      delivery_id: delivery.id,
      sequence_number: index + 1,
    }));

    const { error } = await supabase
      .from('route_deliveries')
      .insert(routeDeliveries);

    if (error) {
      console.error('Erro ao adicionar entregas à rota:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao adicionar entregas à rota:', error);
    throw error;
  }
};

// Remover uma entrega de uma rota
export const removeDeliveryFromRoute = async (
  routeId: string,
  deliveryId: string,
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('route_deliveries')
      .delete()
      .eq('route_id', routeId)
      .eq('delivery_id', deliveryId);

    if (error) {
      console.error('Erro ao remover entrega da rota:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao remover entrega da rota:', error);
    throw error;
  }
};

// Atualizar a ordem das entregas em uma rota
export const updateDeliverySequence = async (
  routeId: string,
  deliverySequence: { deliveryId: string; sequenceNumber: number }[],
): Promise<void> => {
  try {
    // Usar transação para garantir consistência
    await supabase.rpc('update_delivery_sequence', {
      p_route_id: routeId,
      p_delivery_sequence: deliverySequence.map(item => ({
        delivery_id: item.deliveryId,
        sequence_number: item.sequenceNumber,
      })),
    });
  } catch (error) {
    console.error('Erro ao atualizar sequência de entregas:', error);
    throw error;
  }
};
