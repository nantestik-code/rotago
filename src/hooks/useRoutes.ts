
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as routeService from '@/services/routeService';
import { useState } from 'react';
import { Route, RouteWithDeliveries } from '@/types/route';
import { Delivery } from '@/types/delivery';
import { toast } from '@/hooks/use-toast';

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentRoute, setCurrentRoute] = useState<RouteWithDeliveries | null>(null);
  const queryClient = useQueryClient();

  // Buscar rotas
  const { isLoading, error } = useQuery({
    queryKey: ['routes'],
    queryFn: routeService.fetchRoutes,
    onSuccess: (data: Route[]) => {
      setRoutes(data);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao carregar rotas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Buscar rota específica com entregas
  const fetchRouteDetails = async (id: string) => {
    try {
      const data = await routeService.fetchRouteWithDeliveries(id);
      setCurrentRoute(data);
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao carregar detalhes da rota',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Criar rota
  const { mutate: addRoute } = useMutation({
    mutationFn: (route: Omit<Route, 'id'>) => {
      return routeService.createRoute(route);
    },
    onSuccess: (data: Route) => {
      setRoutes((prev) => [...prev, data]);
      
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast({
        title: 'Rota criada',
        description: 'A rota foi criada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar rota',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar rota
  const { mutate: updateRoute } = useMutation({
    mutationFn: ({ id, route }: { id: string; route: Partial<Route> }) => {
      return routeService.updateRoute(id, route);
    },
    onSuccess: (data: Route) => {
      setRoutes(prev => 
        prev.map(route => route.id === data.id ? data : route)
      );
      
      if (currentRoute && currentRoute.id === data.id) {
        setCurrentRoute({
          ...currentRoute,
          ...data
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast({
        title: 'Rota atualizada',
        description: 'A rota foi atualizada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar rota',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Excluir rota
  const { mutate: deleteRoute } = useMutation({
    mutationFn: (id: string) => {
      return routeService.deleteRoute(id);
    },
    onSuccess: (_, variables) => {
      setRoutes(prev => prev.filter(route => route.id !== variables));
      
      if (currentRoute && currentRoute.id === variables) {
        setCurrentRoute(null);
      }
      
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast({
        title: 'Rota excluída',
        description: 'A rota foi excluída com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir rota',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Adicionar entregas a uma rota
  const addDeliveriesToRoute = async (routeId: string, deliveries: Delivery[], startSequence = 1) => {
    try {
      await routeService.addDeliveriesToRoute(routeId, deliveries, startSequence);
      
      // Atualizar o cache e o estado atual
      if (currentRoute && currentRoute.id === routeId) {
        // Recarregar os detalhes da rota atual
        await fetchRouteDetails(routeId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['routes', routeId] });
      toast({
        title: 'Entregas adicionadas',
        description: `${deliveries.length} entregas foram adicionadas à rota!`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao adicionar entregas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // Remover entrega de uma rota
  const removeDeliveryFromRoute = async (routeId: string, deliveryId: string) => {
    try {
      await routeService.removeDeliveryFromRoute(routeId, deliveryId);
      
      // Atualizar o estado atual se for a rota atual
      if (currentRoute && currentRoute.id === routeId) {
        setCurrentRoute({
          ...currentRoute,
          deliveries: currentRoute.deliveries.filter(d => d.id !== deliveryId)
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['routes', routeId] });
      toast({
        title: 'Entrega removida',
        description: 'A entrega foi removida da rota com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao remover entrega',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  // Atualizar sequência de uma entrega
  const updateDeliverySequence = async (routeId: string, deliveryId: string, newSequence: number) => {
    try {
      await routeService.updateDeliverySequence(routeId, deliveryId, newSequence);
      
      // Atualizar o estado atual se for a rota atual
      if (currentRoute && currentRoute.id === routeId) {
        // Reordenar as entregas com a nova sequência
        const updatedDeliveries = [...currentRoute.deliveries].map(d => {
          if (d.id === deliveryId) {
            return { ...d, sequence_number: newSequence };
          }
          return d;
        }).sort((a, b) => a.sequence_number - b.sequence_number);
        
        setCurrentRoute({
          ...currentRoute,
          deliveries: updatedDeliveries
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['routes', routeId] });
      toast({
        title: 'Sequência atualizada',
        description: 'A ordem das entregas foi atualizada com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar sequência',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  return {
    routes,
    currentRoute,
    isLoading,
    error,
    fetchRouteDetails,
    addRoute,
    updateRoute,
    deleteRoute,
    addDeliveriesToRoute,
    removeDeliveryFromRoute,
    updateDeliverySequence,
  };
};

export default useRoutes;
