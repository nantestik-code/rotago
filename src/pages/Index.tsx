
import React, { useState } from 'react';
import Header from '@/components/Header';
import ImportSection from '@/components/ImportSection';
import RouteViewSection from '@/components/RouteViewSection';
import { useDeliveries } from '@/hooks/use-deliveries';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useRouteActions } from '@/components/RouteActions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActivityTracker } from '@/hooks/use-activity-tracker';
import { useRouteHistory } from '@/hooks/use-route-history';
import SubscriptionBanner from '@/components/subscription/SubscriptionBanner';

const Index = () => {
  const isMobile = useIsMobile();
  const [showFileImport, setShowFileImport] = useState(true);
  const { logRouteAction } = useRouteHistory();
  
  // Ativar o rastreamento de atividade para manter a sessão ativa
  useActivityTracker();
  
  const {
    deliveries,
    setDeliveries,
    selectedDeliveryId,
    setSelectedDeliveryId,
    processingGeocode,
    geocodeProgress,
    processingOptimization,
    handleImportComplete,
    handleStatusChange,
    optimizeDeliveryRoute,
    statusCounts
  } = useDeliveries();

  const {
    currentLocation,
    isTrackingActive,
    startTracking,
    stopTracking
  } = useLocationTracking(deliveries, setSelectedDeliveryId);

  const { handleExport } = useRouteActions(deliveries, handleNewRoute);

  // Handle deliveries import with UI update
  const handleImport = async (importedDeliveries, routeName = 'Nova Rota') => {
    try {
      // Registrar a criação da rota no histórico antes de processar a importação
      const result = await handleImportComplete(importedDeliveries, routeName);
      
      // Só redirecionar após a geocodificação terminar com sucesso
      if (result?.success) {
        setShowFileImport(false);
        
        // Registrar a ação no histórico de rotas se a importação foi bem-sucedida
        if (result?.routeId) {
          logRouteAction('create', result.routeId, {
            message: `Rota "${routeName}" criada com ${importedDeliveries.length} entregas`,
            delivery_count: importedDeliveries.length
          });
        }
      }
    } catch (error) {
      console.error('Erro durante importação:', error);
      // Manter na tela de importação se houver erro
    }
  };

  // Handle new route
  function handleNewRoute() {
    setShowFileImport(true);
    setDeliveries([]);
    setSelectedDeliveryId(null);
    stopTracking();
  }

  // Handle route optimization with current location
  const handleOptimizeRoute = () => {
    // A função optimizeDeliveryRoute já registra a ação no histórico internamente
    optimizeDeliveryRoute(currentLocation);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        onNewRouteClick={handleNewRoute} 
        onExportClick={handleExport} 
      />
      
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        {/* Banner de Status da Assinatura */}
        <SubscriptionBanner />
        
        {showFileImport && (
          <ImportSection 
            onImportComplete={handleImport}
            processingGeocode={processingGeocode}
            geocodeProgress={geocodeProgress}
          />
        )}

        {!showFileImport && (
          <RouteViewSection 
            deliveries={deliveries}
            selectedDeliveryId={selectedDeliveryId}
            onSelectDelivery={setSelectedDeliveryId}
            onStatusChange={handleStatusChange}
            currentLocation={currentLocation}
            isTrackingActive={isTrackingActive}
            onStartTracking={startTracking}
            onStopTracking={stopTracking}
            onOptimizeRoute={handleOptimizeRoute}
            statusCounts={statusCounts}
            processingGeocode={processingGeocode}
            geocodeProgress={geocodeProgress}
            processingOptimization={processingOptimization}
            isMobile={isMobile}
            onBackToImport={() => {
              // Parar o rastreamento e voltar para a tela de importação
              stopTracking();
              setShowFileImport(true);
              setDeliveries([]);
              setSelectedDeliveryId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
