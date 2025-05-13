
import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition } from '@/utils/mapUtils';
import { List, X } from 'lucide-react';

interface RouteViewSectionProps {
  deliveries: DeliveryItem[];
  selectedDeliveryId: string | null;
  onSelectDelivery: (id: string) => void;
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  currentLocation: MapPosition | null;
  isTrackingActive: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onOptimizeRoute: () => void;
  statusCounts: {
    pendente: number;
    entregue: number;
    ocorrencia: number;
    total: number;
  };
  processingGeocode: boolean;
  geocodeProgress: number;
  processingOptimization: boolean;
  isMobile: boolean;
}

const RouteViewSection: React.FC<RouteViewSectionProps> = ({
  deliveries,
  selectedDeliveryId,
  onSelectDelivery,
  onStatusChange,
  currentLocation,
  isTrackingActive,
  onStartTracking,
  onStopTracking,
  onOptimizeRoute,
  statusCounts,
  processingGeocode,
  geocodeProgress,
  processingOptimization,
  isMobile
}) => {
  const [showListOverlay, setShowListOverlay] = React.useState(false);

  const toggleListOverlay = () => {
    setShowListOverlay(!showListOverlay);
  };

  return (
    <>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold mb-2">Rota Otimizada</h2>
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
          {/* Fixed position map that fills the screen for mobile */}
          <div className="fixed inset-0 pt-[170px] pb-4 px-4 z-10 bg-white">
            <DeliveryMap
              deliveries={deliveries}
              selectedDeliveryId={selectedDeliveryId}
              onSelectDelivery={onSelectDelivery}
              currentLocation={currentLocation}
              isTrackingActive={isTrackingActive}
              onStartTracking={onStartTracking}
              onStopTracking={onStopTracking}
              onOptimizeRoute={onOptimizeRoute}
            />
            
            {/* Floating Button to show list */}
            <Button
              onClick={toggleListOverlay}
              className="absolute bottom-4 left-4 z-10 shadow-lg flex items-center gap-2"
              variant="default"
            >
              <List size={18} />
              Ver Lista
            </Button>
            
            {/* List overlay */}
            {showListOverlay && (
              <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Lista de Entregas</h3>
                  <Button variant="ghost" size="icon" onClick={toggleListOverlay}>
                    <X size={20} />
                  </Button>
                </div>
                <DeliveryList
                  deliveries={deliveries}
                  onStatusChange={onStatusChange}
                  onSelectDelivery={(id) => {
                    onSelectDelivery(id);
                    setShowListOverlay(false); // Close list and show map
                  }}
                  selectedDeliveryId={selectedDeliveryId}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-230px)]">
          <div className="col-span-1 overflow-hidden flex flex-col">
            <DeliveryList
              deliveries={deliveries}
              onStatusChange={onStatusChange}
              onSelectDelivery={onSelectDelivery}
              selectedDeliveryId={selectedDeliveryId}
            />
          </div>
          <div className="col-span-2 rounded-md overflow-hidden">
            <DeliveryMap
              deliveries={deliveries}
              selectedDeliveryId={selectedDeliveryId}
              onSelectDelivery={onSelectDelivery}
              currentLocation={currentLocation}
              isTrackingActive={isTrackingActive}
              onStartTracking={onStartTracking}
              onStopTracking={onStopTracking}
              onOptimizeRoute={onOptimizeRoute}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default RouteViewSection;
