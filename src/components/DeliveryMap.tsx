import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import MobileDrawerMenu from './MobileDrawerMenu';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { 
  MapPosition, 
  defaultMapCenter, 
  initMapbox, 
  getMapboxToken, 
  setMapboxToken, 
  calculateDistance, 
  createDeliveryMarker,
  createCurrentLocationMarker,
  getDirectionsRoute
} from '@/utils/mapUtils';
import { openExternalNavigation } from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Navigation, MapPin, ChevronLeft, ChevronRight, Check, AlertTriangle, RotateCcw, X, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DeliveryCard from './DeliveryCard';
import AddressSearch from './AddressSearch';

interface DeliveryMapProps {
  deliveries: DeliveryItem[];
  selectedDeliveryId: string | null;
  onSelectDelivery: (id: string) => void;
  currentLocation: MapPosition | null;
  isTrackingActive: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onOptimizeRoute: () => void;
  onStatusChange?: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  isMobileView?: boolean;
}

const getStableMarkerLabelCandidate = (deliveriesAtLocation: DeliveryItem[]): DeliveryItem | undefined => {
  const pendingDeliveries = deliveriesAtLocation.filter(delivery => delivery.status === 'pendente');
  const baseDeliveries = pendingDeliveries.length > 0 ? pendingDeliveries : deliveriesAtLocation;

  return [...baseDeliveries].sort((a, b) => {
    const seqA = Number(a.sequence_number ?? a.orderNumber ?? Number.MAX_SAFE_INTEGER);
    const seqB = Number(b.sequence_number ?? b.orderNumber ?? Number.MAX_SAFE_INTEGER);
    return seqA - seqB;
  })[0];
};

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  deliveries,
  selectedDeliveryId,
  onSelectDelivery,
  currentLocation,
  isTrackingActive,
  onStartTracking,
  onStopTracking,
  onOptimizeRoute,
  onStatusChange,
  isMobileView = false,
}): JSX.Element => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapboxMapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{[key: string]: mapboxgl.Marker}>({});
  const addressMarkersRef = useRef<{[key: string]: {
    marker: mapboxgl.Marker,
    miniMarker: mapboxgl.Marker | null,
    deliveryIds: string[],
    sequences: number[]
  }}>({});
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isMobile = useIsMobile();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxTokenInput, setMapboxTokenInput] = useState(getMapboxToken());
  const [showTokenInput, setShowTokenInput] = useState(!getMapboxToken() || getMapboxToken() === 'pk.eyJ1IjoiZGVtby1hY2NvdW50IiwiYSI6ImNsbTUzNmh1bzBkYmwzY3FwbXpkeGsxcWUifQ.QJC4is2GrXvWYws7OsLb4g');
  const [currentMobileDeliveryIndex, setCurrentMobileDeliveryIndex] = useState(0);
  const [navigationDestination, setNavigationDestination] = useState<{position: MapPosition, address: string} | null>(null);
  const [showGpsSearch, setShowGpsSearch] = useState(false);
  const [customHouseAddress, setCustomHouseAddress] = useState('');
  const disableAutoCentering = true;

  // Filter to pending deliveries for mobile view (stable by sequence_number -> orderNumber)
  const pendingDeliveries = useMemo(() => {
    return deliveries
      .filter(delivery => delivery.status === 'pendente')
      .slice()
      .sort((a, b) => {
        const seqA = Number(a.sequence_number ?? a.orderNumber ?? 999999);
        const seqB = Number(b.sequence_number ?? b.orderNumber ?? 999999);
        return seqA - seqB;
      });
  }, [deliveries]);

  // Group deliveries by exact coordinates for multiple delivery detection
  const addressGroups = useMemo(() => {
    const groups: Record<string, DeliveryItem[]> = {};
    
    deliveries.forEach(delivery => {
      if (!delivery.lat || !delivery.lng) return;
      
      const key = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(delivery);
    });
    
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1)
      .map(([coordinates, items]) => ({
        coordinates,
        count: items.length,
        items
      }));
  }, [deliveries]);

  // Armazena grupos de endereços já notificados
  const notifiedGroupsRef = useRef<Set<string>>(new Set());
  
  // Controle de tempo para notificações
  const lastStatusNotificationRef = useRef<{[key: string]: number}>({});
  
  // Referência para controlar notificações de múltiplas entregas
  const lastMultipleDeliveryNotificationRef = useRef<number>(0);

  // Otimiza a rota e navega para a parada pendente mais próxima
  const handleOptimizeAndNavigate = () => {
    try {
      onOptimizeRoute && onOptimizeRoute();
    } catch {}
    // Encontrar pendente mais próxima da localização atual
    const pendentes = deliveries.filter(d => d.status === 'pendente' && d.lat && d.lng);
    const origin = currentLocation?.lat && currentLocation?.lng
      ? { lat: currentLocation.lat, lng: currentLocation.lng }
      : { lat: defaultMapCenter.lat, lng: defaultMapCenter.lng };
    if (pendentes.length === 0) {
      toast({ title: 'Sem entregas pendentes', description: 'Não há entregas pendentes com coordenadas válidas.' });
      return;
    }
    let nearest = pendentes[0];
    let minDist = Number.MAX_VALUE;
    pendentes.forEach(d => {
      const dist = calculateDistance(origin.lat, origin.lng, d.lat!, d.lng!);
      if (dist < minDist) { minDist = dist; nearest = d; }
    });
    // Selecionar no mapa/lista e abrir navegação
    onSelectDelivery(nearest.id);
    if (nearest.lat && nearest.lng) {
      openExternalNavigation(nearest.lat, nearest.lng);
    }
  };
  
  // Show alerts for multiple deliveries gradually when approaching
  useEffect(() => {
    if (addressGroups.length > 0 && mapLoaded && currentLocation && isTrackingActive) {
      // Limitar notificações a uma a cada 20 segundos para evitar spam
      const now = Date.now();
      if (now - lastMultipleDeliveryNotificationRef.current < 20000) {
        return;
      }
      
      // Ordena os grupos por distância da localização atual
      const sortedGroups = [...addressGroups].sort((a, b) => {
        const [lngA, latA] = a.coordinates.split(',').map(parseFloat);
        const [lngB, latB] = b.coordinates.split(',').map(parseFloat);
        
        const distanceA = calculateDistance(currentLocation.lat, currentLocation.lng, latA, lngA);
        const distanceB = calculateDistance(currentLocation.lat, currentLocation.lng, latB, lngB);
        
        return distanceA - distanceB;
      });
      
      // Notifica apenas o grupo mais próximo que ainda não foi notificado
      // e que esteja a menos de 1000 metros
      const nearbyGroup = sortedGroups.find(group => {
        const [lng, lat] = group.coordinates.split(',').map(parseFloat);
        const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng);
        
        return distance < 1000 && !notifiedGroupsRef.current.has(group.coordinates);
      });
      
      if (nearbyGroup) {
        // Marca como notificado
        notifiedGroupsRef.current.add(nearbyGroup.coordinates);
        lastMultipleDeliveryNotificationRef.current = now;
        
        // Mostra a notificação
        toast({
          title: `${nearbyGroup.count} entregas no mesmo endereço próximo`,
          description: `${nearbyGroup.items[0].endereco} tem múltiplas entregas`,
          duration: 8000,
        });
      }
    }
  }, [addressGroups, mapLoaded, currentLocation, isTrackingActive]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    try {
      initMapbox();
      
      if (!mapboxgl.accessToken || mapboxgl.accessToken === 'pk.eyJ1IjoiZGVtby1hY2NvdW50IiwiYSI6ImNsbTUzNmh1bzBkYmwzY3FwbXpkeGsxcWUifQ.QJC4is2GrXvWYws7OsLb4g') {
        setShowTokenInput(true);
        return;
      }
      
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [defaultMapCenter.lng, defaultMapCenter.lat],
        zoom: 12,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        mapboxMapRef.current = map;
        setMapLoaded(true);
        
        const firstValidDelivery = deliveries.find(d => d.lat && d.lng);
        if (firstValidDelivery && firstValidDelivery.lat && firstValidDelivery.lng) {
          map.flyTo({
            center: [parseFloat(firstValidDelivery.lng.toString()), parseFloat(firstValidDelivery.lat.toString())],
            zoom: 12,
            essential: true
          });
          console.log(`Centralizando mapa em [${firstValidDelivery.lng}, ${firstValidDelivery.lat}]`);
        }
        
        map.on('zoom', () => {
          const currentZoom = map.getZoom();
          const baseZoom = 13;
          // Pill markers: scale height and font only — width is auto (padding-based)
          const zoomFactor = Math.min(Math.max(currentZoom / baseZoom, 0.7), 1.35);
          const newHeight = Math.round(20 * zoomFactor);
          const fontSize = Math.max(Math.round(10 * zoomFactor), 8);

          const markers = document.querySelectorAll<HTMLElement>('.delivery-marker');
          markers.forEach((marker) => {
            marker.style.height = `${newHeight}px`;
            marker.style.minWidth = `${Math.round(26 * zoomFactor)}px`;
            const numberEl = marker.querySelector<HTMLElement>('.marker-number');
            if (numberEl) numberEl.style.fontSize = `${fontSize}px`;
          });
        });
      });
    } catch (error) {
      console.error('Erro ao inicializar o mapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o mapa.',
        variant: 'destructive',
      });
    }
  }, [mapLoaded, deliveries]);

  const handleTokenSubmit = () => {
    setMapboxToken(mapboxTokenInput);
    setShowTokenInput(false);
    window.location.reload();
  };

  // Reference to store address markers is already defined at the top of the component

  const [geocodedCoordinates, setGeocodedCoordinates] = useState<Record<string, MapPosition>>({});
  


  // Create and update delivery markers on the map
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    console.log('Updating map markers with current delivery statuses');
    
    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    Object.values(addressMarkersRef.current).forEach(markerInfo => {
      markerInfo.marker.remove();
      if (markerInfo.miniMarker) markerInfo.miniMarker.remove();
    });
    addressMarkersRef.current = {};
    
    // Identifica se há entrega com statusChanged para trigger de animação
    const hasStatusChanged = deliveries.some(d => d.statusChanged);
    if (hasStatusChanged) {
      console.log('Detectada mudança de status, atualizando marcadores com animação');
    }
    
    // Usar as entregas na ordem original para manter numeração consistente
    const sortedDeliveries = [...deliveries];
    
    // Track markers by coordinates
    const addressMarkers: Record<string, {
      marker: mapboxgl.Marker,
      miniMarker: mapboxgl.Marker | null,
      deliveryIds: string[],
      sequences: number[]
    }> = {};
    
    // SIMPLIFICADO: Agrupar entregas por coordenadas
    const coordinateGroups: Record<string, {
      deliveryIds: string[], 
      sequences: number[],
      statuses: string[],
      deliveries: DeliveryItem[]
    }> = {};
    const stopGroups: Record<string, DeliveryItem[]> = {};
    
    // Agrupar entregas por coordenadas exatas
    sortedDeliveries.forEach((delivery) => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      const stopKey = String(delivery.orderNumber ?? delivery.sequence_number ?? coordKey);
      
      if (!coordinateGroups[coordKey]) {
        coordinateGroups[coordKey] = {
          deliveryIds: [],
          sequences: [],
          statuses: [],
          deliveries: []
        };
      }
      
      coordinateGroups[coordKey].deliveryIds.push(delivery.id);
      coordinateGroups[coordKey].sequences.push(Number(delivery.sequence_number || 0));
      coordinateGroups[coordKey].deliveries.push(delivery);
      coordinateGroups[coordKey].statuses.push(delivery.status);

      if (!stopGroups[stopKey]) {
        stopGroups[stopKey] = [];
      }
      stopGroups[stopKey].push(delivery);
    });
    
    // Second pass - create markers for each coordinate group
    sortedDeliveries.forEach((delivery) => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      const group = coordinateGroups[coordKey];
      
      // Skip if we already created a marker for this coordinate
      if (addressMarkers[coordKey]) return;
      const stopKey = String(delivery.orderNumber ?? delivery.sequence_number ?? coordKey);
      const stopDeliveries = stopGroups[stopKey] ?? group.deliveries;
      const stopStatuses = stopDeliveries.map(item => item.status);
      const isMultiple = stopDeliveries.length > 1;
      const isSelected = group.deliveries.some(d => d.id === selectedDeliveryId);
      
      // Determine the marker status (prioritize occurrence > pending > delivered)
      let markerStatus = 'entregue';
      if (stopStatuses.includes('ocorrencia')) {
        markerStatus = 'ocorrencia';
      } else if (stopStatuses.includes('pendente')) {
        markerStatus = 'pendente';
      }
      
      // SIMPLIFICADO: Selecionar qual entrega usar para o label do marcador
      const labelCandidate = getStableMarkerLabelCandidate(stopDeliveries);
      if (!labelCandidate) return;

      // sequence_number = número do pacote
      // orderNumber = número da parada
      const stopNum = Number(labelCandidate.orderNumber || labelCandidate.sequence_number || 0);
      
      // Log simplificado
      const marker = createDeliveryMarker(
        stopNum,
        stopNum,
        delivery.lat,
        delivery.lng,
        markerStatus,
        isMultiple,
        isSelected
      );
      
      // Add to map
      marker.addTo(mapboxMapRef.current);
      
      // Store in refs - store for all deliveries at this location
      group.deliveryIds.forEach(id => {
        markersRef.current[id] = marker;
      });
      
      // Create record for this address group
      addressMarkers[coordKey] = {
        marker,
        miniMarker: null,
        deliveryIds: group.deliveryIds,
        sequences: group.sequences
      };
      
      addressMarkersRef.current[coordKey] = addressMarkers[coordKey];
    });
    
    // Add popups and click handlers to markers
    Object.entries(addressMarkers).forEach(([coordKey, markerInfo]) => {
      const { marker, deliveryIds, sequences } = markerInfo;
      const firstDelivery = deliveries.find(d => d.id === deliveryIds[0]);
      if (!firstDelivery) return;
      
      // Usar as entregas da parada para identificar múltiplos pacotes,
      // mesmo quando a geocodificação gerou coordenadas ligeiramente diferentes.
      const groupData = coordinateGroups[coordKey];
      const deliveriesAtLocation = groupData ? groupData.deliveries : [firstDelivery];
      const stopKey = String(firstDelivery.orderNumber ?? firstDelivery.sequence_number ?? coordKey);
      const stopDeliveries = stopGroups[stopKey] ?? deliveriesAtLocation;
      
      let popupInfo = '';
      if (stopDeliveries.length > 1) {
        const stop = stopDeliveries[0]?.orderNumber ?? '?';
        const infos = [...stopDeliveries]
          .sort((a, b) => Number(a.sequence_number ?? 0) - Number(b.sequence_number ?? 0))
          .map(d => {
            const order = d.sequence_number ?? 'N/A';
            return `Pacote #${order}`;
          }).join('<br>');
        popupInfo = `<div class="text-xs mb-2">Parada #${stop}<br>${infos}</div>`;
      } else {
        const d = stopDeliveries[0];
        const stop = d.orderNumber ?? '?';
        const order = d.sequence_number ?? 'N/A';
        popupInfo = `<div class="text-xs mb-2">Parada #${stop}<br>Pacote #${order}</div>`;
      }
      
      const hasOcorrencia = stopDeliveries.some(d => d.status === 'ocorrencia');
      const hasPendente = stopDeliveries.some(d => d.status === 'pendente');
      
      let statusClass = 'marker-delivered';
      if (hasOcorrencia) statusClass = 'marker-occurrence';
      else if (hasPendente) statusClass = 'marker-pending';
      
      // Create popup with delivery info
      const popup = new mapboxgl.Popup({ 
        offset: 25, 
        closeButton: false,
        className: 'delivery-popup'
      })
      .setHTML(`
        <div class="popup-content">
          <h3 class="font-medium">${firstDelivery.endereco}</h3>
          <p class="text-xs">${firstDelivery.cidade}, ${firstDelivery.estado}</p>
          ${popupInfo}
          <div class="flex items-center gap-1 my-1">
            <span class="status-badge ${statusClass}">
              ${hasOcorrencia ? 'OCORRÊNCIA' : hasPendente ? 'PENDENTE' : 'ENTREGUE'}
            </span>
            ${stopDeliveries.length > 1 ? '<span class="status-badge status-multiple">MÚLTIPLAS</span>' : ''}
          </div>
          <button class="nav-button" 
            data-lat="${firstDelivery.lat}" data-lng="${firstDelivery.lng}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Navegar
          </button>
        </div>
      `);
      
      // Add the marker to the popup
      marker.setPopup(popup);
      
      // Add click handler
      marker.getElement().addEventListener('click', () => {
        // Coletar entregas deste ponto
        const groupDeliveries = deliveryIds
          .map(id => deliveries.find(d => d.id === id))
          .filter(d => d) as DeliveryItem[];
        if (groupDeliveries.length === 0) return;

        // Separar por status
        const pendentes = groupDeliveries.filter(d => d.status === 'pendente');
        const entregues = groupDeliveries.filter(d => d.status === 'entregue');

        // Critério: se houver pendente neste ponto, selecionar a menor ORDEM (sequence_number) entre pendentes
        // Caso contrário (somente entregues), selecionar a menor ORDEM entre entregues
        const candidates = pendentes.length > 0 ? pendentes : entregues.length > 0 ? entregues : groupDeliveries;
        candidates.sort((a, b) => {
          // Ordenar por sequence_number (Ordem), não por orderNumber (Parada)
          const seqA = Number(a.sequence_number || a.orderNumber || 0);
          const seqB = Number(b.sequence_number || b.orderNumber || 0);
          return seqA - seqB;
        });

        onSelectDelivery(candidates[0].id);
      });
    });
  }, [deliveries, selectedDeliveryId, mapLoaded, onSelectDelivery, geocodedCoordinates]);

  // Update marker selection when selectedDeliveryId changes
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    // Remove selection from all markers
    Object.values(addressMarkersRef.current).forEach(markerInfo => {
      const markerEl = markerInfo.marker.getElement().querySelector('.delivery-marker');
      if (markerEl) {
        markerEl.classList.remove('marker-selected');
      }
    });
    
    // Add selection to the marker containing the selected delivery
    if (selectedDeliveryId) {
      const selectedDelivery = deliveries.find(d => d.id === selectedDeliveryId);
      if (selectedDelivery && selectedDelivery.lat && selectedDelivery.lng) {
        const coordKey = `${selectedDelivery.lat.toFixed(6)},${selectedDelivery.lng.toFixed(6)}`;
        const markerInfo = addressMarkersRef.current[coordKey];
        
        if (markerInfo) {
          const markerEl = markerInfo.marker.getElement().querySelector('.delivery-marker');
          if (markerEl) {
            markerEl.classList.add('marker-selected');
          }
        }
      }
    }
  }, [selectedDeliveryId, deliveries, mapLoaded]);
  
  // useEffect separado para processar os cliques nos marcadores após o mapa ser renderizado
  useEffect(() => {
    if (!mapLoaded) return;
    
    // Função para processar os cliques nos botões de navegação
    const handleNavButtonClick = (e: Event) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const lat = target.getAttribute('data-lat');
      const lng = target.getAttribute('data-lng');
      
      if (lat && lng) {
        openExternalNavigation(parseFloat(lat), parseFloat(lng));
      }
    };
    
    // Adicionar os event listeners com um pequeno delay para garantir que os elementos existam
    const timerId = setTimeout(() => {
      const navButtons = document.querySelectorAll('.nav-button');
      navButtons.forEach(btn => {
        btn.addEventListener('click', handleNavButtonClick);
      });
    }, 100);
    
    // Função de limpeza quando o componente for desmontado ou as dependências mudarem
    return () => {
      clearTimeout(timerId);
      
      // Remover os event listeners
      document.querySelectorAll('.nav-button').forEach(btn => {
        btn.removeEventListener('click', handleNavButtonClick);
      });
    };
  }, [mapLoaded]);
  
  // Draw navigation route
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    try {
      // Setup source for navigation route if it doesn't exist
      if (!mapboxMapRef.current.getSource('navigation-route')) {
        mapboxMapRef.current.addSource('navigation-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });
        
        mapboxMapRef.current.addLayer({
        id: 'navigation-route',
        type: 'line',
        source: 'navigation-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#10b981', // Verde
          'line-width': 6,
          'line-opacity': 0.8,
          'line-dasharray': [0.5, 1.5] // Linha tracejada
        }
      });
    }
    } catch (error) {
      console.error('Erro ao configurar rota de navegação:', error);
      toast({
        title: 'Erro ao configurar rota',
        description: 'Não foi possível configurar a rota de navegação.',
        variant: 'destructive'
      });
    }
  }, [mapLoaded, mapboxMapRef]);
  
  // Função para processar os cliques nos botões de navegação
  useEffect(() => {
    if (!mapLoaded) return;
    
    const handleNavButtonClick = (e: Event) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const lat = target.getAttribute('data-lat');
      const lng = target.getAttribute('data-lng');
      
      if (lat && lng) {
        openExternalNavigation(parseFloat(lat), parseFloat(lng));
      }
    };
    
    // Adicionar os event listeners com um pequeno delay para garantir que os elementos existam
    const timerId = setTimeout(() => {
      const navButtons = document.querySelectorAll('.nav-button');
      navButtons.forEach(btn => {
        btn.addEventListener('click', handleNavButtonClick);
      });
    }, 100);
    
    // Função de limpeza quando o componente for desmontado ou as dependências mudarem
    return () => {
      clearTimeout(timerId);
      
      // Remover os event listeners
      document.querySelectorAll('.nav-button').forEach(btn => {
        btn.removeEventListener('click', handleNavButtonClick);
      });
    };
  }, [mapLoaded]);

  // Referência para controlar notificações de rota calculada
  const lastRouteNotificationRef = useRef<number>(0);
  const lastRouteDestinationRef = useRef<string>('');
  
  // Lidar com a navegação para um endereço pesquisado
  const handleAddressFound = (position: MapPosition, address: string) => {
    setNavigationDestination({ position, address });
    const destinationKey = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    const now = Date.now();
    
    // Se tiver mapa e localização atual, traçar rota
    if (mapboxMapRef.current && currentLocation) {
      drawNavigationRoute(currentLocation, position);
      
      // Centralizar o mapa para mostrar a rota completa
      const bounds = new mapboxgl.LngLatBounds()
        .extend([currentLocation.lng, currentLocation.lat])
        .extend([position.lng, position.lat]);
      
      mapboxMapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
      
      // Notificação removida para reduzir o número de toasts
    } else if (!currentLocation) {
      toast({
        title: 'Localização não disponível',
        description: 'Sua localização atual é necessária para navegação.',
        variant: 'destructive',
      });
    }
  };

  // Navegar para a entrega selecionada
  const handleNavigateToDelivery = () => {
    const selectedDelivery = deliveries.find(d => d.id === selectedDeliveryId);
    
    if (selectedDelivery && selectedDelivery.lat && selectedDelivery.lng && currentLocation) {
      const destination = { lat: selectedDelivery.lat, lng: selectedDelivery.lng };
      
      // Desenhar rota no mapa
      drawNavigationRoute(currentLocation, destination);
      
      // Abrir no Google Maps
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
      window.open(googleMapsUrl, '_blank');
      
      // Notificação removida para reduzir o número de toasts
    } else if (!currentLocation) {
      toast({
        title: 'Localização não disponível',
        description: 'Sua localização atual é necessária para navegação.',
        variant: 'destructive',
      });
    }
  };

  // Desenhar rota de navegação no mapa
  const drawNavigationRoute = async (origin: MapPosition, destination: MapPosition) => {
    if (!mapboxMapRef.current) return;
    
    try {
      // Remover rota anterior se existir
      if (mapboxMapRef.current.getSource('navigation-route')) {
        mapboxMapRef.current.removeLayer('navigation-route');
        mapboxMapRef.current.removeSource('navigation-route');
      }
      
      // Obter rota da API do Mapbox
      const route = await getDirectionsRoute(origin, destination);
      
      // Adicionar rota ao mapa
      if (route && route.geometry) {
        mapboxMapRef.current.addSource('navigation-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });
        
        mapboxMapRef.current.addLayer({
          id: 'navigation-route',
          type: 'line',
          source: 'navigation-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981', // Verde
            'line-width': 6,
            'line-opacity': 0.8,
            'line-dasharray': [0.5, 1.5] // Linha tracejada
          }
        });
      }
    } catch (error) {
      console.error('Erro ao desenhar rota de navegação:', error);
      // Mostrar notificação apenas para erros críticos
      if (error instanceof Error && error.message.includes('network')) {
        toast({
          title: 'Erro de conexão',
          description: 'Verifique sua conexão com a internet.',
          variant: 'destructive',
        });
      }
    }
  };

  // Referência para controlar notificações de localização
  const lastLocationNotificationRef = useRef<number>(0);

  // Atualizar marcador de localização atual
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    if (disableAutoCentering) return;
    
    // Remover marcador de localização atual existente
    if (currentLocationMarkerRef && currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
      currentLocationMarkerRef.current = null;
    }
    
    // Adicionar novo marcador de localização atual
    if (currentLocation?.isGps) {
      const marker = createCurrentLocationMarker(currentLocation.lat, currentLocation.lng);
      marker.addTo(mapboxMapRef.current);
      currentLocationMarkerRef.current = marker;
      
      // Exibir mensagem de localização atual apenas na primeira vez que o rastreamento é ativado
      const now = Date.now();
      if (isTrackingActive && lastLocationNotificationRef.current === 0) {
        lastLocationNotificationRef.current = now;
        toast({
          title: 'Localização ativada',
          description: 'Sua localização atual está sendo rastreada.',
          duration: 3000,
        });
      }
    }
  }, [currentLocation, mapLoaded, isTrackingActive]);

  // Update markers when delivery status or selection changes
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    console.log('Atualizando marcadores do mapa com novos status');
    
    // Find deliveries with changed status
    const changedDeliveries = deliveries.filter(d => d.statusChanged === true);
    
    if (changedDeliveries.length > 0) {
      console.log('Entregas com status alterado:', changedDeliveries.map(d => d.id));
    }
    
    // Update all markers to reflect current status and label numbers
    Object.entries(addressMarkersRef.current).forEach(([coordKey, markerInfo]) => {
      const { deliveryIds, marker, miniMarker } = markerInfo;
      
      // Check if any of the deliveries at this location had their status changed
      const hasStatusChanged = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.statusChanged === true
      );
      
      // Get all deliveries at this location
      const deliveriesAtLocation = deliveryIds
        .map(id => deliveries.find(d => d.id === id))
        .filter(d => d !== undefined) as DeliveryItem[];
      
      // Verificar status de todas as entregas neste endereço
      const hasOcorrencia = deliveriesAtLocation.some(d => d.status === 'ocorrencia');
      const hasPendente = deliveriesAtLocation.some(d => d.status === 'pendente');
      
      // Determinar o status do marcador (prioridade: ocorrência > pendente > entregue)
      const markerStatus = hasOcorrencia ? 'ocorrencia' : (hasPendente ? 'pendente' : 'entregue');
      
      // Log which deliveries are affecting this marker
      if (hasStatusChanged) {
        console.log(`Marcador ${coordKey} afetado por entregas:`, 
          deliveriesAtLocation.map(d => `${d.id} (${d.orderNumber || '?'}) - ${d.status}`).join(', ')
        );
      }
      
      // Atualizar o marcador principal (cores/classe)
      const markerEl = marker.getElement().querySelector('.delivery-marker');
      if (markerEl) {
        // Remover todas as classes de status anteriores
        markerEl.classList.remove('marker-occurrence', 'marker-pending', 'marker-delivered');

        // Adicionar a classe de status atual
        if (hasOcorrencia) {
          markerEl.classList.add('marker-occurrence');
          console.log('Marcador atualizado para ocorrência:', coordKey);
          if (hasStatusChanged) {
            markerEl.classList.remove('animate-marker-flash');
            if (markerEl instanceof HTMLElement) void markerEl.offsetWidth;
            markerEl.classList.add('animate-marker-flash');
            setTimeout(() => {
              if (markerEl) markerEl.classList.remove('animate-marker-flash');
            }, 1500);
          }
        } else if (hasPendente) {
          markerEl.classList.add('marker-pending');
          console.log('Marcador atualizado para pendente:', coordKey);
        } else {
          markerEl.classList.add('marker-delivered');
          console.log('Marcador atualizado para entregue:', coordKey);
        }
      }

      // Recalcular e atualizar os números exibidos (Parada e Ordem)
      const labelCandidate = getStableMarkerLabelCandidate(deliveriesAtLocation);
      if (labelCandidate) {
        // Mostrar o sequence_number como destaque principal
        const displayNumber = Number(labelCandidate.sequence_number || labelCandidate.orderNumber || 0);
        const contentEl = marker.getElement().querySelector('.delivery-marker-content');
        if (contentEl) {
          (contentEl as HTMLElement).innerHTML = `<div class="marker-number">${displayNumber}</div>`;
        }
      }
      
      // Atualizar mini-marcadores (para múltiplas entregas)
      if (miniMarker) {
        const miniMarkerEl = miniMarker.getElement();
        miniMarkerEl.classList.remove('mini-marker-occurrence', 'mini-marker-pending', 'mini-marker-delivered');
        
        if (hasOcorrencia) {
          miniMarkerEl.classList.add('mini-marker-occurrence');
          if (hasStatusChanged && markerStatus === 'ocorrencia') {
            miniMarkerEl.classList.remove('animate-marker-flash');
            if (miniMarkerEl instanceof HTMLElement) {
              void miniMarkerEl.offsetWidth;
            }
            miniMarkerEl.classList.add('animate-marker-flash');
            
            setTimeout(() => {
              if (miniMarkerEl) {
                miniMarkerEl.classList.remove('animate-marker-flash');
              }
            }, 1500);
          }
        } else if (hasPendente) {
          miniMarkerEl.classList.add('mini-marker-pending');
        } else {
          miniMarkerEl.classList.add('mini-marker-delivered');
        }
      }
      
      // Atualizar o popup se estiver aberto
      const popup = marker.getPopup();
      if (popup.isOpen()) {
        popup.remove();
        marker.togglePopup();
      }
    });
  }, [deliveries, selectedDeliveryId, mapLoaded]);

  // Referência para controlar notificações de navegação GPS
  const lastNavigationNotificationRef = useRef<number>(0);
  const lastNavigationDestinationRef = useRef<string>('');
  
  // Open external navigation app
  const openExternalNavigation = (lat: number, lng: number) => {
    const userAgent = navigator.userAgent || navigator.vendor || '';
    const destinationKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const now = Date.now();
    
    // Abrir o aplicativo de navegação apropriado
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } 
    else if (/android/i.test(userAgent)) {
      window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
    } 
    else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
    
    // Mostrar notificação apenas se for um destino diferente ou se passaram mais de 30 segundos
    if (destinationKey !== lastNavigationDestinationRef.current || (now - lastNavigationNotificationRef.current > 30000)) {
      lastNavigationNotificationRef.current = now;
      lastNavigationDestinationRef.current = destinationKey;
      
      toast({
        title: 'Abrindo navegação GPS',
        description: 'Iniciando navegação para o endereço selecionado',
        duration: 3000,
      });
    }
  };

  // Handle mobile delivery navigation
  const handleNextDelivery = () => {
    if (pendingDeliveries.length === 0) return;
    
    const newIndex = (currentMobileDeliveryIndex + 1) % pendingDeliveries.length;
    setCurrentMobileDeliveryIndex(newIndex);
    onSelectDelivery(pendingDeliveries[newIndex].id);
  };

  const handlePrevDelivery = () => {
    if (pendingDeliveries.length === 0) return;
    
    const newIndex = currentMobileDeliveryIndex === 0 
      ? pendingDeliveries.length - 1 
      : currentMobileDeliveryIndex - 1;
    setCurrentMobileDeliveryIndex(newIndex);
    onSelectDelivery(pendingDeliveries[newIndex].id);
  };

  // Update current location marker
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    if (currentLocation) {
      const position: [number, number] = [currentLocation.lng, currentLocation.lat];
      
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setLngLat(position);
      } else {
        // Create a modern, pulsing current location marker
        currentLocationMarkerRef.current = createCurrentLocationMarker(
          currentLocation.lat,
          currentLocation.lng
        ).addTo(mapboxMapRef.current);
      }
    }
  }, [currentLocation, mapLoaded, isTrackingActive]);



  // Update currentMobileDeliveryIndex when the selected delivery changes
  useEffect(() => {
    if (isMobile && selectedDeliveryId && pendingDeliveries.length > 0) {
      const index = pendingDeliveries.findIndex(d => d.id === selectedDeliveryId);
      if (index !== -1) {
        setCurrentMobileDeliveryIndex(index);
      }
    }
  }, [selectedDeliveryId, pendingDeliveries, isMobile]);
  
  // Handle status change in mobile view
  const handleMobileStatusChange = (status: 'pendente' | 'entregue' | 'ocorrencia') => {
    if (pendingDeliveries.length === 0 || currentMobileDeliveryIndex >= pendingDeliveries.length) return;
    
    const delivery = pendingDeliveries[currentMobileDeliveryIndex];
    
    // Check if there are multiple deliveries at this location
    if (delivery.lat && delivery.lng) {
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      const group = addressMarkersRef.current[coordKey];
      
      if (group && group.deliveryIds.length > 1) {
        // For multiple deliveries, we need to check if we should notify
        const now = Date.now();
        const lastNotified = lastStatusNotificationRef.current[coordKey] || 0;
        
        if (now - lastNotified > 20000) {
          toast({
            title: 'Atualizando múltiplas entregas',
            description: `Atualizando status da entrega ${delivery.orderNumber || ''}`,
            duration: 3000,
          });
          lastStatusNotificationRef.current[coordKey] = now;
        }
      }
    }
    
    // Update the status
    onStatusChange?.(delivery.id, status);
    
    // Move to next pending delivery if there are more
    if (currentMobileDeliveryIndex < pendingDeliveries.length - 1) {
      setCurrentMobileDeliveryIndex(currentMobileDeliveryIndex + 1);
    }
  };

  const handleStatusChange = (status: 'pendente' | 'entregue' | 'ocorrencia') => {
    if (onStatusChange && selectedDeliveryId) {
      console.log('Changing status for delivery:', selectedDeliveryId, 'to', status);
      onStatusChange(selectedDeliveryId, status);
      
      // Force marker update for immediate visual feedback
      // This ensures the map marker changes color immediately when status changes
      const delivery = deliveries.find(d => d.id === selectedDeliveryId);
      if (delivery && delivery.lat && delivery.lng) {
        const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
        const markerInfo = addressMarkersRef.current[coordKey];
        
        if (markerInfo) {
          // Update marker appearance based on new status
          const markerElement = markerInfo.marker.getElement();
          
          // Remove old status classes
          markerElement.classList.remove('marker-pending', 'marker-delivered', 'marker-occurrence');

          // Add new status class
          const newClass = status === 'entregue' ? 'marker-delivered' : status === 'ocorrencia' ? 'marker-occurrence' : 'marker-pending';
          markerElement.classList.add(newClass);
        }
      }
    }
  };

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full w-full rounded-md"></div>
      
      {/* Barra de pesquisa de endereços para navegação GPS */}
      <div className={`absolute ${isMobileView ? 'top-14 left-2 right-2' : 'top-2 left-2'} z-20`}>
        {showGpsSearch ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Navegação GPS</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => setShowGpsSearch(false)}
              >
                <X size={14} />
              </Button>
            </div>
            <AddressSearch 
              onAddressFound={handleAddressFound}
              currentLocation={currentLocation}
              isMobile={isMobileView}
            />
            
            {navigationDestination && (
              <div className="mt-2 text-xs bg-green-50 p-2 rounded-md">
                <p className="font-medium">Destino:</p>
                <p className="truncate">{navigationDestination.address}</p>
                <div className="flex justify-end mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-green-100"
                    onClick={() => openExternalNavigation(
                      navigationDestination.position.lat,
                      navigationDestination.position.lng
                    )}
                  >
                    <Navigation size={12} className="mr-1" />
                    Abrir no GPS
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="shadow-md bg-green-600 hover:bg-green-700"
              onClick={() => setShowGpsSearch(true)}
            >
              <Navigation size={16} className="mr-1" />
              GPS
            </Button>
            <Button
              size="sm"
              variant="default"
              className="shadow-md bg-blue-600 hover:bg-blue-700"
              onClick={handleOptimizeAndNavigate}
              title="Otimizar rota por proximidade"
            >
              <Zap size={16} className="mr-1" />
              Otimizar
            </Button>
          </div>
        )}
      </div>
      
      {/* Modal de token do Mapbox como overlay não intrusivo */}
      {showTokenInput && (
        <div className="absolute top-2 right-2 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Token do Mapbox necessário</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setShowTokenInput(false)}
            >
              <X size={14} />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Para usar o mapa, é necessário um token de acesso válido do Mapbox.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Insira seu token do Mapbox"
              value={mapboxTokenInput}
              onChange={(e) => setMapboxTokenInput(e.target.value)}
              className="flex-1 h-8 text-xs"
            />
            <Button 
              onClick={handleTokenSubmit} 
              size="sm"
              className="h-8 text-xs"
            >
              Salvar
            </Button>
          </div>
        </div>
      )}
      
      <style>
        {`
        /* ========================================
           MARCADORES COMPACTOS — LIMPOS E LEGÍVEIS
           ======================================== */

        /* Base: pill/retângulo pequeno e compacto */
        .delivery-marker {
          min-width: 26px;
          height: 20px;
          padding: 0 5px;
          background: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.85);
          border-radius: 5px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .delivery-marker:hover {
          transform: scale(1.12);
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        }

        /* PENDENTE — azul */
        .delivery-marker.marker-pending {
          background: #2563eb;
        }

        /* ENTREGUE — verde */
        .delivery-marker.marker-delivered {
          background: #86efac;
          color: #14532d;
          opacity: 0.55;
          border-color: rgba(255,255,255,0.5);
        }

        /* OCORRÊNCIA — vermelho */
        .delivery-marker.marker-occurrence {
          background: #dc2626;
        }

        /* Conteúdo do marcador */
        .delivery-marker-content {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .delivery-marker-content .marker-number {
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.3px;
          color: white;
          text-shadow: 0 1px 1px rgba(0,0,0,0.25);
        }

        .delivery-marker.marker-delivered .marker-number {
          color: #14532d;
          text-shadow: none;
        }

        /* MÚLTIPLAS ENTREGAS — borda laranja + ponto de badge */
        .multiple-deliveries {
          border: 2px solid #f97316 !important;
          box-shadow: 0 0 0 1.5px rgba(249,115,22,0.35), 0 1px 4px rgba(0,0,0,0.2);
        }

        .multiple-deliveries::after {
          content: '';
          position: absolute;
          top: -5px;
          right: -5px;
          width: 9px;
          height: 9px;
          background: #f97316;
          border-radius: 50%;
          border: 1.5px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        /* SELECIONADO — anel branco nítido */
        .marker-selected {
          transform: scale(1.3);
          box-shadow:
            0 0 0 2.5px white,
            0 0 0 4.5px rgba(59,130,246,0.6),
            0 4px 12px rgba(0,0,0,0.25);
          z-index: 100;
        }

        .marker-selected.marker-delivered {
          box-shadow:
            0 0 0 2.5px white,
            0 0 0 4.5px rgba(22,163,74,0.6),
            0 4px 12px rgba(0,0,0,0.25);
        }

        .marker-selected.marker-occurrence {
          box-shadow:
            0 0 0 2.5px white,
            0 0 0 4.5px rgba(220,38,38,0.6),
            0 4px 12px rgba(0,0,0,0.25);
        }
        
        /* ========================================
           MARCADOR DE LOCALIZAÇÃO ATUAL
           ======================================== */
        
        .current-location-marker {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          z-index: 10;
        }
        
        /* Círculo de pulso - Animação suave */
        .pulse-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: rgba(59, 130, 246, 0.4);
          border-radius: 50%;
          opacity: 0;
          animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          z-index: 5;
        }
        
        /* Círculo interno - Design premium */
        .inner-circle {
          width: 20px;
          height: 20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 
            0 0 0 3px rgba(59, 130, 246, 0.3),
            0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 15;
        }
        
        /* Label "Você está aqui" - Estilo moderno */
        .location-label {
          position: absolute;
          top: -36px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          color: white;
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
          font-weight: 600;
          pointer-events: none;
          z-index: 20;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          70% {
            transform: scale(2.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        
        /* Animação de flash para marcadores */
        .animate-marker-flash {
          animation: marker-flash 1s ease-out;
        }
        
        @keyframes marker-flash {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7), 0 3px 10px rgba(0, 0, 0, 0.25);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(255, 255, 255, 0), 0 3px 10px rgba(0, 0, 0, 0.25);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0), 0 3px 10px rgba(0, 0, 0, 0.25);
          }
        }
        
        /* Mini marcadores para locais com múltiplas entregas */
        .mini-marker-pending, 
        .mini-marker-delivered, 
        .mini-marker-occurrence {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          border: 1px solid white;
          transform: rotate(45deg);
        }
        
        .mini-marker-pending {
          background-color: #3b82f6;
        }
        
        .mini-marker-delivered {
          background-color: #10B981;
        }
        
        .mini-marker-occurrence {
          background-color: #ef4444;
        }
        
        /* Estilização do popup de entrega */
        .delivery-popup {
          max-width: 250px;
        }
        
        .mapboxgl-popup-content {
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.15);
        }
        
        .popup-content {
          padding: 0;
        }
        
        /* Badges de status */
        .status-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          color: white;
        }
        
        .status-badge.status-pendente {
          background-color: #2563EB;
        }
        
        .status-badge.status-entregue {
          background-color: #10B981;
        }
        
        .status-badge.status-ocorrencia {
          background-color: #EA384D;
        }
        
        .status-badge.status-multiple {
          background-color: #F97316;
        }
        
        /* Estilos para diferentes status */
        .status-entregue {
          background-color: #10B981; /* Verde para entregue */
        }
        
        .status-pendente {
          background-color: #3b82f6; /* Azul para pendente */
        }
        
        .status-ocorrencia {
          background-color: #EF4444; /* Vermelho para ocorrência */
        }
        
        /* Botão de navegação */
        .nav-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 8px;
          padding: 6px 12px;
          width: 100%;
          background-color: #0FA0CE;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          border: none;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }
        
        .nav-button:hover {
          background-color: #0A8CAF;
        }
        
        /* Mobile delivery card container */
        .mobile-delivery-card {
          position: absolute;
          bottom: 20px;
          left: 10px;
          right: 10px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.18);
          transition: all 0.3s ease;
          z-index: 50;
        }
        
        .swipe-controls {
          display: flex;
          justify-content: space-between;
          padding: 0 8px;
        }
        
        .swipe-button {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background-color: #f3f4f6;
          color: #4b5563;
          border: none;
        }
        
        .delivery-counter {
          font-size: 12px;
          color: #6b7280;
          text-align: center;
          padding: 8px 0;
        }
        
        /* Adição para mapa escuro ou claro, se aplicável */
        @media (prefers-color-scheme: dark) {
          .delivery-marker {
            border-color: rgba(30, 30, 30, 0.9);
          }
          
          .inner-circle {
            border-color: rgba(30, 30, 30, 0.9);
          }
          
          .mobile-delivery-card {
            background-color: rgba(30, 30, 30, 0.9);
            color: white;
          }
          
          .mapboxgl-popup-content {
            background-color: rgba(30, 30, 30, 0.9);
            color: white;
          }
        }
        `}
      </style>
      
      {/* Botões de controle removidos - rastreamento agora é automático */}
      
      {/* Controles removidos - rastreamento agora é automático */}
      
      
      {/* Legenda do mapa - apenas no desktop */}
      {!isMobileView && (
        <div className="absolute bottom-8 left-3 z-10 rounded-lg bg-white/95 p-2.5 text-sm shadow-md backdrop-blur-sm">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-[#3b82f6] border border-white rounded-full"></div>
              <span className="text-xs">Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-[#EF4444] border border-white rounded-full"></div>
              <span className="text-xs">Ocorrência</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 border-2 border-[#F97316] bg-white/80 rounded-full"></div>
              <span className="text-xs">Múltiplas Entregas</span>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default DeliveryMap;
