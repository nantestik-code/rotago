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
      console.warn('Geolocalização não é suportada pelo seu navegador');
      // Usar posição padrão como fallback
      resolve(defaultMapCenter);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('Timeout ao obter localização, usando posição padrão');
      resolve(defaultMapCenter);
    }, 5000); // Reduzido para 5 segundos

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.warn(`Erro ao obter posição atual (${error.code}): ${error.message}`);
        
        // Usar posição padrão como fallback em caso de erro
        resolve(defaultMapCenter);
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000, // Reduzido para 5 segundos
        maximumAge: 60000 // Aceita posições de até 1 minuto atrás
      }
    );
  });
};

export const watchPosition = (
  onPositionChange: (position: MapPosition) => void,
  onError?: (error: GeolocationPositionError) => void
) => {
  if (!navigator.geolocation) {
    console.warn('Geolocalização não suportada pelo navegador');
    // Notificar com a posição padrão
    onPositionChange(defaultMapCenter);
    if (onError) onError({ code: 0, message: 'Geolocalização não suportada', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    return null;
  }

  // Obter posição imediatamente para não ter que esperar pelo primeiro evento de watch
  navigator.geolocation.getCurrentPosition(
    (position) => {
      onPositionChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      console.warn(`Erro ao obter posição inicial (${error.code}): ${error.message}`);
      // Usar posição padrão como fallback
      onPositionChange(defaultMapCenter);
    },
    { 
      enableHighAccuracy: true,
      timeout: 5000, // Reduzido para 5 segundos
      maximumAge: 60000 // Aceita posições de até 1 minuto atrás
    }
  );

  // Configurar o monitoramento contínuo com maior precisão
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPositionChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      console.warn(`Erro ao monitorar posição (${error.code}): ${error.message}`);
      // Não notificar com posição padrão aqui para evitar loops
      if (onError) onError(error);
    },
    { 
      enableHighAccuracy: true,
      timeout: 10000, // Reduzido para 10 segundos
      maximumAge: 60000 // Aceita posições de até 1 minuto atrás
    }
  );

  return watchId;
};

export const stopWatchingPosition = (watchId: number | null) => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
};

// Cache de geocodificação em memória para evitar chamadas repetidas
const geocodeMemoryCache: Record<string, MapPosition> = {};

