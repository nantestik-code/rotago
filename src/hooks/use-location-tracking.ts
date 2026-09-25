import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPosition,
  calculateDistance,
  getCurrentPosition,
  stopWatchingPosition,
  watchPosition,
} from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';
import { DeliveryItem } from '@/utils/deliveryUtils';

type DeliveryDistance = {
  delivery: DeliveryItem;
  distance: number;
};

export function useLocationTracking(
  deliveries: DeliveryItem[],
  onDeliveryProximity: (deliveryId: string) => void
) {
  const [currentLocation, setCurrentLocation] = useState<MapPosition | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const deliveriesRef = useRef<DeliveryItem[]>(deliveries);
  const isTrackingActiveRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const lastProximityDeliveryIdRef = useRef<string | null>(null);
  const lastProximityToastAtRef = useRef(0);
  const pendingSignatureRef = useRef('');
  const shouldAutoSelectNearestRef = useRef(true);

  useEffect(() => {
    deliveriesRef.current = deliveries;
  }, [deliveries]);

  useEffect(() => {
    watchIdRef.current = watchId;
  }, [watchId]);

  useEffect(() => {
    isTrackingActiveRef.current = isTrackingActive;
  }, [isTrackingActive]);

  const getPendingDeliveriesByDistance = useCallback((position: MapPosition): DeliveryDistance[] => {
    return deliveriesRef.current
      .filter(delivery => delivery.status === 'pendente' && delivery.lat != null && delivery.lng != null)
      .map(delivery => ({
        delivery,
        distance: calculateDistance(position.lat, position.lng, delivery.lat!, delivery.lng!),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, []);

  const selectNearestPendingDelivery = useCallback(
    (position: MapPosition) => {
      if (!shouldAutoSelectNearestRef.current) return;

      const nearestPendingDelivery = getPendingDeliveriesByDistance(position)[0];
      if (!nearestPendingDelivery) return;

      shouldAutoSelectNearestRef.current = false;
      lastProximityDeliveryIdRef.current = nearestPendingDelivery.delivery.id;
      onDeliveryProximity(nearestPendingDelivery.delivery.id);
    },
    [getPendingDeliveriesByDistance, onDeliveryProximity]
  );

  useEffect(() => {
    const pendingSignature = deliveries
      .filter(delivery => delivery.status === 'pendente')
      .map(delivery => delivery.id)
      .sort()
      .join('|');

    if (pendingSignature === pendingSignatureRef.current) {
      return;
    }

    pendingSignatureRef.current = pendingSignature;
    shouldAutoSelectNearestRef.current = pendingSignature.length > 0;
    lastProximityDeliveryIdRef.current = null;

    if (currentLocation) {
      selectNearestPendingDelivery(currentLocation);
    }
  }, [currentLocation, deliveries, selectNearestPendingDelivery]);

  const handlePositionUpdate = useCallback(
    (position: MapPosition) => {
      setCurrentLocation(position);

      selectNearestPendingDelivery(position);

      const nearestNearbyDelivery = getPendingDeliveriesByDistance(position).find(
        entry => entry.distance <= 100
      );

      if (!nearestNearbyDelivery) {
        return;
      }

      const { delivery, distance } = nearestNearbyDelivery;
      const now = Date.now();
      const hasSelectionChanged = lastProximityDeliveryIdRef.current !== delivery.id;
      const shouldNotify = hasSelectionChanged || now - lastProximityToastAtRef.current > 15000;

      if (hasSelectionChanged) {
        lastProximityDeliveryIdRef.current = delivery.id;
        onDeliveryProximity(delivery.id);
      }

      if (!shouldNotify) {
        return;
      }

      lastProximityToastAtRef.current = now;

      if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
          new Notification('Entrega proxima!', {
            body: `Voce esta a ${Math.round(distance)}m de: ${delivery.cliente}`,
            icon: '/favicon.ico',
          });
        }
      }

      toast({
        title: 'Entrega proxima!',
        description: `Voce esta a ${Math.round(distance)}m de: ${delivery.cliente}`,
      });
    },
    [getPendingDeliveriesByDistance, onDeliveryProximity, selectNearestPendingDelivery]
  );

  const startTrackingInternal = useCallback(() => {
    if (isTrackingActiveRef.current) return;

    const id = watchPosition(
      handlePositionUpdate,
      error => {
        console.error('Error watching position:', error);
        setIsTrackingActive(false);
        isTrackingActiveRef.current = false;
      }
    );

    if (id !== null) {
      setWatchId(id);
      setIsTrackingActive(true);
      isTrackingActiveRef.current = true;
    }
  }, [handlePositionUpdate]);

  useEffect(() => {
    const init = async () => {
      try {
        const position = await getCurrentPosition();
        setCurrentLocation(position);
        selectNearestPendingDelivery(position);
        startTrackingInternal();
      } catch (error) {
        setCurrentLocation(null);
      }
    };

    init();
  }, [selectNearestPendingDelivery, startTrackingInternal]);

  const startTracking = useCallback(() => {
    if (isTrackingActive) return;

    startTrackingInternal();

    if (!isTrackingActive) {
      toast({
        title: 'Rastreamento iniciado',
        description: 'Sua localizacao esta sendo monitorada em tempo real.',
      });
    }
  }, [isTrackingActive, startTrackingInternal]);

  const stopTracking = useCallback(() => {
    if (!isTrackingActive) return;

    stopWatchingPosition(watchId);
    setIsTrackingActive(false);
    setWatchId(null);
    isTrackingActiveRef.current = false;

    toast({
      title: 'Rastreamento parado',
      description: 'O monitoramento de localizacao foi interrompido.',
    });
  }, [isTrackingActive, watchId]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        stopWatchingPosition(watchIdRef.current);
      }
    };
  }, []);

  return {
    currentLocation,
    isTrackingActive,
    startTracking,
    stopTracking,
  };
}
