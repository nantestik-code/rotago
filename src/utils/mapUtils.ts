
import { DeliveryItem } from './deliveryUtils';

export interface MapPosition {
  lat: number;
  lng: number;
}

export const defaultMapCenter = {
  lat: -23.5505,
  lng: -46.6333,
}; // São Paulo, Brazil

export const getCurrentPosition = (): Promise<MapPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting current position:', error);
        reject(error);
      },
      { enableHighAccuracy: true }
    );
  });
};

export const watchPosition = (
  onPositionChange: (position: MapPosition) => void,
  onError?: (error: GeolocationPositionError) => void
) => {
  if (!navigator.geolocation) {
    if (onError) onError({ code: 0, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPositionChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      console.error('Error watching position:', error);
      if (onError) onError(error);
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
  );

  return watchId;
};

export const stopWatchingPosition = (watchId: number | null) => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
};

export const geocodeAddress = async (
  address: string,
  apiKey: string
): Promise<MapPosition | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const geocodeAddresses = async (
  deliveries: DeliveryItem[],
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<DeliveryItem[]> => {
  const updatedDeliveries = [...deliveries];
  let processed = 0;

  for (const delivery of updatedDeliveries) {
    if (!delivery.lat || !delivery.lng) {
      const fullAddress = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}`;
      const location = await geocodeAddress(fullAddress, apiKey);

      if (location) {
        delivery.lat = location.lat;
        delivery.lng = location.lng;
      }
    }

    processed++;
    if (onProgress) onProgress((processed / updatedDeliveries.length) * 100);
  }

  return updatedDeliveries;
};

export const optimizeRoute = async (
  origin: MapPosition,
  destinations: DeliveryItem[],
  apiKey: string
): Promise<DeliveryItem[]> => {
  // Filter only pending deliveries for optimization
  const pendingDeliveries = destinations.filter(d => d.status === 'pendente');
  
  if (pendingDeliveries.length <= 1) {
    return destinations; // No need to optimize for 0 or 1 deliveries
  }

  try {
    const waypoints = pendingDeliveries.map(d => `${d.lat},${d.lng}`);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${origin.lat},${origin.lng}&waypoints=optimize:true|${waypoints.join('|')}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Directions API request failed');
    }

    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      // Get the optimized waypoint order
      const waypointOrder = data.routes[0].waypoint_order;
      
      // Create a new array with the optimized order
      const optimizedPending = waypointOrder.map((index: number) => pendingDeliveries[index]);
      
      // Return all deliveries with pending ones optimized
      return [
        ...optimizedPending,
        ...destinations.filter(d => d.status !== 'pendente')
      ];
    }

    return destinations;
  } catch (error) {
    console.error('Route optimization error:', error);
    return destinations;
  }
};
