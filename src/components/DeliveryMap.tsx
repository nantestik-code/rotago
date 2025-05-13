
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition, defaultMapCenter, initMapbox, getMapboxToken, setMapboxToken } from '@/utils/mapUtils';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { getStatusColor } from '@/utils/deliveryUtils';
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

  // Update markers when deliveries or selected delivery changes
  useEffect(() => {
    if (!mapLoaded || !mapboxMapRef.current) return;
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    // Add markers for all deliveries
    deliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      // Create marker element
      const markerEl = document.createElement('div');
      
      // Check if this address has multiple deliveries
      const key = `${delivery.endereco},${delivery.cidade}`.toLowerCase();
      const hasMultiple = addressGroups.some(g => g.address === key);
      
      // Set the appropriate marker style based on status
      if (delivery.status === 'pendente') {
        markerEl.className = 'delivery-marker-square-dark';
        if (hasMultiple) {
          markerEl.classList.add('multiple-deliveries');
        }
      } else {
        markerEl.className = 'delivery-marker-square-light';
      }
      
      // Add delivery number inside the marker
      markerEl.innerHTML = `<span>${index + 1}</span>`;
      
      // Add selected styling
      if (delivery.id === selectedDeliveryId) {
        markerEl.classList.add('marker-selected');
      }
      
      // Create marker
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'bottom',
      })
        .setLngLat([delivery.lng, delivery.lat])
        .addTo(mapboxMapRef.current);
      
      // Add popup with delivery info and navigation button
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div>
            <strong>${delivery.cliente}</strong><br>
            ${delivery.endereco}<br>
            <span class="${getStatusColor(delivery.status)} text-white text-xs px-2 py-1 rounded-full">${delivery.status.toUpperCase()}</span>
            ${hasMultiple ? '<br><span class="text-orange-500 font-bold">Múltiplas entregas neste endereço!</span>' : ''}
            <button class="open-navigation-btn mt-2 bg-blue-500 text-white px-2 py-1 rounded text-xs" 
              data-lat="${delivery.lat}" data-lng="${delivery.lng}">
              Navegar com GPS
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
        const navBtn = document.querySelector('.open-navigation-btn');
        if (navBtn) {
          navBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const lat = (e.target as HTMLElement).getAttribute('data-lat');
            const lng = (e.target as HTMLElement).getAttribute('data-lng');
            
            if (lat && lng) {
              openExternalNavigation(parseFloat(lat), parseFloat(lng));
            }
          });
        }
      });
      
      markersRef.current[delivery.id] = marker;
      
      // Also add to mini map if it exists
      if (miniMapRef.current) {
        const miniMarkerEl = document.createElement('div');
        miniMarkerEl.className = delivery.status === 'pendente' ? 
          'mini-marker-square-dark' : 'mini-marker-square-light';
        
        new mapboxgl.Marker({
          element: miniMarkerEl,
          anchor: 'center',
        })
          .setLngLat([delivery.lng, delivery.lat])
          .addTo(miniMapRef.current);
      }
    });
  }, [deliveries, selectedDeliveryId, mapLoaded, onSelectDelivery, addressGroups]);

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
        markerEl.innerHTML = `
          <div class="pulse-ring"></div>
          <div class="center-point"></div>
        `;
        
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
                'line-color': '#3B82F6',
                'line-width': 6,
                'line-opacity': 0.75
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
        .delivery-marker-square-dark, .delivery-marker-square-light {
          cursor: pointer;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
        }
        
        .delivery-marker-square-dark {
          background-color: #221F26;
          color: white;
          border: 2px solid #3B82F6;
        }
        
        .delivery-marker-square-light {
          background-color: #F1F1F1;
          color: #333;
          border: 2px solid #10B981;
        }
        
        .multiple-deliveries {
          border-color: #F97316;
          border-width: 3px;
        }
        
        .marker-selected {
          width: 38px;
          height: 38px;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
          border-width: 3px;
          border-color: #8B5CF6;
          z-index: 2;
        }
        
        .mini-marker-square-dark, .mini-marker-square-light {
          width: 6px;
          height: 6px;
        }
        
        .mini-marker-square-dark {
          background-color: #221F26;
          border: 1px solid #3B82F6;
        }
        
        .mini-marker-square-light {
          background-color: #F1F1F1;
          border: 1px solid #10B981;
        }
        
        .location-marker {
          width: 24px;
          height: 24px;
          position: relative;
        }
        
        .center-point {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #FFC107;
          border: 2px solid #FFA000;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        
        .pulse-ring {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(255, 193, 7, 0.4);
          position: absolute;
          animation: pulse 2s ease-out infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .mini-map {
          position: absolute;
          bottom: 60px;
          right: 10px;
          width: 150px;
          height: 150px;
          border-radius: 4px;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(0,0,0,0.3);
        }
        
        .open-navigation-btn {
          cursor: pointer;
        }
        
        .open-navigation-btn:hover {
          background-color: #2563EB;
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
      <div className="absolute top-4 right-4 bg-white shadow p-2 rounded text-sm">
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-[#221F26] border-2 border-blue-500 mr-2"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-[#F1F1F1] border-2 border-green-500 mr-2"></div>
          <span>Entregue</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#221F26] border-2 border-orange-500 mr-2"></div>
          <span>Múltiplas Entregas</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