// Geocodificar endereço para obter coordenadas precisas
export const geocodeAddress = async (address: string, retryCount = 0): Promise<MapPosition | null> => {
  // Verificar cache em memória primeiro (mais rápido que localStorage)
  const cacheKey = address.toLowerCase().trim();
  if (geocodeMemoryCache[cacheKey]) {
    return geocodeMemoryCache[cacheKey];
  }

  const MAX_RETRIES = 2; // Reduzido de 3 para 2
  const RETRY_DELAY = 500; // Reduzido de 1000ms para 500ms
  
  try {
    const query = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&country=br&limit=1`;
    
    // Adicionar um timeout para a requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduzido para 3 segundos
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API de geocodificação: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      
      // Criar a chave de endereço para cache
      const addressKey = address.toLowerCase().trim();
      const result = { lat, lng, addressKey };
      
      // Salvar no cache em memória
      geocodeMemoryCache[cacheKey] = result;
      
      return result;
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
        return geocodeAddress(simplifiedAddress, retryCount + 1);
      }
    }
    
    // Se não encontrou resultados e já tentou com endereço simplificado, tentar novamente após um delay
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return geocodeAddress(address, retryCount + 1);
    }
    
    return null;
  } catch (error) {
    // Se for um erro de timeout ou de rede, tentar novamente
    if (
      error instanceof Error && 
      (error.name === 'AbortError' || error.message.includes('network') || error.message.includes('timeout'))
    ) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return geocodeAddress(address, retryCount + 1);
      }
    }
    
    return null;
  }
};

// Funções para estilização de marcadores de entrega
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

// Cores para os marcadores de acordo com o status
export const getMarkerColorByStatus = (status: string): string => {
  switch (status) {
    case 'entregue':
      return '#94a39b'; // Neutro (entregue)
    case 'ocorrencia':
      return '#EF4444'; // Vermelho
    case 'pendente':
    default:
      return '#047857'; // Verde da marca
  }
};

// Função melhorada para criar marcadores visuais modernos
export const createDeliveryMarker = (
  orderNumber: number, 
  lat: number, 
  lng: number, 
  status: string, 
  isMultiple: boolean, 
  isSelected: boolean
): mapboxgl.Marker => {
  // Criar o elemento do marcador
  const markerEl = document.createElement('div');
  markerEl.className = `delivery-marker ${getMarkerCssClassByStatus(status)}`;
  
  // Criar o elemento do conteúdo do marcador (número da ordem)
  const contentEl = document.createElement('div');
  contentEl.className = 'delivery-marker-content';
  contentEl.innerText = orderNumber.toString();
  markerEl.appendChild(contentEl);
  
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

// Função para criar marcador para localização atual com efeito de pulso mais visível
export const createCurrentLocationMarker = (lat: number, lng: number): mapboxgl.Marker => {
  const el = document.createElement('div');
  el.className = 'current-location-marker';
  
  // Adicionar múltiplos círculos de pulso para efeito mais visível
  for (let i = 0; i < 2; i++) {
    const pulseCircle = document.createElement('div');
    pulseCircle.className = 'pulse-circle';
    pulseCircle.style.animationDelay = `${i * 0.5}s`;
    el.appendChild(pulseCircle);
  }
  
  // Adicionar círculo interno maior e mais visível
  const innerCircle = document.createElement('div');
  innerCircle.className = 'inner-circle';
  el.appendChild(innerCircle);
  
  // Adicionar texto "Você está aqui"
  const label = document.createElement('div');
  label.className = 'location-label';
  label.textContent = 'Você está aqui';
  el.appendChild(label);
  
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center'
  }).setLngLat([lng, lat]);
};

// Backward compatibility for old function name
export const createFixedMarker = createDeliveryMarker;

// FUNÇÃO OTIMIZADA: Geocodificação em segundo plano
export const geocodeAddresses = async (
  deliveries: DeliveryItem[],
  onProgress?: (progress: number) => void
): Promise<DeliveryItem[]> => {
  const updatedDeliveries = [...deliveries];
  
  // Carregar cache de geocodificação do localStorage
  let geocodeCache: Record<string, MapPosition> = {};
  try {
    const cachedData = localStorage.getItem('geocode-cache');
    if (cachedData) {
      geocodeCache = JSON.parse(cachedData);
      
      // Aplicar cache imediatamente para entregas
      updatedDeliveries.forEach(delivery => {
        const addressKey = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}`.toLowerCase().trim();
        if (geocodeCache[addressKey]) {
          delivery.lat = geocodeCache[addressKey].lat;
          delivery.lng = geocodeCache[addressKey].lng;
        }
      });
    }
  } catch (error) {
    console.error('Erro ao carregar cache de geocodificação:', error);
  }
  
  // Iniciar geocodificação em segundo plano
  setTimeout(() => {
    backgroundGeocode(updatedDeliveries, onProgress);
  }, 100);
  
  // Retornar as entregas imediatamente para não bloquear a interface
  return updatedDeliveries;
};

