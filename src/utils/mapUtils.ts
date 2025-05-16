
import { DeliveryItem } from './deliveryUtils';
import mapboxgl from 'mapbox-gl';

export interface MapPosition {
  lat: number;
  lng: number;
  addressKey?: string; // Chave única para o endereço (usado para cache)
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

// Helper function to calculate distance between two points
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance in meters
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

// Geocodificar endereço para obter coordenadas precisas
export const geocodeAddress = async (address: string, retryCount = 0): Promise<MapPosition | null> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 segundo
  
  try {
    const query = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&country=br&limit=1`;
    
    // Adicionar um timeout para a requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API de geocodificação: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      const relevance = data.features[0].relevance || 0;
      
      // Verificar se a relevância do resultado é alta o suficiente
      if (relevance < 0.5) {
        console.warn(`Baixa relevância (${relevance}) para o endereço: ${address}`);
      }
      
      // Criar a chave de endereço para cache
      const addressKey = address.toLowerCase().trim();
      
      return { lat, lng, addressKey };
    }
    
    // Se não encontrou resultados, tentar novamente com um endereço mais simples
    if (retryCount === 0) {
      // Simplificar o endereço removendo números e complementos
      const simplifiedAddress = address
        .replace(/\d+/g, '') // Remover números
        .replace(/,\s*(?:apto|apt|ap|casa|lote|lt|quadra|qd|bloco|bl|sala|sl|conjunto|cj|andar|and)[^,]*/gi, '') // Remover complementos
        .replace(/\s{2,}/g, ' ') // Remover espaços duplicados
        .trim();
      
      if (simplifiedAddress !== address) {
        console.log(`Tentando geocodificar com endereço simplificado: ${simplifiedAddress}`);
        return geocodeAddress(simplifiedAddress, retryCount + 1);
      }
    }
    
    // Se não encontrou resultados e já tentou com endereço simplificado, tentar novamente após um delay
    if (retryCount < MAX_RETRIES) {
      console.log(`Tentativa ${retryCount + 1} falhou, tentando novamente em ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return geocodeAddress(address, retryCount + 1);
    }
    
    console.error(`Não foi possível geocodificar o endereço após ${MAX_RETRIES} tentativas: ${address}`);
    return null;
  } catch (error) {
    // Se for um erro de timeout ou de rede, tentar novamente
    if (
      error instanceof Error && 
      (error.name === 'AbortError' || error.message.includes('network') || error.message.includes('timeout'))
    ) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Erro de rede/timeout, tentando novamente em ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return geocodeAddress(address, retryCount + 1);
      }
    }
    
    console.error('Erro ao geocodificar endereço:', error);
    return null;
  }
};

// Novas funções para melhor visualização de marcadores fixos no mapa
export const getMarkerCssClassByStatus = (status: string): string => {
  switch (status) {
    case 'entregue':
      return 'status-entregue';
    case 'ocorrencia':
      return 'status-ocorrencia';
    case 'pendente':
    default:
      return 'status-pendente';
  }
};

export const createFixedMarker = (number: number, lat: number, lng: number, status: string, isMultiple: boolean, isSelected: boolean): mapboxgl.Marker => {
  // Criar o elemento do marcador
  const markerEl = document.createElement('div');
  markerEl.className = `square-marker ${getMarkerCssClassByStatus(status)}`;
  
  // Adicionar número
  markerEl.innerText = number.toString();
  
  // Adicionar classe para múltiplas entregas
  if (isMultiple) {
    markerEl.classList.add('multiple-deliveries');
  }
  
  // Destacar se selecionado
  if (isSelected) {
    markerEl.classList.add('marker-selected');
  }
  
  // Criar o elemento principal para o Mapbox
  const el = document.createElement('div');
  el.className = 'mapboxgl-marker mapboxgl-marker-anchor-center';
  el.style.position = 'absolute';
  el.style.pointerEvents = 'auto';
  el.appendChild(markerEl);
  
  // Criar e retornar o marcador
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center',
    offset: [0, 0],
    pitchAlignment: 'viewport',
    rotationAlignment: 'viewport',
    draggable: false
  }).setLngLat([lng, lat]);
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
