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
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=br&limit=1&access_token=${mapboxToken}`
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

  // To ensure deliveries at the same address get exactly the same coordinates
  const addressCoordinates: Record<string, MapPosition> = {};

  for (const delivery of updatedDeliveries) {
    // Create a unique key for the complete address
    const addressKey = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}`.toLowerCase().trim();
    
    // Check if we already have coordinates for this address
    if (addressCoordinates[addressKey]) {
      delivery.lat = addressCoordinates[addressKey].lat;
      delivery.lng = addressCoordinates[addressKey].lng;
    } 
    // Otherwise, geocode it and store
    else if (!delivery.lat || !delivery.lng) {
      const fullAddress = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}, Brasil`;
      const location = await geocodeAddress(fullAddress);

      if (location) {
        delivery.lat = location.lat;
        delivery.lng = location.lng;
        
        // Save the coordinates for use with other deliveries at the same address
        addressCoordinates[addressKey] = {
          lat: location.lat,
          lng: location.lng
        };
      }
      
      // Wait a bit to avoid overloading the Mapbox API
      await new Promise(resolve => setTimeout(resolve, 200));
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
    // Group deliveries by exact coordinates
    const coordinateGroups: { [key: string]: DeliveryItem[] } = {};
    
    pendingDeliveries.forEach(delivery => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      if (!coordinateGroups[coordKey]) {
        coordinateGroups[coordKey] = [];
      }
      coordinateGroups[coordKey].push(delivery);
    });
    
    // Collect unique coordinate points (only one item per coordinate)
    const uniqueCoordinates = Object.values(coordinateGroups).map(group => group[0]);
    
    // Sort by distance from origin using nearest neighbor algorithm
    const sortedCoordinates: DeliveryItem[] = [];
    let remainingCoordinates = [...uniqueCoordinates];
    let currentPoint = origin;
    
    while (remainingCoordinates.length > 0) {
      // Find the closest point to the current point
      let closestIdx = 0;
      let minDistance = Number.MAX_VALUE;
      
      remainingCoordinates.forEach((address, idx) => {
        if (!address.lat || !address.lng) return;
        
        const distance = calculateDistance(
          currentPoint.lat, 
          currentPoint.lng, 
          address.lat, 
          address.lng
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });
      
      // Add the closest point to the route
      const closestAddress = remainingCoordinates[closestIdx];
      sortedCoordinates.push(closestAddress);
      
      // Update the current point
      currentPoint = {
        lat: closestAddress.lat!,
        lng: closestAddress.lng!
      };
      
      // Remove the point from the list of remaining points
      remainingCoordinates.splice(closestIdx, 1);
    }
    
    // Now expand the list of unique coordinates back to all deliveries
    const optimizedDeliveries: DeliveryItem[] = [];
    
    // First, add all pending deliveries in the optimized order
    sortedCoordinates.forEach(uniqueAddress => {
      const coordKey = `${uniqueAddress.lat!.toFixed(6)},${uniqueAddress.lng!.toFixed(6)}`;
      const group = coordinateGroups[coordKey] || [];
      
      // Add all deliveries at this coordinate
      optimizedDeliveries.push(...group);
    });
    
    // Add other deliveries that aren't pending
    const nonPendingDeliveries = destinations.filter(d => d.status !== 'pendente');
    optimizedDeliveries.push(...nonPendingDeliveries);
    
    return optimizedDeliveries;
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
