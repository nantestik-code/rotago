import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import FileImport from '@/components/FileImport';
import DeliveryMap from '@/components/DeliveryMap';
import DeliveryList from '@/components/DeliveryList';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem, getStatusCounts } from '@/utils/deliveryUtils';
import { exportToCSV } from '@/utils/fileUtils';
import { MapPosition, getCurrentPosition, watchPosition, stopWatchingPosition, geocodeAddresses, optimizeRoute } from '@/utils/mapUtils';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCmRW2hP97SCWoflXWc8V1nrxpgclFEWZs';

const Index = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapPosition | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [showFileImport, setShowFileImport] = useState(true);
  const [processingGeocode, setProcessingGeocode] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [processingOptimization, setProcessingOptimization] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'map' | 'list'>(isMobile ? 'map' : 'list');

  // Initialize location
  useEffect(() => {
    const init = async () => {
      try {
        const position = await getCurrentPosition();
        setCurrentLocation(position);
      } catch (error) {
        console.error('Error getting current position:', error);
        toast({
          title: 'Erro de localização',
          description: 'Não foi possível obter sua localização atual.',
          variant: 'destructive',
        });
      }
    };

    init();
  }, []);

  // Handle deliveries import
  const handleImportComplete = useCallback(async (importedDeliveries: DeliveryItem[]) => {
    setShowFileImport(false);
    
    // Geocode addresses
    setProcessingGeocode(true);
    setGeocodeProgress(0);
    
    try {
      // Fix: Remove the third argument (GOOGLE_MAPS_API_KEY) as it's not needed anymore
      const geocodedDeliveries = await geocodeAddresses(
        importedDeliveries,
        (progress) => setGeocodeProgress(progress)
      );
      
      setDeliveries(geocodedDeliveries);
      
      // Find first pending delivery to select
      const firstPending = geocodedDeliveries.find(d => d.status === 'pendente');
      if (firstPending) {
        setSelectedDeliveryId(firstPending.id);
      }
      
      toast({
        title: 'Endereços processados',
        description: `${geocodedDeliveries.length} endereços foram geocodificados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro de geocodificação',
        description: 'Ocorreu um erro ao converter endereços em coordenadas.',
        variant: 'destructive',
      });
      console.error('Geocoding error:', error);
      setDeliveries(importedDeliveries);
    } finally {
      setProcessingGeocode(false);
      setGeocodeProgress(100);
      
      // Reset progress after delay
      setTimeout(() => {
        setGeocodeProgress(0);
      }, 1000);
    }
  }, []);

  // Handle status change
  const handleStatusChange = useCallback((id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    setDeliveries(prev => 
      prev.map(delivery => 
        delivery.id === id ? { ...delivery, status } : delivery
      )
    );
    
    const statusMessages = {
      pendente: 'Entrega marcada como pendente',
      entregue: 'Entrega concluída com sucesso',
      ocorrencia: 'Ocorrência registrada para esta entrega',
    };
    
    toast({
      title: statusMessages[status],
      description: `O status da entrega foi atualizado.`,
    });
  }, []);

  // Start location tracking
  const startTracking = useCallback(() => {
    if (isTrackingActive) return;
    
    const id = watchPosition(
      (position) => {
        setCurrentLocation(position);
        
        // Check proximity to deliveries
        deliveries.forEach(delivery => {
          if (delivery.status === 'pendente' && delivery.lat && delivery.lng && position) {
            import('@/utils/deliveryUtils').then(({ calculateDistance }) => {
              const distance = calculateDistance(
                position.lat, 
                position.lng, 
                delivery.lat!, 
                delivery.lng!
              );
              
              // Notify when within 100 meters of a delivery
              if (distance <= 100) {
                // Check if browser supports notifications
                if ('Notification' in window) {
                  // Request permission if not granted
                  if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    Notification.requestPermission();
                  }
                  
                  // Show notification if permission granted
                  if (Notification.permission === 'granted') {
                    new Notification('Entrega próxima!', {
                      body: `Você está a ${Math.round(distance)}m de: ${delivery.cliente}`,
                      icon: '/favicon.ico'
                    });
                  }
                }
                
                toast({
                  title: 'Entrega próxima!',
                  description: `Você está a ${Math.round(distance)}m de: ${delivery.cliente}`,
                });
                
                setSelectedDeliveryId(delivery.id);
              }
            });
          }
        });
      },
      (error) => {
        console.error('Error watching position:', error);
        toast({
          title: 'Erro de rastreamento',
          description: 'Ocorreu um erro ao rastrear sua localização.',
          variant: 'destructive',
        });
        setIsTrackingActive(false);
      }
    );
    
    if (id !== null) {
      setWatchId(id);
      setIsTrackingActive(true);
      toast({
        title: 'Rastreamento iniciado',
        description: 'Sua localização está sendo monitorada em tempo real.',
      });
    }
  }, [deliveries, isTrackingActive]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (!isTrackingActive) return;
    
    stopWatchingPosition(watchId);
    setIsTrackingActive(false);
    setWatchId(null);
    
    toast({
      title: 'Rastreamento parado',
      description: 'O monitoramento de localização foi interrompido.',
    });
  }, [isTrackingActive, watchId]);

  // Handle route optimization
  const handleOptimizeRoute = useCallback(async () => {
    if (!currentLocation) {
      toast({
        title: 'Localização necessária',
        description: 'Sua localização atual é necessária para otimizar a rota.',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingOptimization(true);
    
    try {
      // Fix: Remove the third argument (GOOGLE_MAPS_API_KEY) as it's not needed anymore
      const optimizedDeliveries = await optimizeRoute(
        currentLocation,
        deliveries
      );
      
      setDeliveries(optimizedDeliveries);
      
      toast({
        title: 'Rota otimizada',
        description: 'A rota foi otimizada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro de otimização',
        description: 'Ocorreu um erro ao otimizar a rota.',
        variant: 'destructive',
      });
      console.error('Optimization error:', error);
    } finally {
      setProcessingOptimization(false);
    }
  }, [currentLocation, deliveries]);

  // Handle new route
  const handleNewRoute = useCallback(() => {
    setShowFileImport(true);
    setDeliveries([]);
    setSelectedDeliveryId(null);
    stopTracking();
  }, [stopTracking]);

  // Handle export
  const handleExport = useCallback(() => {
    if (deliveries.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Importe entregas primeiro para poder exportá-las.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      exportToCSV(deliveries);
      toast({
        title: 'Exportação concluída',
        description: 'Os dados foram exportados com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar os dados.',
        variant: 'destructive',
      });
      console.error('Export error:', error);
    }
  }, [deliveries]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        stopWatchingPosition(watchId);
      }
    };
  }, [watchId]);

  // Get status counts
  const statusCounts = getStatusCounts(deliveries);

  return (
    <div className="flex flex-col h-screen">
      <Header onNewRouteClick={handleNewRoute} onExportClick={handleExport} />
      
      <div className="flex-1 p-4 bg-gray-50 overflow-hidden">
        {showFileImport && (
          <div className="max-w-2xl mx-auto py-8">
            <FileImport onImportComplete={handleImportComplete} />
          </div>
        )}

        {!showFileImport && (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-semibold mb-4">Rota Otimizada</h2>
              <StatusCounter 
                pendente={statusCounts.pendente} 
                entregue={statusCounts.entregue} 
                ocorrencia={statusCounts.ocorrencia} 
                total={statusCounts.total}
              />
            </div>

            {processingGeocode && geocodeProgress > 0 && (
              <div className="my-4">
                <p className="text-sm mb-1">Convertendo endereços em coordenadas...</p>
                <Progress value={geocodeProgress} className="h-1" />
              </div>
            )}

            {processingOptimization && (
              <div className="my-4">
                <p className="text-sm mb-1">Otimizando rota...</p>
                <Progress value={50} className="h-1" />
              </div>
            )}

            {isMobile ? (
              <>
                <div className="flex mb-4 border-b">
                  <Button
                    variant="ghost"
                    className={`flex-1 ${selectedTab === 'map' ? 'border-b-2 border-primary' : ''}`}
                    onClick={() => setSelectedTab('map')}
                  >
                    Mapa
                  </Button>
                  <Button
                    variant="ghost"
                    className={`flex-1 ${selectedTab === 'list' ? 'border-b-2 border-primary' : ''}`}
                    onClick={() => setSelectedTab('list')}
                  >
                    Entregas
                  </Button>
                </div>

                <div className="h-[calc(100vh-270px)]">
                  {selectedTab === 'map' ? (
                    <DeliveryMap
                      deliveries={deliveries}
                      selectedDeliveryId={selectedDeliveryId}
                      onSelectDelivery={setSelectedDeliveryId}
                      currentLocation={currentLocation}
                      isTrackingActive={isTrackingActive}
                      onStartTracking={startTracking}
                      onStopTracking={stopTracking}
                      onOptimizeRoute={handleOptimizeRoute}
                    />
                  ) : (
                    <DeliveryList
                      deliveries={deliveries}
                      onStatusChange={handleStatusChange}
                      onSelectDelivery={setSelectedDeliveryId}
                      selectedDeliveryId={selectedDeliveryId}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-4 h-[calc(100vh-230px)]">
                <div className="col-span-1 overflow-hidden flex flex-col">
                  <DeliveryList
                    deliveries={deliveries}
                    onStatusChange={handleStatusChange}
                    onSelectDelivery={setSelectedDeliveryId}
                    selectedDeliveryId={selectedDeliveryId}
                  />
                </div>
                <div className="col-span-2 rounded-md overflow-hidden">
                  <DeliveryMap
                    deliveries={deliveries}
                    selectedDeliveryId={selectedDeliveryId}
                    onSelectDelivery={setSelectedDeliveryId}
                    currentLocation={currentLocation}
                    isTrackingActive={isTrackingActive}
                    onStartTracking={startTracking}
                    onStopTracking={stopTracking}
                    onOptimizeRoute={handleOptimizeRoute}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
