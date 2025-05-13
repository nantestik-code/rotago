
import { DeliveryItem } from './deliveryUtils';
import mapboxgl from 'mapbox-gl';

export interface MapPosition {
  lat: number;
  lng: number;
}

// Campo Grande, MS
export const defaultMapCenter = {
  lat: -20.4697,
  lng: -54.6201,
}; 

// Using the provided Mapbox token
let mapboxToken = 'pk.eyJ1Ijoidml0b3JuYW50ZXMiLCJhIjoiY21hbGZuYjB2MDh2MjJtcTA2bXNxc3NyayJ9.W5yJUirvUawrinZcF6PHCw';

export const setMapboxToken = (token: string) => {
  mapboxToken = token;
  mapboxgl.accessToken = token;
};

export const getMapboxToken = () => mapboxToken;

export const initMapbox = () => {
  mapboxgl.accessToken = mapboxToken;
};

export const getCurrentPosition = (): Promise<MapPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada pelo seu navegador'));
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
        console.error('Erro ao obter posição atual:', error);
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
    if (onError) onError({ code: 0, message: 'Geolocalização não suportada', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
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
      console.error('Erro ao monitorar posição:', error);
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
  address: string
): Promise<MapPosition | null> => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=br&access_token=${mapboxToken}`
    );

    if (!response.ok) {
      throw new Error('Falha na requisição de geocodificação');
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error('Erro de geocodificação:', error);
    return null;
  }
};

export const geocodeAddresses = async (
  deliveries: DeliveryItem[],
  onProgress?: (progress: number) => void
): Promise<DeliveryItem[]> => {
  const updatedDeliveries = [...deliveries];
  let processed = 0;

  for (const delivery of updatedDeliveries) {
    if (!delivery.lat || !delivery.lng) {
      const fullAddress = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}, Brasil`;
      const location = await geocodeAddress(fullAddress);

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
  destinations: DeliveryItem[]
): Promise<DeliveryItem[]> => {
  // Filter only pending deliveries for optimization
  const pendingDeliveries = destinations.filter(d => d.status === 'pendente');
  
  if (pendingDeliveries.length <= 1) {
    return destinations; // No need to optimize for 0 or 1 deliveries
  }

  try {
    // For now we'll use a simple distance-based approach
    // Sort deliveries by distance from current location
    const sortedDeliveries = [...pendingDeliveries].sort((a, b) => {
      if (!a.lat || !a.lng || !b.lat || !b.lng) return 0;
      
      const distA = calculateDistance(origin.lat, origin.lng, a.lat, a.lng);
      const distB = calculateDistance(origin.lat, origin.lng, b.lat, b.lng);
      
      return distA - distB;
    });
    
    // Return all deliveries with pending ones optimized
    return [
      ...sortedDeliveries,
      ...destinations.filter(d => d.status !== 'pendente')
    ];
  } catch (error) {
    console.error('Erro de otimização de rota:', error);
    return destinations;
  }
};

// Helper function to calculate distance between two points
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance in meters
};
