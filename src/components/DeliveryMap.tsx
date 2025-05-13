
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition, defaultMapCenter } from '@/utils/mapUtils';
import { toast } from '@/components/ui/use-toast';

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
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    const loadMap = async () => {
      // Check if the Google Maps API is already loaded
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      try {
        // Add Google Maps script dynamically
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCmRW2hP97SCWoflXWc8V1nrxpgclFEWZs&libraries=places,geometry&callback=initMap`;
        script.async = true;
        script.defer = true;
        
        // Create a global initialization function
        window.initMap = () => {
          initializeMap();
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o mapa.',
          variant: 'destructive',
        });
      }
    };

    loadMap();
    
    return () => {
      // Remove global init function
      if (window.initMap) {
        // @ts-ignore
        window.initMap = undefined;
      }
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current) return;
    
    try {
      const map = new google.maps.Map(mapRef.current, {
        center: defaultMapCenter,
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      googleMapRef.current = map;

      // Initialize directions renderer
      const directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5,
          strokeOpacity: 0.7,
        },
      });
      
      directionsRenderer.setMap(map);
      directionsRendererRef.current = directionsRenderer;
      
      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível inicializar o mapa.',
        variant: 'destructive',
      });
    }
  };

  // Update markers when deliveries or selected delivery changes
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Add markers for all deliveries
    deliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      // Determine marker icon based on status
      let iconUrl;
      switch (delivery.status) {
        case 'entregue':
          iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
          break;
        case 'ocorrencia':
          iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
          break;
        default:
          iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      }
      
      const isSelected = delivery.id === selectedDeliveryId;
      
      // Create marker
      const marker = new google.maps.Marker({
        position: { lat: delivery.lat, lng: delivery.lng },
        map: googleMapRef.current,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(isSelected ? 40 : 30, isSelected ? 40 : 30),
        },
        label: {
          text: (index + 1).toString(),
          color: '#fff',
          fontSize: '12px',
        },
        animation: isSelected ? google.maps.Animation.BOUNCE : null,
        title: delivery.cliente,
      });
      
      // Add click listener
      marker.addListener('click', () => {
        onSelectDelivery(delivery.id);
      });
      
      markersRef.current.push(marker);
    });
  }, [deliveries, selectedDeliveryId, mapLoaded, onSelectDelivery]);

  // Update current location marker
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;
    
    if (currentLocation) {
      const position = {
        lat: currentLocation.lat,
        lng: currentLocation.lng
      };
      
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setPosition(position);
      } else {
        currentLocationMarkerRef.current = new google.maps.Marker({
          position,
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#FFC107',
            fillOpacity: 1,
            strokeColor: '#FFA000',
            strokeWeight: 2,
          },
          title: 'Sua localização',
        });
      }
      
      // Center map on first location update
      if (isTrackingActive) {
        googleMapRef.current.panTo(position);
      }
    }
  }, [currentLocation, mapLoaded, isTrackingActive]);

  // Draw route when we have a selected delivery and current location
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !directionsRendererRef.current) return;
    
    const drawRoute = () => {
      const selectedDelivery = deliveries.find(d => d.id === selectedDeliveryId);
      
      // Clear previous route
      directionsRendererRef.current?.setDirections({ routes: [] });
      
      // Draw route if we have current location and selected delivery
      if (currentLocation && selectedDelivery && selectedDelivery.lat && selectedDelivery.lng) {
        const directionsService = new google.maps.DirectionsService();
        
        directionsService.route(
          {
            origin: new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
            destination: new google.maps.LatLng(selectedDelivery.lat, selectedDelivery.lng),
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              directionsRendererRef.current?.setDirections(result);
            }
          }
        );
      }
    };
    
    drawRoute();
  }, [deliveries, selectedDeliveryId, currentLocation, mapLoaded]);

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full w-full rounded-md"></div>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button onClick={onOptimizeRoute} className="bg-primary">
          Otimizar Rota
        </Button>
        <Button
          onClick={isTrackingActive ? onStopTracking : onStartTracking}
          variant={isTrackingActive ? "destructive" : "default"}
        >
          {isTrackingActive ? 'Parar Rastreamento' : 'Iniciar Rastreamento'}
        </Button>
      </div>
      <div className="absolute top-4 right-4 bg-white shadow p-2 rounded text-sm">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span>Entregue</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span>Ocorrência</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