// Função que executa a geocodificação em segundo plano
const backgroundGeocode = async (
  deliveries: DeliveryItem[],
  onProgress?: (progress: number) => void
) => {
  // Recuperar cache de geocodificação do localStorage
  let geocodeCache: Record<string, MapPosition> = {};
  try {
    const cachedData = localStorage.getItem('geocode-cache');
    if (cachedData) {
      geocodeCache = JSON.parse(cachedData);
    }
  } catch (error) {
    console.error('Erro ao carregar cache de geocodificação:', error);
  }

  // Identificar endereços únicos que precisam ser geocodificados
  const uniqueAddresses: Record<string, boolean> = {};
  const addressesToGeocode: string[] = [];
  
  deliveries.forEach(delivery => {
    if (!delivery.lat || !delivery.lng) {
      const addressKey = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}`.toLowerCase().trim();
      
      // Se não está no cache e ainda não foi adicionado para geocodificação
      if (!geocodeCache[addressKey] && !uniqueAddresses[addressKey]) {
        uniqueAddresses[addressKey] = true;
        addressesToGeocode.push(addressKey);
      }
    }
  });
  
  // Limite de geocodificações em paralelo
  const BATCH_SIZE = 5;
  const MAX_GEOCODING = 50;
  let geocodingCount = 0;
  
  // Processar em lotes para não sobrecarregar a API
  for (let i = 0; i < addressesToGeocode.length && geocodingCount < MAX_GEOCODING; i += BATCH_SIZE) {
    const batch = addressesToGeocode.slice(i, i + BATCH_SIZE).slice(0, MAX_GEOCODING - geocodingCount);
    geocodingCount += batch.length;
    
    // Geocodificar em paralelo
    const promises = batch.map(async (addressKey) => {
      try {
        // Extrair partes do endereço da chave
        const parts = addressKey.split(',').map(p => p.trim());
        const fullAddress = `${parts[0]}, ${parts.length > 1 ? parts[1] : ''}, ${parts.length > 2 ? parts[2] : ''}, Brasil`;
        
        const location = await geocodeAddress(fullAddress);
        
        if (location) {
          // Salvar no cache
          geocodeCache[addressKey] = {
            lat: location.lat,
            lng: location.lng
          };
          
          // Atualizar entregas com esse endereço
          deliveries.forEach(delivery => {
            const deliveryAddressKey = `${delivery.endereco}, ${delivery.cidade}, ${delivery.estado}, ${delivery.cep}`.toLowerCase().trim();
            if (deliveryAddressKey === addressKey) {
              delivery.lat = location.lat;
              delivery.lng = location.lng;
            }
          });
        }
      } catch (error) {
        console.warn(`Erro ao geocodificar endereço: ${addressKey}`, error);
      }
    });
    
    // Aguardar geocodificação do lote atual
    await Promise.all(promises);
    
    // Salvar cache atualizado no localStorage
    try {
      localStorage.setItem('geocode-cache', JSON.stringify(geocodeCache));
    } catch (error) {
      console.error('Erro ao salvar cache de geocodificação:', error);
    }
    
    // Atualizar progresso
    if (onProgress) {
      onProgress(Math.min(100, (i + batch.length) / Math.min(addressesToGeocode.length, MAX_GEOCODING) * 100));
    }
    
    // Pequena pausa entre lotes para não sobrecarregar
    if (i + BATCH_SIZE < addressesToGeocode.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Salvar entregas atualizadas no localStorage
  try {
    const currentDeliveries = localStorage.getItem('currentRouteDeliveries');
    if (currentDeliveries) {
      const parsedDeliveries = JSON.parse(currentDeliveries);
      // Atualizar coordenadas nas entregas salvas
      deliveries.forEach((delivery, index) => {
        if (delivery.lat && delivery.lng && index < parsedDeliveries.length) {
          parsedDeliveries[index].lat = delivery.lat;
          parsedDeliveries[index].lng = delivery.lng;
        }
      });
      localStorage.setItem('currentRouteDeliveries', JSON.stringify(parsedDeliveries));
    }
  } catch (error) {
    console.error('Erro ao atualizar entregas no localStorage:', error);
  }
  
  // Finalizar progresso
  if (onProgress) {
    onProgress(100);
  }
};

// Obter rota entre dois pontos usando a API de direções do Mapbox
export const getDirectionsRoute = async (
  origin: MapPosition,
  destination: MapPosition
): Promise<any> => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true&geometries=geojson&access_token=${mapboxToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API de direções: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      return data.routes[0];
    }
    
    throw new Error('Nenhuma rota encontrada');
  } catch (error) {
    console.error('Erro ao obter rota:', error);
    throw error;
  }
};

// Abrir navegação externa para um endereço
export const openExternalNavigation = (lat: number, lng: number): void => {
  // Detectar plataforma e abrir app apropriado
  const userAgent = navigator.userAgent || navigator.vendor;
  
  // iOS
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
  } 
  // Android
  else if (/android/i.test(userAgent)) {
    window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
  } 
  // Fallback para Google Maps web
  else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  }
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
    // Group deliveries by exact coordinates AND address
    const coordinateGroups: { [key: string]: DeliveryItem[] } = {};
    
    pendingDeliveries.forEach(delivery => {
      if (!delivery.lat || !delivery.lng || !delivery.endereco) return;
      
      // Usar coordenadas E endereço como chave para garantir que apenas entregas no mesmo local sejam agrupadas
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)},${delivery.endereco}`;
      if (!coordinateGroups[coordKey]) {
        coordinateGroups[coordKey] = [];
      }
      coordinateGroups[coordKey].push(delivery);
    });
    
    // Collect unique coordinate points (only one item per coordinate/address combination)
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
      if (!uniqueAddress.endereco) return;
      
      // Usar a mesma chave composta (coordenadas + endereço) para manter a consistência
      const coordKey = `${uniqueAddress.lat!.toFixed(6)},${uniqueAddress.lng!.toFixed(6)},${uniqueAddress.endereco}`;
      const group = coordinateGroups[coordKey] || [];
      
      // Add all deliveries at this coordinate and address
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
