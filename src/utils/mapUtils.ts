
import { DeliveryItem } from './deliveryUtils';
import mapboxgl from 'mapbox-gl';

export interface MapPosition {
  lat: number;
  lng: number;
  addressKey?: string;
  isGps?: boolean;
  approximate?: boolean;
}

// Campo Grande, MS
export const defaultMapCenter = {
  lat: -20.4697,
  lng: -54.6201,
}; 

let mapboxToken =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPBOX_TOKEN) ||
  'pk.eyJ1Ijoidml0b3JuYW50ZXMiLCJhIjoiY21hbGZuYjB2MDh2MjJtcTA2bXNxc3NyayJ9.W5yJUirvUawrinZcF6PHCw';

export const setMapboxToken = (token: string) => {
  mapboxToken = token;
  mapboxgl.accessToken = token;
};

export const getMapboxToken = () => mapboxToken;

export const initMapbox = () => {
  mapboxgl.accessToken = mapboxToken;
  try {
    localStorage.removeItem('geocode-cache');
    localStorage.removeItem('rota-facil-geocode-cache');
  } catch {
    // ignore
  }
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
      reject(new Error('Geolocalizacao nao suportada'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isGps: true,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      }
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

  navigator.geolocation.getCurrentPosition(
    (position) => {
      onPositionChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        isGps: true,
      });
    },
    (error) => {
      if (onError) onError(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 15000,
    }
  );

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPositionChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        isGps: true,
      });
    },
    (error) => {
      if (error.code !== error.PERMISSION_DENIED) {
        console.warn(`Erro ao monitorar posição (${error.code}): ${error.message}`);
      }
      if (onError) onError(error);
    },
    { 
      enableHighAccuracy: true,
      timeout: 15000,
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

  const MAX_RETRIES = 1;
  const RETRY_DELAY = 400;

  try {
    const query = encodeURIComponent(address);
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${query}&access_token=${mapboxToken}&country=br&limit=1&language=pt&autocomplete=false`;
    
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
      const feature = data.features[0];
      const coords = feature.geometry?.coordinates || [
        feature.properties?.coordinates?.longitude,
        feature.properties?.coordinates?.latitude,
      ];
      const lng = Number(coords?.[0]);
      const lat = Number(coords?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      // O Mapbox só devolve feature_type 'address' quando achou o número
      const featureType = feature.properties?.feature_type;
      const confidence = feature.properties?.match_code?.confidence;
      const approximate = featureType !== 'address' || confidence === 'low';

      // Criar a chave de endereço para cache
      const addressKey = address.toLowerCase().trim();
      const result: MapPosition = { lat, lng, addressKey, approximate };
      
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
        // Sem número o resultado cai no meio da rua: marca como aproximado
        const approx = await geocodeAddress(simplifiedAddress, retryCount + 1);
        return approx ? { ...approx, approximate: true } : null;
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

// Funções para estilização de marcadores de entrega
export const getMarkerCssClassByStatus = (status: string): string => {
  switch (status) {
    case 'entregue':
      return 'marker-delivered';
    case 'ocorrencia':
      return 'marker-occurrence';
    case 'pendente':
    default:
      return 'marker-pending';
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
  stopNumber: number,
  orderNumber: number,
  lat: number,
  lng: number,
  status: string,
  isMultiple: boolean,
  isSelected: boolean
): mapboxgl.Marker => {
  // Criar o elemento do marcador com design profissional
  const markerEl = document.createElement('div');
  markerEl.className = `delivery-marker ${getMarkerCssClassByStatus(status)}`;
  
  // Criar o elemento do conteúdo do marcador
  const contentEl = document.createElement('div');
  contentEl.className = 'delivery-marker-content';
  
  const displayNumber = stopNumber || orderNumber || 0;
  contentEl.innerHTML = `<div class="marker-number">${displayNumber}</div>`;
  markerEl.appendChild(contentEl);
  
  // Adicionar classe para múltiplas entregas (indicador visual)
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

// Monta a busca com tudo o que a planilha trouxe, pulando campos vazios
export const buildGeocodeQuery = (delivery: DeliveryItem): string =>
  [delivery.endereco, delivery.bairro, delivery.cidade, delivery.estado, delivery.cep, 'Brasil']
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)
    .join(', ');

// Geocodifica todas as entregas sem coordenadas e só retorna quando termina.
// Antes rodava em segundo plano, parava em 50 endereços e as coordenadas se
// perdiam porque a rota era salva antes; agora quem chama recebe tudo pronto.
export const geocodeAddresses = async (
  deliveries: DeliveryItem[],
  onProgress?: (progress: number) => void
): Promise<DeliveryItem[]> => {
  const hasCoords = (d: DeliveryItem) =>
    Number.isFinite(d.lat) && Number.isFinite(d.lng) && !(d.lat === 0 && d.lng === 0);

  const updated = deliveries.map((d) =>
    hasCoords(d) ? { ...d, geocodeStatus: d.geocodeStatus ?? ('exata' as const) } : { ...d }
  );

  const queries = Array.from(
    new Set(updated.filter((d) => !hasCoords(d)).map(buildGeocodeQuery))
  );
  if (queries.length === 0) {
    onProgress?.(100);
    return updated;
  }

  const results: Record<string, MapPosition | null> = {};
  const CONCURRENCY = 5;
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < queries.length) {
      const query = queries[cursor++];
      try {
        results[query] = await geocodeAddress(query);
      } catch {
        results[query] = null;
      }
      done++;
      onProgress?.(Math.round((done / queries.length) * 100));
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queries.length) }, worker));

  // Entregas no mesmo endereço ganham um deslocamento mínimo (~1 m) para os
  // pinos não ficarem exatamente um em cima do outro
  const seen: Record<string, number> = {};
  return updated.map((delivery) => {
    if (hasCoords(delivery)) return delivery;
    const query = buildGeocodeQuery(delivery);
    const location = results[query];
    if (!location) return { ...delivery, geocodeStatus: 'nao_encontrado' as const };
    const n = (seen[query] = (seen[query] ?? -1) + 1);
    return {
      ...delivery,
      lat: location.lat + (n % 5) * 0.00001,
      lng: location.lng + Math.floor(n / 5) * 0.00001,
      geocodeStatus: location.approximate ? ('aproximada' as const) : ('exata' as const),
    };
  });
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
  // IMPORTANTE: Esta função NUNCA altera sequence_number ou orderNumber
  // Apenas reordena o array para sugerir a melhor ordem de visita
  // A numeração original da planilha é SEMPRE preservada
  
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
    // sequence_number (nº do pacote da planilha) é SEMPRE preservado.
    // optimizedOrder define a ordem de visita geográfica.
    const optimizedDeliveries: DeliveryItem[] = [];
    let visitOrder = 1;

    // First, add all pending deliveries in the optimized order
    sortedCoordinates.forEach(uniqueAddress => {
      if (!uniqueAddress.endereco) return;

      const coordKey = `${uniqueAddress.lat!.toFixed(6)},${uniqueAddress.lng!.toFixed(6)},${uniqueAddress.endereco}`;
      const group = coordinateGroups[coordKey] || [];

      group.forEach(delivery => {
        optimizedDeliveries.push({
          ...delivery,
          sequence_number: delivery.sequence_number, // nº do pacote — nunca alterar
          orderNumber: delivery.orderNumber,
          optimizedOrder: visitOrder, // ordem de visita geográfica
        });
        visitOrder++;
      });
    });

    // Add other deliveries that aren't pending (entregues e ocorrências)
    const nonPendingDeliveries = destinations.filter(d => d.status !== 'pendente');
    nonPendingDeliveries.forEach(delivery => {
      optimizedDeliveries.push({
        ...delivery,
        sequence_number: delivery.sequence_number,
        orderNumber: delivery.orderNumber,
      });
    });

    console.log('✅ Rota otimizada por proximidade geográfica - nº pacotes preservados');
    
    return optimizedDeliveries;
  } catch (error) {
    console.error('Erro de otimização de rota:', error);
    return destinations;
  }
};
