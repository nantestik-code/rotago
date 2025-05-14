
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as deliveryService from '@/services/deliveryService';
import { useState } from 'react';
import { DeliveryItem, Delivery, deliveryMapper } from '@/types/delivery';
import { toast } from '@/hooks/use-toast';

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const queryClient = useQueryClient();

  // Buscar entregas
  const { isLoading, error } = useQuery({
    queryKey: ['deliveries'],
    queryFn: deliveryService.fetchDeliveries,
    onSuccess: (data: Delivery[]) => {
      // Converter do formato de API para o formato do frontend
      const mappedItems = deliveryMapper.toItemArray(data);
      setDeliveries(mappedItems);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao carregar entregas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Criar entrega
  const { mutate: addDelivery } = useMutation({
    mutationFn: (item: Omit<DeliveryItem, 'id'>) => {
      // Converter do formato de frontend para o formato de API
      const newDelivery: Omit<Delivery, 'id'> = {
        client_name: item.cliente,
        address: item.endereco,
        city: item.cidade,
        state: item.estado,
        zip_code: item.cep,
        phone: item.telefone,
        notes: item.observacoes,
        order_number: Math.random().toString(36).substring(2, 10), // ID aleatório
        status: 'pendente',
        latitude: item.lat,
        longitude: item.lng,
      };
      return deliveryService.createDelivery(newDelivery);
    },
    onSuccess: (data: Delivery) => {
      // Converter o resultado da API para o formato de frontend
      const newItem = deliveryMapper.toItem(data);
      setDeliveries((prev) => [...prev, newItem]);
      
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({
        title: 'Entrega adicionada',
        description: 'A entrega foi adicionada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar entrega',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar entrega
  const { mutate: updateDelivery } = useMutation({
    mutationFn: (item: DeliveryItem) => {
      // Converter do formato de frontend para o formato de API
      const updatedDelivery = deliveryMapper.fromItem(item);
      return deliveryService.updateDelivery(item.id, updatedDelivery);
    },
    onSuccess: (data: Delivery) => {
      const updatedItem = deliveryMapper.toItem(data);
      
      setDeliveries(prev => 
        prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
      
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({
        title: 'Entrega atualizada',
        description: 'A entrega foi atualizada com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar entrega',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar entrega
  const { mutate: deleteDelivery } = useMutation({
    mutationFn: (id: string) => {
      return deliveryService.deleteDelivery(id);
    },
    onSuccess: (_, variables) => {
      setDeliveries(prev => prev.filter(item => item.id !== variables));
      
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({
        title: 'Entrega removida',
        description: 'A entrega foi removida com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover entrega',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Importar entregas
  const importDeliveries = (items: DeliveryItem[]) => {
    // Mapear os itens do frontend para o formato da API
    const apiDeliveries = deliveryMapper.fromItemArray(items);
    
    // Remover propriedade ID para criar novos registros
    const newDeliveries = apiDeliveries.map(({ id, ...rest }) => rest);
    
    deliveryService.createMultipleDeliveries(newDeliveries)
      .then(createdDeliveries => {
        const newItems = deliveryMapper.toItemArray(createdDeliveries);
        setDeliveries(prev => [...prev, ...newItems]);
        
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        toast({
          title: 'Entregas importadas',
          description: `${newItems.length} entregas foram importadas com sucesso!`,
        });
      })
      .catch(error => {
        toast({
          title: 'Erro ao importar entregas',
          description: error.message,
          variant: 'destructive',
        });
      });
  };

  return {
    deliveries,
    isLoading,
    error,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    importDeliveries,
    setDeliveries,
  };
};

export default useDeliveries;
