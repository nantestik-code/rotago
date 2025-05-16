
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { 
  MapPosition, 
  defaultMapCenter, 
  initMapbox, 
  getMapboxToken, 
  setMapboxToken, 
  calculateDistance, 
  createDeliveryMarker,
  createCurrentLocationMarker 
} from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Navigation, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DeliveryCard from './DeliveryCard';

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
}

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
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapboxMapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{[key: string]: mapboxgl.Marker}>({});
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isMobile = useIsMobile();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxTokenInput, setMapboxTokenInput] = useState(getMapboxToken());
  const [showTokenInput, setShowTokenInput] = useState(!getMapboxToken() || getMapboxToken() === 'pk.eyJ1IjoiZGVtby1hY2NvdW50IiwiYSI6ImNsbTUzNmh1bzBkYmwzY3FwbXpkeGsxcWUifQ.QJC4is2GrXvWYws7OsLb4g');
  const [currentMobileDeliveryIndex, setCurrentMobileDeliveryIndex] = useState(0);

  // Filter to pending deliveries for mobile view
  const pendingDeliveries = useMemo(() => {
    return deliveries
      .filter(delivery => delivery.status === 'pendente')
      .sort((a, b) => {
        if (currentLocation && a.lat && a.lng && b.lat && b.lng) {
          const distA = calculateDistance(currentLocation.lat, currentLocation.lng, a.lat, a.lng);
          const distB = calculateDistance(currentLocation.lat, currentLocation.lng, b.lat, b.lng);
          return distA - distB;
        }
        return 0;
      });
  }, [deliveries, currentLocation]);

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

  // Show alerts for multiple deliveries
  useEffect(() => {
    if (addressGroups.length > 0 && mapLoaded) {
      addressGroups.forEach(group => {
        toast({
          title: `${group.count} entregas no mesmo endereço`,
          description: `${group.items[0].endereco} tem múltiplas entregas`,
          duration: 5000,
        });
      });
    }
  }, [addressGroups, mapLoaded]);

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
          console.log(`Zoom alterado para: ${currentZoom}`);
          
          const markers = document.querySelectorAll('.delivery-marker');
          markers.forEach((marker: HTMLElement) => {
            const baseZoom = 12;
            const baseSize = 30;
            const zoomFactor = Math.min(Math.max(currentZoom / baseZoom, 0.7), 1.3);
            const newSize = Math.round(baseSize * zoomFactor);
            marker.style.width = `${newSize}px`;
            marker.style.height = `${newSize}px`;
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

  // Reference to store address markers
  const addressMarkersRef = useRef<Record<string, {
    marker: mapboxgl.Marker,
    miniMarker: mapboxgl.Marker | null,
    deliveryIds: string[],
    orderIndices: number[]
  }>>({});

  const [geocodedCoordinates, setGeocodedCoordinates] = useState<Record<string, MapPosition>>({});
  
  const GEOCODE_CACHE_KEY = 'rota-facil-geocode-cache';
  
  // Load geocoded coordinates from cache
  useEffect(() => {
    try {
      const cachedCoordinates = localStorage.getItem(GEOCODE_CACHE_KEY);
      if (cachedCoordinates) {
        const parsedCache = JSON.parse(cachedCoordinates);
        console.log('Cache de geocodificação carregado:', Object.keys(parsedCache).length, 'endereços');
        setGeocodedCoordinates(parsedCache);
      }
    } catch (error) {
      console.error('Erro ao carregar cache de geocodificação:', error);
    }
  }, []);
  
  // Save geocoded coordinates to cache
  useEffect(() => {
    if (Object.keys(geocodedCoordinates).length > 0) {
      try {
        localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(geocodedCoordinates));
        console.log('Cache de geocodificação salvo:', Object.keys(geocodedCoordinates).length, 'endereços');
      } catch (error) {
        console.error('Erro ao salvar cache de geocodificação:', error);
      }
    }
  }, [geocodedCoordinates]);
  
  // Create and update delivery markers on the map
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    Object.values(addressMarkersRef.current).forEach(markerInfo => {
      markerInfo.marker.remove();
      if (markerInfo.miniMarker) markerInfo.miniMarker.remove();
    });
    addressMarkersRef.current = {};
    
    // Sort deliveries by status and distance
    const sortedDeliveries = [...deliveries].sort((a, b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
      
      if (currentLocation && a.lat && a.lng && b.lat && b.lng) {
        const distA = calculateDistance(currentLocation.lat, currentLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(currentLocation.lat, currentLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
      return 0;
    });
    
    // Track markers by coordinates
    const addressMarkers: Record<string, {
      marker: mapboxgl.Marker,
      miniMarker: mapboxgl.Marker | null,
      deliveryIds: string[],
      orderIndices: number[]
    }> = {};
    
    // Group deliveries by coordinates
    const coordinateGroups: Record<string, {
      deliveryIds: string[], 
      orderIndices: number[], 
      statuses: string[]
    }> = {};
    
    // First pass - group deliveries by coordinates
    sortedDeliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      
      if (!coordinateGroups[coordKey]) {
        coordinateGroups[coordKey] = {
          deliveryIds: [],
          orderIndices: [],
          statuses: []
        };
      }
      
      coordinateGroups[coordKey].deliveryIds.push(delivery.id);
      coordinateGroups[coordKey].orderIndices.push(index + 1);
      coordinateGroups[coordKey].statuses.push(delivery.status);
    });
    
    // Second pass - create markers for each coordinate group
    sortedDeliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      const group = coordinateGroups[coordKey];
      
      // Skip if we already created a marker for this coordinate
      if (addressMarkers[coordKey]) return;
      
      const isMultiple = group.deliveryIds.length > 1;
      const isSelected = delivery.id === selectedDeliveryId;
      
      // Determine the marker status (prioritize occurrence > pending > delivered)
      let markerStatus = 'entregue';
      if (group.statuses.includes('ocorrencia')) {
        markerStatus = 'ocorrencia';
      } else if (group.statuses.includes('pendente')) {
        markerStatus = 'pendente';
      }
      
      // Create the marker
      const marker = createDeliveryMarker(
        index + 1,
        delivery.lat,
        delivery.lng,
        markerStatus,
        isMultiple,
        isSelected
      );
      
      // Add to map
      marker.addTo(mapboxMapRef.current);
      
      // Store in refs
      markersRef.current[delivery.id] = marker;
      
      // Create record for this address group
      addressMarkers[coordKey] = {
        marker,
        miniMarker: null,
        deliveryIds: group.deliveryIds,
        orderIndices: group.orderIndices
      };
      
      addressMarkersRef.current[coordKey] = addressMarkers[coordKey];
    });
    
    // Add popups and click handlers to markers
    Object.entries(addressMarkers).forEach(([coordKey, markerInfo]) => {
      const { marker, deliveryIds, orderIndices } = markerInfo;
      const firstDelivery = deliveries.find(d => d.id === deliveryIds[0]);
      if (!firstDelivery) return;
      
      const ordersText = orderIndices.sort((a, b) => a - b).join(', ');
      
      const hasOcorrencia = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.status === 'ocorrencia'
      );
      const hasPendente = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.status === 'pendente'
      );
      
      let statusClass = 'status-entregue';
      if (hasOcorrencia) statusClass = 'status-ocorrencia';
      else if (hasPendente) statusClass = 'status-pendente';
      
      // Create popup with delivery info
      const popup = new mapboxgl.Popup({ 
        offset: 25, 
        closeButton: false,
        className: 'delivery-popup'
      })
      .setHTML(`
        <div class="popup-content">
          <h3 class="font-medium">${deliveryIds.length > 1 ? 'Ordens ' + ordersText : 'Ordem ' + ordersText}</h3>
          <p class="text-sm">${firstDelivery.endereco}</p>
          <p class="text-xs">${firstDelivery.cidade}, ${firstDelivery.estado}</p>
          <div class="flex items-center gap-1 my-1">
            <span class="status-badge ${statusClass}">
              ${hasOcorrencia ? 'OCORRÊNCIA' : hasPendente ? 'PENDENTE' : 'ENTREGUE'}
            </span>
            ${deliveryIds.length > 1 ? '<span class="status-badge status-multiple">MÚLTIPLAS</span>' : ''}
          </div>
          <button class="nav-button" 
            data-lat="${firstDelivery.lat}" data-lng="${firstDelivery.lng}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Navegar
          </button>
        </div>
      `);
    
      marker.setPopup(popup);
      
      // Add click handler to marker
      marker.getElement().addEventListener('click', () => {
        // If multiple deliveries at this location, select the first pending one
        const deliveryToSelect = deliveryIds.length > 1 
          ? deliveryIds.find(id => deliveries.find(d => d.id === id)?.status === 'pendente') || deliveryIds[0]
          : deliveryIds[0];
        
        onSelectDelivery(deliveryToSelect);
      });
      
      // Add event handler for navigation button in popup
      marker.getPopup().on('open', () => {
        setTimeout(() => {
          const navBtn = document.querySelector('.nav-button');
          if (navBtn) {
            navBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              
              const target = e.currentTarget as HTMLElement;
              const lat = target.getAttribute('data-lat');
              const lng = target.getAttribute('data-lng');
              
              if (lat && lng) {
                openExternalNavigation(parseFloat(lat), parseFloat(lng));
              }
            });
          }
        }, 10);
      });
    });
  }, [deliveries, selectedDeliveryId, mapLoaded, onSelectDelivery, currentLocation, geocodedCoordinates]);

  // Update markers when delivery status changes
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    Object.entries(addressMarkersRef.current).forEach(([coordKey, markerInfo]) => {
      const { deliveryIds, marker, miniMarker } = markerInfo;
      
      const hasOcorrencia = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.status === 'ocorrencia'
      );
      const hasPendente = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.status === 'pendente'
      );
      
      const hasStatusChanged = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.statusChanged === true
      );
      
      const markerStatus = hasOcorrencia ? 'ocorrencia' : (hasPendente ? 'pendente' : 'entregue');
      
      const markerEl = marker.getElement().querySelector('.delivery-marker');
      if (markerEl) {
        markerEl.classList.remove('status-ocorrencia', 'status-pendente', 'status-entregue');
        
        if (hasOcorrencia) {
          markerEl.classList.add('status-ocorrencia');
          if (hasStatusChanged) {
            markerEl.classList.remove('animate-marker-flash');
            // Cast the Element to HTMLElement before accessing offsetWidth
            if (markerEl instanceof HTMLElement) {
              void markerEl.offsetWidth;
            }
            markerEl.classList.add('animate-marker-flash');
            
            setTimeout(() => {
              if (markerEl) {
                markerEl.classList.remove('animate-marker-flash');
              }
            }, 1500);
          }
        } else if (hasPendente) {
          markerEl.classList.add('status-pendente');
        } else {
          markerEl.classList.add('status-entregue');
        }
      }
      
      if (miniMarker) {
        const miniMarkerEl = miniMarker.getElement();
        miniMarkerEl.classList.remove('mini-marker-occurrence', 'mini-marker-pending', 'mini-marker-delivered');
        
        if (hasOcorrencia) {
          miniMarkerEl.classList.add('mini-marker-occurrence');
          if (hasStatusChanged && markerStatus === 'ocorrencia') {
            miniMarkerEl.classList.remove('animate-marker-flash');
            // Cast the Element to HTMLElement before accessing offsetWidth
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
    });
  }, [deliveries, mapLoaded]);

  // Open external navigation app
  const openExternalNavigation = (lat: number, lng: number) => {
    const userAgent = navigator.userAgent || navigator.vendor || '';
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } 
    else if (/android/i.test(userAgent)) {
      window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
    } 
    else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
    
    toast({
      title: 'Abrindo navegação GPS',
      description: 'Iniciando navegação para o endereço selecionado',
    });
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
      
      if (isTrackingActive) {
        mapboxMapRef.current.flyTo({ 
          center: position,
          zoom: 15,
          speed: 1.2,
        });
      }
    }
  }, [currentLocation, mapLoaded, isTrackingActive]);

  // Draw route when we have a selected delivery and current location
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    const drawRoute = async () => {
      const selectedDelivery = deliveries.find(d => d.id === selectedDeliveryId);
      
      if (mapboxMapRef.current.getLayer('route')) {
        mapboxMapRef.current.removeLayer('route');
      }
      
      if (mapboxMapRef.current.getSource('route')) {
        mapboxMapRef.current.removeSource('route');
      }
      
      if (currentLocation && selectedDelivery && selectedDelivery.lat && selectedDelivery.lng) {
        try {
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/` +
            `${currentLocation.lng},${currentLocation.lat};${selectedDelivery.lng},${selectedDelivery.lat}` +
            `?geometries=geojson&access_token=${mapboxgl.accessToken}`
          );
          
          if (!response.ok) throw new Error('Falha ao obter rota');
          
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            mapboxMapRef.current.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
              }
            });
            
            mapboxMapRef.current.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#0FA0CE',
                'line-width': 6,
                'line-opacity': 0.8
              }
            });
          }
        } catch (error) {
          console.error('Erro ao desenhar rota:', error);
        }
      }
    };
    
    drawRoute();
  }, [deliveries, selectedDeliveryId, currentLocation, mapLoaded]);

  // Update currentMobileDeliveryIndex when the selected delivery changes
  useEffect(() => {
    if (isMobile && selectedDeliveryId && pendingDeliveries.length > 0) {
      const index = pendingDeliveries.findIndex(d => d.id === selectedDeliveryId);
      if (index !== -1) {
        setCurrentMobileDeliveryIndex(index);
      }
    }
  }, [selectedDeliveryId, pendingDeliveries, isMobile]);
  
  if (showTokenInput) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">Token do Mapbox necessário</h3>
          <p className="text-sm text-gray-500 mb-4">
            Para usar o mapa, é necessário um token de acesso do Mapbox. 
            Você pode obter um gratuitamente em <a href="https://mapbox.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">mapbox.com</a>
          </p>
        </div>
        <div className="flex w-full max-w-md gap-2">
          <Input
            type="text"
            placeholder="Insira seu token do Mapbox"
            value={mapboxTokenInput}
            onChange={(e) => setMapboxTokenInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleTokenSubmit}>Salvar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full w-full rounded-md"></div>
      
      <style>
        {`
        /* Estilos modernos para marcadores de entrega */
        .delivery-marker {
          width: 30px;
          height: 30px;
          background-color: #3b82f6; /* Azul para pendente */
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          cursor: pointer;
          border: 2px solid white;
          font-weight: 600;
          font-size: 13px;
          /* Formato quadrado com cantos levemente arredondados */
          border-radius: 6px;
          /* Rotação para parecer com pino de mapa */
          transform: rotate(45deg);
          transition: transform 0.2s ease-out;
        }
        
        /* Conteúdo do marcador (número) */
        .delivery-marker-content {
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-weight: 700;
        }
        
        /* Marcador para múltiplas entregas - contorno laranja */
        .multiple-deliveries {
          border: 2.5px solid #F97316 !important; 
          box-shadow: 0 0 0 1px #F97316, 0 2px 6px rgba(0,0,0,0.3);
        }
        
        /* Marcador selecionado */
        .marker-selected {
          transform: rotate(45deg) scale(1.15);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.5);
          z-index: 100;
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
        
        /* Marcador de localização atual */
        .current-location-marker {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          position: relative;
        }
        
        /* Círculo de pulso */
        .pulse-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(15, 160, 206, 0.2);
          position: absolute;
          animation: pulse 2s infinite;
        }
        
        /* Círculo interno */
        .inner-circle {
          width: 12px;
          height: 12px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgb(15, 160, 206);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 2px rgba(15, 160, 206, 0.4);
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          70% {
            transform: scale(2);
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
          bottom: 80px;
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
      
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button onClick={onOptimizeRoute} className="bg-primary flex items-center gap-1">
          <Navigation size={16} />
          Otimizar Rota
        </Button>
        <Button
          onClick={isTrackingActive ? onStopTracking : onStartTracking}
          variant={isTrackingActive ? "destructive" : "default"}
          className="flex items-center gap-1"
        >
          <MapPin size={16} />
          {isTrackingActive ? 'Parar Rastreamento' : 'Iniciar Rastreamento'}
        </Button>
      </div>
      
      {isMobile && pendingDeliveries.length > 0 && (
        <div className="mobile-delivery-card">
          <div className="delivery-counter">
            {currentMobileDeliveryIndex + 1} de {pendingDeliveries.length} pendentes
          </div>
          
          <div className="p-2">
            {pendingDeliveries[currentMobileDeliveryIndex] && (
              <DeliveryCard
                delivery={pendingDeliveries[currentMobileDeliveryIndex]}
                onStatusChange={onStatusChange || (() => {})}
                onSelect={onSelectDelivery}
                isSelected={pendingDeliveries[currentMobileDeliveryIndex].id === selectedDeliveryId}
              />
            )}
          </div>
          
          <div className="swipe-controls pb-2">
            <button 
              className="swipe-button" 
              onClick={handlePrevDelivery}
              disabled={pendingDeliveries.length <= 1}
            >
              <ChevronLeft size={20} />
            </button>
            
            <button 
              className="swipe-button" 
              onClick={handleNextDelivery}
              disabled={pendingDeliveries.length <= 1}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm shadow rounded-lg text-sm p-3">
        <h3 className="font-medium text-xs uppercase mb-1 text-gray-500">Legenda</h3>
        <div className="flex items-center mb-1.5">
          <div className="w-5 h-5 bg-[#3b82f6] border-2 border-white mr-2 rounded-md rotate-45"></div>
          <span className="text-xs">Pendente</span>
        </div>
        <div className="flex items-center mb-1.5">
          <div className="w-5 h-5 bg-[#10B981] border-2 border-white mr-2 rounded-md rotate-45"></div>
          <span className="text-xs">Entregue</span>
        </div>
        <div className="flex items-center mb-1.5">
          <div className="w-5 h-5 bg-[#ef4444] border-2 border-white mr-2 rounded-md rotate-45"></div>
          <span className="text-xs">Ocorrência</span>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 border-2 border-orange-500 mr-2 rounded-md rotate-45 relative">
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
          <span className="text-xs">Múltiplas Entregas</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
