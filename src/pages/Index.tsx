
import React, { useState } from 'react';
import Header from '@/components/Header';
import ImportSection from '@/components/ImportSection';
import RouteViewSection from '@/components/RouteViewSection';
import { useDeliveries } from '@/hooks/use-deliveries';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useRouteActions } from '@/components/RouteActions';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  const [showFileImport, setShowFileImport] = useState(true);
  
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
  const handleImport = async (importedDeliveries) => {
    await handleImportComplete(importedDeliveries);
    setShowFileImport(false);
    
    // On mobile, automatically show map view after import
    if (isMobile) {
      setShowFileImport(false);
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
    optimizeDeliveryRoute(currentLocation);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        onNewRouteClick={handleNewRoute} 
        onExportClick={handleExport} 
      />
      
      <div className="flex-1 p-4 bg-gray-50 overflow-hidden">
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
