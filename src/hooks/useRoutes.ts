import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import * as routeService from '@/services/routeService';
import { Route } from '@/services/routeService';
import { DeliveryItem } from '@/utils/deliveryUtils';

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar rotas do Supabase
  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.fetchRoutes();
      setRoutes(data);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
      setError('Falha ao carregar rotas. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao carregar rotas. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar rotas ao inicializar
  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Selecionar uma rota específica
  const selectRoute = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.fetchRoute(id);
      setSelectedRoute(data);
      return data;
    } catch (err) {
      console.error('Erro ao selecionar rota:', err);
      setError('Falha ao carregar detalhes da rota. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao carregar detalhes da rota. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar nova rota
  const createRoute = useCallback(async (
    routeData: Omit<Route, 'id' | 'criadoEm' | 'atualizadoEm'>
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.createRoute(routeData);
      setRoutes(prev => [data, ...prev]);
      toast({
        title: 'Sucesso',
        description: 'Rota criada com sucesso.',
      });
      return data;
    } catch (err) {
      console.error('Erro ao criar rota:', err);
      setError('Falha ao criar rota. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao criar rota. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar rota
  const updateRoute = useCallback(async (routeData: Route) => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.updateRoute(routeData);
      setRoutes(prev => 
        prev.map(route => route.id === data.id ? data : route)
      );
      if (selectedRoute && selectedRoute.id === data.id) {
        setSelectedRoute(data);
      }
      toast({
        title: 'Sucesso',
        description: 'Rota atualizada com sucesso.',
      });
      return data;
    } catch (err) {
      console.error('Erro ao atualizar rota:', err);
      setError('Falha ao atualizar rota. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar rota. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedRoute]);

  // Excluir rota
  const deleteRoute = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await routeService.deleteRoute(id);
      setRoutes(prev => prev.filter(route => route.id !== id));
      if (selectedRoute && selectedRoute.id === id) {
        setSelectedRoute(null);
      }
      toast({
        title: 'Sucesso',
        description: 'Rota excluída com sucesso.',
      });
    } catch (err) {
      console.error('Erro ao excluir rota:', err);
      setError('Falha ao excluir rota. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao excluir rota. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedRoute]);

  // Adicionar entregas a uma rota
  const addDeliveriesToRoute = useCallback(async (
    routeId: string,
    deliveries: DeliveryItem[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      await routeService.addDeliveriesToRoute(routeId, deliveries);
      toast({
        title: 'Sucesso',
        description: `${deliveries.length} entregas adicionadas à rota.`,
      });
    } catch (err) {
      console.error('Erro ao adicionar entregas à rota:', err);
      setError('Falha ao adicionar entregas à rota. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar entregas à rota. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Remover entrega de uma rota
  const removeDeliveryFromRoute = useCallback(async (
    routeId: string,
    deliveryId: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      await routeService.removeDeliveryFromRoute(routeId, deliveryId);
      toast({
        title: 'Sucesso',
        description: 'Entrega removida da rota.',
      });
    } catch (err) {
      console.error('Erro ao remover entrega da rota:', err);
      setError('Falha ao remover entrega da rota. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao remover entrega da rota. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar sequência de entregas em uma rota
  const updateDeliverySequence = useCallback(async (
    routeId: string,
    deliverySequence: { deliveryId: string; sequenceNumber: number }[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      await routeService.updateDeliverySequence(routeId, deliverySequence);
      toast({
        title: 'Sucesso',
        description: 'Sequência de entregas atualizada.',
      });
    } catch (err) {
      console.error('Erro ao atualizar sequência de entregas:', err);
      setError('Falha ao atualizar sequência de entregas. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar sequência de entregas. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    routes,
    selectedRoute,
    loading,
    error,
    loadRoutes,
    selectRoute,
    createRoute,
    updateRoute,
    deleteRoute,
    addDeliveriesToRoute,
    removeDeliveryFromRoute,
    updateDeliverySequence,
  };
};

export default useRoutes;
