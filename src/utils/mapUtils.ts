
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

  // Para garantir que entregas no mesmo endereço recebam as mesmas coordenadas
  const addressCoordinates: Record<string, MapPosition> = {};

  for (const delivery of updatedDeliveries) {
    // Criar uma chave única para o endereço completo
    const addressKey = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}`.toLowerCase();
    
    // Verificar se já temos as coordenadas para este endereço
    if (addressCoordinates[addressKey]) {
      delivery.lat = addressCoordinates[addressKey].lat;
      delivery.lng = addressCoordinates[addressKey].lng;
    } 
    // Senão, fazer a geocodificação e armazenar
    else if (!delivery.lat || !delivery.lng) {
      const fullAddress = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}, Brasil`;
      const location = await geocodeAddress(fullAddress);

      if (location) {
        // Adicionar um pequeno deslocamento aleatório para entregas no mesmo endereço
        // mas ainda manter a posição geográfica correta
        delivery.lat = location.lat;
        delivery.lng = location.lng;
        
        // Salvar as coordenadas para uso em outras entregas no mesmo endereço
        addressCoordinates[addressKey] = {
          lat: location.lat,
          lng: location.lng
        };
      }
      
      // Esperar um pouco para não sobrecarregar a API do Mapbox
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
    // Tentamos usar a Directions API do Mapbox para otimização
    // mas para rotas complexas, precisamos de uma abordagem mais simples
    
    // Agrupamos entregas por endereço
    const addressGroups: { [key: string]: DeliveryItem[] } = {};
    
    pendingDeliveries.forEach(delivery => {
      if (!delivery.lat || !delivery.lng) return;
      
      const addressKey = `${delivery.endereco}, ${delivery.cidade}`.toLowerCase();
      if (!addressGroups[addressKey]) {
        addressGroups[addressKey] = [];
      }
      addressGroups[addressKey].push(delivery);
    });
    
    // Coletamos endereços únicos (apenas um item por endereço)
    const uniqueAddresses = Object.values(addressGroups).map(group => group[0]);
    
    // Ordenamos por distância da origem usando o algoritmo do vizinho mais próximo
    const sortedAddresses: DeliveryItem[] = [];
    let remainingAddresses = [...uniqueAddresses];
    let currentPoint = origin;
    
    while (remainingAddresses.length > 0) {
      // Encontra o ponto mais próximo do ponto atual
      let closestIdx = 0;
      let minDistance = Number.MAX_VALUE;
      
      remainingAddresses.forEach((address, idx) => {
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
      
      // Adiciona o ponto mais próximo à rota
      const closestAddress = remainingAddresses[closestIdx];
      sortedAddresses.push(closestAddress);
      
      // Atualiza o ponto atual
      currentPoint = {
        lat: closestAddress.lat!,
        lng: closestAddress.lng!
      };
      
      // Remove o ponto da lista de pontos restantes
      remainingAddresses.splice(closestIdx, 1);
    }
    
    // Agora expandimos a lista de endereços únicos de volta para todas as entregas
    const optimizedDeliveries: DeliveryItem[] = [];
    
    // Primeiro, adicionamos todas as entregas pendentes na ordem otimizada
    sortedAddresses.forEach(uniqueAddress => {
      const addressKey = `${uniqueAddress.endereco}, ${uniqueAddress.cidade}`.toLowerCase();
      const group = addressGroups[addressKey] || [];
      
      // Adicionamos todas as entregas deste endereço
      optimizedDeliveries.push(...group);
    });
    
    // Adicionamos outras entregas que não estão pendentes
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
