
import { useState, useEffect, useCallback } from 'react';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { toast } from '@/components/ui/use-toast';
import * as deliveryService from '@/services/deliveryService';

export const useDeliveries = (initialDeliveries: DeliveryItem[] = []) => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(initialDeliveries);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar entregas do Supabase
  const loadDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryService.fetchDeliveries();
      setDeliveries(data);
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
      setError('Falha ao carregar entregas. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao carregar entregas. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar entregas ao inicializar
  useEffect(() => {
    if (initialDeliveries.length === 0) {
      loadDeliveries();
    }
  }, [initialDeliveries.length, loadDeliveries]);

  // Adicionar entregas
  const addDeliveries = useCallback(async (newDeliveries: DeliveryItem[]) => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryService.createDeliveries(newDeliveries);
      setDeliveries(prev => [...prev, ...data]);
      toast({
        title: 'Sucesso',
        description: `${data.length} entregas adicionadas com sucesso.`,
      });
      return data;
    } catch (err) {
      console.error('Erro ao adicionar entregas:', err);
      setError('Falha ao adicionar entregas. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar entregas. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar entrega
  const updateDelivery = useCallback(async (updatedDelivery: DeliveryItem) => {
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryService.updateDelivery(updatedDelivery);
      setDeliveries(prev => 
        prev.map(delivery => delivery.id === data.id ? data : delivery)
      );
      toast({
        title: 'Sucesso',
        description: 'Entrega atualizada com sucesso.',
      });
      return data;
    } catch (err) {
      console.error('Erro ao atualizar entrega:', err);
      setError('Falha ao atualizar entrega. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar entrega. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar status de entrega
  const updateDeliveryStatus = useCallback(async (
    id: string, 
    status: 'pendente' | 'entregue' | 'ocorrencia'
  ) => {
    try {
      setLoading(true);
      setError(null);
      await deliveryService.updateDeliveryStatus(id, status);
      setDeliveries(prev => 
        prev.map(delivery => 
          delivery.id === id 
            ? { ...delivery, status, statusChanged: true }
            : delivery
        )
      );
      toast({
        title: 'Sucesso',
        description: `Status da entrega atualizado para ${status}.`,
      });
    } catch (err) {
      console.error('Erro ao atualizar status da entrega:', err);
      setError('Falha ao atualizar status da entrega. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status da entrega. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir entrega
  const deleteDelivery = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deliveryService.deleteDelivery(id);
      setDeliveries(prev => prev.filter(delivery => delivery.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Entrega excluída com sucesso.',
      });
    } catch (err) {
      console.error('Erro ao excluir entrega:', err);
      setError('Falha ao excluir entrega. Tente novamente mais tarde.');
      toast({
        title: 'Erro',
        description: 'Falha ao excluir entrega. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deliveries,
    setDeliveries,
    loading,
    error,
    loadDeliveries,
    addDeliveries,
    updateDelivery,
    updateDeliveryStatus,
    deleteDelivery,
  };
};

export default useDeliveries;
