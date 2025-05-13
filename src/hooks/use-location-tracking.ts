
import { useState, useCallback, useEffect } from 'react';
import { MapPosition, getCurrentPosition, watchPosition, stopWatchingPosition } from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';
import { calculateDistance } from '@/utils/deliveryUtils';
import { DeliveryItem } from '@/utils/deliveryUtils';

export function useLocationTracking(
  deliveries: DeliveryItem[],
  onDeliveryProximity: (deliveryId: string) => void
) {
  const [currentLocation, setCurrentLocation] = useState<MapPosition | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Initialize location
  useEffect(() => {
    const init = async () => {
      try {
        const position = await getCurrentPosition();
        setCurrentLocation(position);
      } catch (error) {
        console.error('Error getting current position:', error);
        toast({
          title: 'Erro de localização',
          description: 'Não foi possível obter sua localização atual.',
          variant: 'destructive',
        });
      }
    };

    init();
  }, []);

  // Start location tracking
  const startTracking = useCallback(() => {
    if (isTrackingActive) return;
    
    const id = watchPosition(
      (position) => {
        setCurrentLocation(position);
        
        // Check proximity to deliveries
        deliveries.forEach(delivery => {
          if (delivery.status === 'pendente' && delivery.lat && delivery.lng && position) {
            const distance = calculateDistance(
              position.lat, 
              position.lng, 
              delivery.lat!, 
              delivery.lng!
            );
            
            // Notify when within 100 meters of a delivery
            if (distance <= 100) {
              // Check if browser supports notifications
              if ('Notification' in window) {
                // Request permission if not granted
                if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                  Notification.requestPermission();
                }
                
                // Show notification if permission granted
                if (Notification.permission === 'granted') {
                  new Notification('Entrega próxima!', {
                    body: `Você está a ${Math.round(distance)}m de: ${delivery.cliente}`,
                    icon: '/favicon.ico'
                  });
                }
              }
              
              toast({
                title: 'Entrega próxima!',
                description: `Você está a ${Math.round(distance)}m de: ${delivery.cliente}`,
              });
              
              onDeliveryProximity(delivery.id);
            }
          }
        });
      },
      (error) => {
        console.error('Error watching position:', error);
        toast({
          title: 'Erro de rastreamento',
          description: 'Ocorreu um erro ao rastrear sua localização.',
          variant: 'destructive',
        });
        setIsTrackingActive(false);
      }
    );
    
    if (id !== null) {
      setWatchId(id);
      setIsTrackingActive(true);
      toast({
        title: 'Rastreamento iniciado',
        description: 'Sua localização está sendo monitorada em tempo real.',
      });
    }
  }, [deliveries, isTrackingActive, onDeliveryProximity]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (!isTrackingActive) return;
    
    stopWatchingPosition(watchId);
    setIsTrackingActive(false);
    setWatchId(null);
    
    toast({
      title: 'Rastreamento parado',
      description: 'O monitoramento de localização foi interrompido.',
    });
  }, [isTrackingActive, watchId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        stopWatchingPosition(watchId);
      }
    };
  }, [watchId]);

  return {
    currentLocation,
    isTrackingActive,
    startTracking,
    stopTracking
  };
}
