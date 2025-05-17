
import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition } from '@/utils/mapUtils';
import { List, X, LayoutList, ArrowLeft, FileUp } from 'lucide-react';

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
  onBackToImport?: () => void; // Nova prop para voltar à tela de importação
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
  isMobile,
  onBackToImport
}) => {
  const [showListOverlay, setShowListOverlay] = React.useState(false);

  const toggleListOverlay = () => {
    setShowListOverlay(!showListOverlay);
  };

  return (
    <>
      {/* Header - Escondido no mobile para maximizar espaço do mapa */}
      <div className={`${isMobile ? 'hidden' : 'mb-4'}`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-semibold">Rota Otimizada</h2>
          {onBackToImport && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBackToImport}
              className="flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              <FileUp size={16} />
              Importar Arquivo
            </Button>
          )}
        </div>
        <StatusCounter 
          pendente={statusCounts.pendente} 
          entregue={statusCounts.entregue} 
          ocorrencia={statusCounts.ocorrencia} 
          total={statusCounts.total}
        />
      </div>

      {/* Indicadores de processamento */}
      {processingGeocode && geocodeProgress > 0 && (
        <div className={`${isMobile ? 'fixed top-0 left-0 right-0 z-50' : 'my-4'}`}>
          <p className="text-sm mb-1 px-4">Convertendo endereços em coordenadas...</p>
          <Progress value={geocodeProgress} className="h-1" />
        </div>
      )}

      {processingOptimization && (
        <div className={`${isMobile ? 'fixed top-0 left-0 right-0 z-50' : 'my-4'}`}>
          <p className="text-sm mb-1 px-4">Otimizando rota...</p>
          <Progress value={50} className="h-1" />
        </div>
      )}

      {isMobile ? (
        <>
          {/* Versão mobile com mapa em tela cheia */}
          <div className="fixed inset-0 z-10 bg-white">
            <DeliveryMap
              deliveries={deliveries}
              selectedDeliveryId={selectedDeliveryId}
              onSelectDelivery={onSelectDelivery}
              currentLocation={currentLocation}
              isTrackingActive={isTrackingActive}
              onStartTracking={onStartTracking}
              onStopTracking={onStopTracking}
              onOptimizeRoute={onOptimizeRoute}
              onStatusChange={onStatusChange}
              isMobileView={true}
            />
            
            {/* Mini contador de status fixo no topo */}
            <div className="fixed top-2 left-2 right-2 z-20 bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-md flex justify-between items-center">
              <div className="flex gap-2">
                {onBackToImport && (
                  <Button
                    onClick={onBackToImport}
                    className="h-8 px-2 flex items-center gap-1 mr-1"
                    variant="outline"
                    size="sm"
                  >
                    <ArrowLeft size={14} />
                    <span className="text-xs">Voltar</span>
                  </Button>
                )}
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                  <span className="text-xs">{statusCounts.pendente}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs">{statusCounts.entregue}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs">{statusCounts.ocorrencia}</span>
                </div>
              </div>
              <Button
                onClick={toggleListOverlay}
                className="h-8 px-2 flex items-center gap-1"
                variant="outline"
                size="sm"
              >
                <LayoutList size={16} />
                <span className="text-xs">Lista</span>
              </Button>
            </div>
            
            {/* Lista de entregas em overlay */}
            {showListOverlay && (
              <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
                <div className="sticky top-0 flex justify-between items-center p-4 bg-white border-b">
                  <h3 className="text-lg font-semibold">Lista de Entregas</h3>
                  <Button variant="ghost" size="icon" onClick={toggleListOverlay}>
                    <X size={20} />
                  </Button>
                </div>
                <div className="p-4 pb-20">
                  <StatusCounter 
                    pendente={statusCounts.pendente} 
                    entregue={statusCounts.entregue} 
                    ocorrencia={statusCounts.ocorrencia} 
                    total={statusCounts.total}
                    className="mb-4"
                  />
                  <DeliveryList
                    deliveries={deliveries}
                    onStatusChange={onStatusChange}
                    onSelectDelivery={(id) => {
                      onSelectDelivery(id);
                      setShowListOverlay(false); // Fecha a lista e mostra o mapa
                    }}
                    selectedDeliveryId={selectedDeliveryId}
                  />
                </div>
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
              onStatusChange={onStatusChange}
              isMobileView={false}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default RouteViewSection;
