
import { useState, useCallback, useEffect } from 'react';
import { DeliveryItem, getStatusCounts } from '@/utils/deliveryUtils';
import { geocodeAddresses, optimizeRoute } from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';
import { MapPosition } from '@/utils/mapUtils';

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [processingGeocode, setProcessingGeocode] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [processingOptimization, setProcessingOptimization] = useState(false);

  // Handle deliveries import
  const handleImportComplete = useCallback(async (importedDeliveries: DeliveryItem[]) => {
    // Geocode addresses
    setProcessingGeocode(true);
    setGeocodeProgress(0);
    
    try {
      const geocodedDeliveries = await geocodeAddresses(
        importedDeliveries,
        (progress) => setGeocodeProgress(progress)
      );
      
      setDeliveries(geocodedDeliveries);
      
      // Find first pending delivery to select
      const firstPending = geocodedDeliveries.find(d => d.status === 'pendente');
      if (firstPending) {
        setSelectedDeliveryId(firstPending.id);
      }
      
      toast({
        title: 'Endereços processados',
        description: `${geocodedDeliveries.length} endereços foram geocodificados com sucesso.`,
      });

    } catch (error) {
      toast({
        title: 'Erro de geocodificação',
        description: 'Ocorreu um erro ao converter endereços em coordenadas.',
        variant: 'destructive',
      });
      console.error('Geocoding error:', error);
      setDeliveries(importedDeliveries);
    } finally {
      setProcessingGeocode(false);
      setGeocodeProgress(100);
      
      // Reset progress after delay
      setTimeout(() => {
        setGeocodeProgress(0);
      }, 1000);
    }
  }, []);

  // Handle status change with animation flag
  const handleStatusChange = useCallback((id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    setDeliveries(prev => 
      prev.map(delivery => 
        delivery.id === id ? { 
          ...delivery, 
          status,
          statusChanged: true // Mark that status just changed to trigger animations
        } : delivery
      )
    );
    
    // After a short delay, remove the statusChanged flag
    setTimeout(() => {
      setDeliveries(prev => 
        prev.map(delivery => 
          delivery.id === id ? { ...delivery, statusChanged: false } : delivery
        )
      );
    }, 1500); // Duration of animation
    
    const statusMessages = {
      pendente: 'Entrega marcada como pendente',
      entregue: 'Entrega concluída com sucesso',
      ocorrencia: 'Ocorrência registrada para esta entrega',
    };
    
    toast({
      title: statusMessages[status],
      description: `O status da entrega foi atualizado.`,
    });
  }, []);

  // Handle route optimization
  const optimizeDeliveryRoute = useCallback(async (currentLocation: MapPosition | null) => {
    if (!currentLocation) {
      toast({
        title: 'Localização necessária',
        description: 'Sua localização atual é necessária para otimizar a rota.',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingOptimization(true);
    
    try {
      const optimizedDeliveries = await optimizeRoute(
        currentLocation,
        deliveries
      );
      
      setDeliveries(optimizedDeliveries);
      
      toast({
        title: 'Rota otimizada',
        description: 'A rota foi otimizada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro de otimização',
        description: 'Ocorreu um erro ao otimizar a rota.',
        variant: 'destructive',
      });
      console.error('Optimization error:', error);
    } finally {
      setProcessingOptimization(false);
    }
  }, [deliveries]);

  // Get status counts
  const statusCounts = getStatusCounts(deliveries);

  return {
    deliveries,
    setDeliveries,
    selectedDeliveryId,
    setSelectedDeliveryId,
    processingGeocode,
    geocodeProgress,
    processingOptimization,
    handleImportComplete,
    handleStatusChange,
    optimizeDeliveryRoute,
    statusCounts
  };
}
