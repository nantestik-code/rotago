
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition, defaultMapCenter, initMapbox, getMapboxToken, setMapboxToken } from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Navigation, MapPin } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DeliveryMapProps {
  deliveries: DeliveryItem[];
  selectedDeliveryId: string | null;
  onSelectDelivery: (id: string) => void;
  currentLocation: MapPosition | null;
  isTrackingActive: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onOptimizeRoute: () => void;
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
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapboxMapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{[key: string]: mapboxgl.Marker}>({});
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const miniMapRef = useRef<mapboxgl.Map | null>(null);
  const isMobile = useIsMobile();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxTokenInput, setMapboxTokenInput] = useState(getMapboxToken());
  const [showTokenInput, setShowTokenInput] = useState(!getMapboxToken() || getMapboxToken() === 'pk.eyJ1IjoiZGVtby1hY2NvdW50IiwiYSI6ImNsbTUzNmh1bzBkYmwzY3FwbXpkeGsxcWUifQ.QJC4is2GrXvWYws7OsLb4g');

  // Group deliveries by address to check for duplicates
  const addressGroups = useMemo(() => {
    const groups: Record<string, DeliveryItem[]> = {};
    
    deliveries.forEach(delivery => {
      const key = `${delivery.endereco},${delivery.cidade}`.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(delivery);
    });
    
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1 && items.some(item => item.status === 'pendente'))
      .map(([address, items]) => ({
        address,
        count: items.length,
        items
      }));
  }, [deliveries]);

  // Show alerts for multiple deliveries at the same address
  useEffect(() => {
    if (addressGroups.length > 0 && mapLoaded) {
      addressGroups.forEach(group => {
        toast({
          title: `${group.count} entregas no mesmo endereço`,
          description: `${group.items[0].endereco} tem múltiplas entregas pendentes`,
          duration: 5000,
        });
      });
    }
  }, [addressGroups, mapLoaded]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    try {
      // Initialize Mapbox
      initMapbox();
      
      // Check if we have a valid token
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

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        mapboxMapRef.current = map;
        setMapLoaded(true);
        
        // Add mini map in bottom right corner
        const miniMap = new mapboxgl.Map({
          container: document.createElement('div'),
          style: 'mapbox://styles/mapbox/satellite-v9',
          center: [defaultMapCenter.lng, defaultMapCenter.lat],
          zoom: 10,
          interactive: false,
        });
        
        miniMap.getContainer().className = 'mini-map';
        mapRef.current?.appendChild(miniMap.getContainer());
        miniMapRef.current = miniMap;
        
        // Keep mini map in sync with main map
        map.on('move', () => {
          if (miniMapRef.current) {
            miniMapRef.current.setCenter(map.getCenter());
          }
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
  }, [mapLoaded]);

  // Handle token input update
  const handleTokenSubmit = () => {
    setMapboxToken(mapboxTokenInput);
    setShowTokenInput(false);
    // Reload the page to reinitialize map with new token
    window.location.reload();
  };

  // Calculate marker positions with a grid layout approach
  const calculateMarkerPositions = (deliveries: DeliveryItem[]) => {
    // Group deliveries by location
    const locationGroups: { [key: string]: DeliveryItem[] } = {};
    
    deliveries.forEach(delivery => {
      if (!delivery.lat || !delivery.lng) return;
      
      // Create a key for the location, rounded to 5 decimal places for grouping nearby points
      const locKey = `${delivery.lat.toFixed(5)},${delivery.lng.toFixed(5)}`;
      
      if (!locationGroups[locKey]) {
        locationGroups[locKey] = [];
      }
      locationGroups[locKey].push(delivery);
    });
    
    // For each location group, calculate offset positions
    const result: { [id: string]: { offsetX: number; offsetY: number } } = {};
    
    Object.values(locationGroups).forEach(group => {
      if (group.length <= 1) {
        // No offset needed for single markers
        group.forEach(delivery => {
          result[delivery.id] = { offsetX: 0, offsetY: 0 };
        });
      } else {
        // Calculate grid layout using a circular pattern for better organization
        const count = group.length;
        const radius = Math.min(20 * Math.sqrt(count), 80); // Limit max radius
        
        group.forEach((delivery, index) => {
          if (index === 0) {
            // First delivery stays in center
            result[delivery.id] = { offsetX: 0, offsetY: 0 };
          } else {
            // Place others in a circle around the center
            const angle = (index - 1) * (2 * Math.PI / (count - 1));
            const offsetX = Math.cos(angle) * radius;
            const offsetY = Math.sin(angle) * radius;
            result[delivery.id] = { offsetX, offsetY };
          }
        });
      }
    });
    
    return result;
  };

  // Update markers when deliveries or selected delivery changes
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Calculate marker positions
    const markerPositions = calculateMarkerPositions(deliveries);
    
    // Add markers for all deliveries - sorted for sequential numbering
    const sortedDeliveries = [...deliveries].sort((a, b) => {
      // Pending deliveries first
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
      
      // Then by distance if coordinates available
      if (currentLocation && a.lat && a.lng && b.lat && b.lng) {
        const distA = calculateDistance(currentLocation.lat, currentLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(currentLocation.lat, currentLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
      return 0;
    });
    
    sortedDeliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      // Create marker element
      const markerEl = document.createElement('div');
      
      // Check if this address has multiple deliveries
      const key = `${delivery.endereco},${delivery.cidade}`.toLowerCase();
      const hasMultiple = addressGroups.some(g => g.address === key);
      const multipleItems = addressGroups.find(g => g.address === key)?.items || [];
      const multipleOrderNumbers = multipleItems.map((_, i) => index + i + 1).join(', ');
      
      // Set marker styles based on status and selection
      if (delivery.status === 'pendente') {
        markerEl.className = 'marker-pending';
      } else if (delivery.status === 'entregue') {
        markerEl.className = 'marker-delivered';
      } else {
        markerEl.className = 'marker-occurrence';
      }
      
      if (hasMultiple) {
        markerEl.classList.add('marker-multiple');
      }
      
      if (delivery.id === selectedDeliveryId) {
        markerEl.classList.add('marker-selected');
      }
      
      // Add delivery number inside the marker
      const spanEl = document.createElement('span');
      spanEl.textContent = `${index + 1}`;
      markerEl.appendChild(spanEl);
      
      // Get offset for this marker
      const offset = markerPositions[delivery.id] || { offsetX: 0, offsetY: 0 };
      
      // Create marker with offset
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'center',
        offset: [offset.offsetX, offset.offsetY]
      })
        .setLngLat([delivery.lng, delivery.lat])
        .addTo(mapboxMapRef.current);
      
      // Add popup with delivery info and navigation button
      const popup = new mapboxgl.Popup({ 
        offset: 25, 
        closeButton: false,
        className: 'delivery-popup'
      })
        .setHTML(`
          <div class="popup-content">
            <h3 class="font-medium">${delivery.cliente}</h3>
            <p class="text-sm">${delivery.endereco}</p>
            ${hasMultiple ? `<p class="text-xs font-medium">Ordens: ${multipleOrderNumbers}</p>` : ''}
            <div class="flex items-center gap-1 my-1">
              <span class="status-badge status-${delivery.status}">${delivery.status.toUpperCase()}</span>
              ${hasMultiple ? '<span class="status-badge status-multiple">MÚLTIPLAS</span>' : ''}
            </div>
            <button class="nav-button" 
              data-lat="${delivery.lat}" data-lng="${delivery.lng}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Navegar
            </button>
          </div>
        `);
      
      marker.setPopup(popup);
      
      // Add click listener to marker
      markerEl.addEventListener('click', () => {
        onSelectDelivery(delivery.id);
      });
      
      // Add click listener to navigation button when popup is open
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
      
      markersRef.current[delivery.id] = marker;
      
      // Also add to mini map if it exists
      if (miniMapRef.current) {
        const miniMarkerEl = document.createElement('div');
        miniMarkerEl.className = delivery.status === 'pendente' ? 
          'mini-marker-pending' : 'mini-marker-delivered';
        
        new mapboxgl.Marker({
          element: miniMarkerEl,
          anchor: 'center',
        })
          .setLngLat([delivery.lng, delivery.lat])
          .addTo(miniMapRef.current);
      }
    });
  }, [deliveries, selectedDeliveryId, mapLoaded, onSelectDelivery, addressGroups, currentLocation]);

  // Open external navigation app
  const openExternalNavigation = (lat: number, lng: number) => {
    // Detect platform and open appropriate app
    const userAgent = navigator.userAgent || navigator.vendor;
    
    // iOS
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } 
    // Android
    else if (/android/i.test(userAgent)) {
      window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
    } 
    // Fallback to Google Maps web
    else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
    
    toast({
      title: 'Abrindo navegação GPS',
      description: 'Iniciando navegação para o endereço selecionado',
    });
  };

  // Helper function for calculating distance between points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  // Update current location marker
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    if (currentLocation) {
      const position: [number, number] = [currentLocation.lng, currentLocation.lat];
      
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setLngLat(position);
      } else {
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'location-marker';
        
        currentLocationMarkerRef.current = new mapboxgl.Marker({
          element: markerEl,
          anchor: 'center',
        })
          .setLngLat(position)
          .addTo(mapboxMapRef.current);
      }
      
      // Center map on first location update
      if (isTrackingActive) {
        mapboxMapRef.current.flyTo({ 
          center: position,
          zoom: 15,
          speed: 1.2,
        });
      }
      
      // Update mini map too
      if (miniMapRef.current) {
        miniMapRef.current.setCenter(position);
      }
    }
  }, [currentLocation, mapLoaded, isTrackingActive]);

  // Draw route when we have a selected delivery and current location
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    const drawRoute = async () => {
      const selectedDelivery = deliveries.find(d => d.id === selectedDeliveryId);
      
      // Remove previous route layer and source
      if (mapboxMapRef.current.getLayer('route')) {
        mapboxMapRef.current.removeLayer('route');
      }
      
      if (mapboxMapRef.current.getSource('route')) {
        mapboxMapRef.current.removeSource('route');
      }
      
      // Draw route if we have current location and selected delivery
      if (currentLocation && selectedDelivery && selectedDelivery.lat && selectedDelivery.lng) {
        try {
          // Get directions from Mapbox API
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/` +
            `${currentLocation.lng},${currentLocation.lat};${selectedDelivery.lng},${selectedDelivery.lat}` +
            `?geometries=geojson&access_token=${mapboxgl.accessToken}`
          );
          
          if (!response.ok) throw new Error('Falha ao obter rota');
          
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            // Add route to map
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
        /* Modern marker styles */
        .marker-pending, .marker-delivered, .marker-occurrence {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
          font-weight: 700;
          font-size: 14px;
          color: white;
          position: relative;
          z-index: 1;
          overflow: hidden;
        }
        
        .marker-pending {
          background-color: #2563EB;
          border: 2px solid white;
        }
        
        .marker-delivered {
          background-color: #10B981;
          border: 2px solid white;
        }
        
        .marker-occurrence {
          background-color: #EA384D;
          border: 2px solid white;
        }
        
        .marker-multiple {
          border-color: #F97316;
          border-width: 3px;
        }
        
        .marker-multiple::after {
          content: "";
          position: absolute;
          top: -4px;
          right: -4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #F97316;
          border: 2px solid white;
          z-index: 2;
        }
        
        .marker-selected {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 10;
          border-color: #8B5CF6;
          border-width: 3px;
        }
        
        .mini-marker-pending, .mini-marker-delivered {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid white;
        }
        
        .mini-marker-pending {
          background-color: #2563EB;
        }
        
        .mini-marker-delivered {
          background-color: #10B981;
        }
        
        .location-marker {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(15, 160, 206, 0.2);
          position: relative;
        }
        
        .location-marker::before {
          content: "";
          position: absolute;
          width: 12px;
          height: 12px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgb(15, 160, 206);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 2px rgba(15, 160, 206, 0.4);
          animation: pulse 2s ease-out infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(15, 160, 206, 0.6);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(15, 160, 206, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(15, 160, 206, 0);
          }
        }
        
        .mini-map {
          position: absolute;
          bottom: 80px;
          right: 10px;
          width: 120px;
          height: 120px;
          border-radius: 8px;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        
        /* Popup styling */
        .delivery-popup {
          max-width: 220px;
        }
        
        .popup-content {
          padding: 8px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          color: white;
        }
        
        .status-pendente {
          background-color: #2563EB;
        }
        
        .status-entregue {
          background-color: #10B981;
        }
        
        .status-ocorrencia {
          background-color: #EA384D;
        }
        
        .status-multiple {
          background-color: #F97316;
        }
        
        .nav-button {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          padding: 6px 10px;
          background-color: #0FA0CE;
          color: white;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          border: none;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }
        
        .nav-button:hover {
          background-color: #0A8CAF;
        }
        
        .mapboxgl-popup-content {
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm shadow rounded-lg text-sm p-3">
        <h3 className="font-medium text-xs uppercase mb-1 text-gray-500">Legenda</h3>
        <div className="flex items-center mb-1.5">
          <div className="w-4 h-4 bg-[#2563EB] border-2 border-white mr-2 rounded-full"></div>
          <span className="text-xs">Pendente</span>
        </div>
        <div className="flex items-center mb-1.5">
          <div className="w-4 h-4 bg-[#10B981] border-2 border-white mr-2 rounded-full"></div>
          <span className="text-xs">Entregue</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-orange-500 mr-2 rounded-full relative">
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
          <span className="text-xs">Múltiplas Entregas</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
