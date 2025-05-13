import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition, defaultMapCenter, initMapbox, getMapboxToken, setMapboxToken, calculateDistance } from '@/utils/mapUtils';
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
  const miniMapRef = useRef<mapboxgl.Map | null>(null);
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
      
      // Use exact coordinates for grouping
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
    
    // Create a map to track which addresses already have markers
    // to avoid multiple markers in the same place
    const addressMarkers: Record<string, {
      marker: mapboxgl.Marker,
      miniMarker: mapboxgl.Marker | null,
      deliveryIds: string[],
      orderIndices: number[]
    }> = {};
    
    // First, gather all coordinates groups
    const coordinateGroups: Record<string, {deliveryIds: string[], orderIndices: number[], statuses: string[]}> = {};
    
    sortedDeliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      // Use exact coordinates with 6 decimal places precision for grouping
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
    
    // Now create markers for each coordinate group
    sortedDeliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      const group = coordinateGroups[coordKey];
      
      // Skip if we already created a marker for this coordinate
      if (addressMarkers[coordKey]) return;
      
      // Create marker element
      const markerEl = document.createElement('div');
      
      // Determine marker color based on status priority (occurrencia > pendente > entregue)
      const hasOcorrencia = group.statuses.includes('ocorrencia');
      const hasPendente = group.statuses.includes('pendente');
      
      if (hasOcorrencia) {
        markerEl.className = 'marker-occurrence';
      } else if (hasPendente) {
        markerEl.className = 'marker-pending';
      } else {
        markerEl.className = 'marker-delivered';
      }
      
      // Add multiple class if this coordinate has multiple deliveries
      if (group.deliveryIds.length > 1) {
        markerEl.classList.add('marker-multiple');
      }
      
      if (delivery.id === selectedDeliveryId) {
        markerEl.classList.add('marker-selected');
      }
      
      // Add delivery number inside the marker
      const spanEl = document.createElement('span');
      spanEl.textContent = `${index + 1}`;
      markerEl.appendChild(spanEl);
      
      // Create marker
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: 'center'
      })
        .setLngLat([delivery.lng, delivery.lat])
        .addTo(mapboxMapRef.current);
        
      markersRef.current[delivery.id] = marker;
      
      // Create marker in mini map
      let miniMarker = null;
      if (miniMapRef.current) {
        const miniMarkerEl = document.createElement('div');
        miniMarkerEl.className = hasOcorrencia ? 'mini-marker-occurrence' : 
                                hasPendente ? 'mini-marker-pending' : 
                                'mini-marker-delivered';
        
        miniMarker = new mapboxgl.Marker({
          element: miniMarkerEl,
          anchor: 'center',
        })
          .setLngLat([delivery.lng, delivery.lat])
          .addTo(miniMapRef.current);
      }
      
      // Add to address markers map
      addressMarkers[coordKey] = {
        marker,
        miniMarker,
        deliveryIds: group.deliveryIds,
        orderIndices: group.orderIndices
      };
    });
    
    // Add popups to each marker
    Object.entries(addressMarkers).forEach(([coordKey, markerInfo]) => {
      const { marker, deliveryIds, orderIndices } = markerInfo;
      const firstDelivery = deliveries.find(d => d.id === deliveryIds[0]);
      if (!firstDelivery) return;
      
      const ordersText = orderIndices.sort((a, b) => a - b).join(', ');
      
      // Determine marker status (if multiple, show the most critical)
      const hasOcorrencia = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.status === 'ocorrencia'
      );
      const hasPendente = deliveryIds.some(id => 
        deliveries.find(d => d.id === id)?.status === 'pendente'
      );
      
      let statusClass = 'status-entregue';
      if (hasOcorrencia) statusClass = 'status-ocorrencia';
      else if (hasPendente) statusClass = 'status-pendente';
      
      // Create popup
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
      
      // Add click listener to marker
      marker.getElement().addEventListener('click', () => {
        // If multiple deliveries at same location, select first pending one
        const deliveryToSelect = deliveryIds.length > 1 
          ? deliveryIds.find(id => deliveries.find(d => d.id === id)?.status === 'pendente') || deliveryIds[0]
          : deliveryIds[0];
        
        onSelectDelivery(deliveryToSelect);
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
        
        .mini-marker-pending, .mini-marker-delivered, .mini-marker-occurrence {
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
        
        .mini-marker-occurrence {
          background-color: #EA384D;
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
        
        /* Mobile delivery card container */
        .mobile-delivery-card {
          position: absolute;
          bottom: 80px;
          left: 10px;
          right: 10px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
          z-index: 50;
        }
        
        .swipe-controls {
          display: flex;
          justify-content: space-between;
          padding: 0 8px;
        }
        
        .swipe-button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background-color: #f3f4f6;
          color: #4b5563;
        }
        
        .delivery-counter {
          font-size: 12px;
          color: #6b7280;
          text-align: center;
          padding: 6px 0;
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
      
      {/* Mobile delivery card with swipe controls */}
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
          <div className="w-4 h-4 bg-[#2563EB] border-2 border-white mr-2 rounded-full"></div>
          <span className="text-xs">Pendente</span>
        </div>
        <div className="flex items-center mb-1.5">
          <div className="w-4 h-4 bg-[#10B981] border-2 border-white mr-2 rounded-full"></div>
          <span className="text-xs">Entregue</span>
        </div>
        <div className="flex items-center mb-1.5">
          <div className="w-4 h-4 bg-[#EA384D] border-2 border-white mr-2 rounded-full"></div>
          <span className="text-xs">Ocorrência</span>
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
