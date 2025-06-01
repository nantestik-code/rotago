
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition } from '@/utils/mapUtils';
import { List, X, LayoutList, ArrowLeft, FileUp, Check, AlertTriangle, Eye, Clock, MessageSquare, MapPin, Navigation } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  onBackToImport?: () => void;
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
  const [activeTab, setActiveTab] = useState<'pendente' | 'entregue' | 'ocorrencia'>('pendente');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState(false);
  const [ocorrenciaText, setOcorrenciaText] = useState('');
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Filtrar entregas por status
  const pendingDeliveries = deliveries.filter(d => d.status === 'pendente');
  const deliveredDeliveries = deliveries.filter(d => d.status === 'entregue');
  const occurrenceDeliveries = deliveries.filter(d => d.status === 'ocorrencia');

  // Próxima entrega (primeira pendente)
  const nextDelivery = pendingDeliveries[0];

  const handleStatusChange = (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    console.log('Changing delivery status:', id, 'to', status);
    
    if (status === 'ocorrencia') {
      setCurrentDeliveryId(id);
      setShowOcorrenciaDialog(true);
      return;
    }
    
    onStatusChange(id, status);
    
    // Mostrar feedback
    const message = status === 'entregue' ? 'Entrega realizada!' : 'Status atualizado!';
    setFeedbackMessage(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  const handleOcorrenciaSubmit = () => {
    if (currentDeliveryId) {
      onStatusChange(currentDeliveryId, 'ocorrencia');
      setShowOcorrenciaDialog(false);
      setFeedbackMessage('Ocorrência registrada!');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    }
  };

  const openNavigation = (delivery: DeliveryItem) => {
    if (!delivery.lat || !delivery.lng) return;
    
    const userAgent = navigator.userAgent || navigator.vendor;
    const { lat, lng } = delivery;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } else if (/android/i.test(userAgent)) {
      window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  return (
    <>
      {/* Indicadores de processamento */}
      {processingGeocode && geocodeProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 shadow-sm">
          <p className="text-sm mb-2">Convertendo endereços em coordenadas...</p>
          <Progress value={geocodeProgress} className="h-2" />
        </div>
      )}

      {processingOptimization && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 shadow-sm">
          <p className="text-sm mb-2">Otimizando rota...</p>
          <Progress value={50} className="h-2" />
        </div>
      )}

      {isMobile ? (
        <div className="mobile-route-view">
          {/* Header Mobile */}
          <div className="mobile-header">
            {onBackToImport && (
              <Button
                onClick={onBackToImport}
                className="header-back-btn"
                variant="ghost"
                size="sm"
              >
                <ArrowLeft size={18} />
              </Button>
            )}
            
            <div className="header-info">
              <span className="route-name">
                {localStorage.getItem('current-route-name') || 'Rota Atual'}
              </span>
              <div className="status-badges">
                <div className="status-badge status-pending">
                  <div className="status-dot"></div>
                  <span>{statusCounts.pendente}</span>
                </div>
                <div className="status-badge status-delivered">
                  <div className="status-dot"></div>
                  <span>{statusCounts.entregue}</span>
                </div>
                <div className="status-badge status-occurrence">
                  <div className="status-dot"></div>
                  <span>{statusCounts.ocorrencia}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa em tela cheia */}
          <div className="mobile-map-container">
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
          </div>

          {/* Botão para mostrar próxima entrega */}
          {nextDelivery && (
            <div className="next-delivery-fab" onClick={() => setShowBottomSheet(true)}>
              <div className="fab-content">
                <MapPin size={16} />
                <span>Próxima</span>
              </div>
            </div>
          )}

          {/* Botão das listas */}
          <div className="delivery-lists-fab" onClick={() => setShowBottomSheet(true)}>
            <List size={20} />
            <span className="fab-badge">{deliveries.length}</span>
          </div>

          {/* Bottom Sheet com listas */}
          {showBottomSheet && (
            <div className="bottom-sheet-overlay" onClick={() => setShowBottomSheet(false)}>
              <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="bottom-sheet-header">
                  <div className="bottom-sheet-handle"></div>
                  <div className="sheet-tabs">
                    <button 
                      className={`tab-btn ${activeTab === 'pendente' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pendente')}
                    >
                      Pendentes ({statusCounts.pendente})
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'entregue' ? 'active' : ''}`}
                      onClick={() => setActiveTab('entregue')}
                    >
                      Entregues ({statusCounts.entregue})
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'ocorrencia' ? 'active' : ''}`}
                      onClick={() => setActiveTab('ocorrencia')}
                    >
                      Ocorrências ({statusCounts.ocorrencia})
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBottomSheet(false)}
                    className="close-btn"
                  >
                    <X size={20} />
                  </Button>
                </div>

                <div className="sheet-content">
                  {activeTab === 'pendente' && (
                    <div className="delivery-cards">
                      {pendingDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card">
                          <div className="card-header">
                            <div className="delivery-number">{index + 1}</div>
                            <div className="delivery-info">
                              <h3>{delivery.endereco.split(',')[0]}</h3>
                              <p>{delivery.cidade}</p>
                            </div>
                          </div>
                          <div className="card-actions">
                            <Button
                              className="action-btn nav-btn"
                              onClick={() => openNavigation(delivery)}
                              size="sm"
                            >
                              <Navigation size={14} />
                              Navegar
                            </Button>
                            <Button
                              className="action-btn deliver-btn"
                              onClick={() => handleStatusChange(delivery.id, 'entregue')}
                              size="sm"
                            >
                              <Check size={14} />
                              Entregar
                            </Button>
                            <Button
                              className="action-btn occurrence-btn"
                              onClick={() => handleStatusChange(delivery.id, 'ocorrencia')}
                              size="sm"
                            >
                              <AlertTriangle size={14} />
                              Ocorrência
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'entregue' && (
                    <div className="delivery-cards">
                      {deliveredDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card delivered">
                          <div className="card-header">
                            <div className="delivery-number delivered">{index + 1}</div>
                            <div className="delivery-info">
                              <h3>{delivery.endereco.split(',')[0]}</h3>
                              <p>{delivery.cidade}</p>
                              <span className="status-label">Entregue</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <Button
                              className="action-btn undo-btn"
                              onClick={() => handleStatusChange(delivery.id, 'pendente')}
                              size="sm"
                            >
                              Desfazer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'ocorrencia' && (
                    <div className="delivery-cards">
                      {occurrenceDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card occurrence">
                          <div className="card-header">
                            <div className="delivery-number occurrence">{index + 1}</div>
                            <div className="delivery-info">
                              <h3>{delivery.endereco.split(',')[0]}</h3>
                              <p>{delivery.cidade}</p>
                              <span className="status-label">Ocorrência</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <Button
                              className="action-btn undo-btn"
                              onClick={() => handleStatusChange(delivery.id, 'pendente')}
                              size="sm"
                            >
                              Desfazer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Layout desktop
        <div className="desktop-route-view">
          <div className="mb-4">
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

          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-230px)]">
            <div className="col-span-1 overflow-hidden flex flex-col border-r border-gray-200 pr-2">
              <h3 className="font-medium text-sm mb-2 flex items-center">
                <AlertTriangle size={14} className="text-red-500 mr-1" />
                Ocorrências ({deliveries.filter(d => d.status === 'ocorrencia').length})
              </h3>
              <DeliveryList
                deliveries={deliveries.filter(d => d.status === 'ocorrencia')}
                onStatusChange={onStatusChange}
                onSelectDelivery={onSelectDelivery}
                selectedDeliveryId={selectedDeliveryId}
              />
            </div>
            
            <div className="col-span-1 overflow-hidden flex flex-col">
              <h3 className="font-medium text-sm mb-2 flex items-center">
                <Clock size={14} className="text-blue-500 mr-1" />
                Pendentes ({deliveries.filter(d => d.status === 'pendente').length})
              </h3>
              <DeliveryList
                deliveries={deliveries.filter(d => d.status === 'pendente')}
                onStatusChange={onStatusChange}
                onSelectDelivery={onSelectDelivery}
                selectedDeliveryId={selectedDeliveryId}
              />
            </div>
            
            <div className="col-span-1 overflow-hidden flex flex-col border-l border-gray-200 pl-2">
              <h3 className="font-medium text-sm mb-2 flex items-center">
                <Check size={14} className="text-green-500 mr-1" />
                Entregues ({deliveries.filter(d => d.status === 'entregue').length})
              </h3>
              <DeliveryList
                deliveries={deliveries.filter(d => d.status === 'entregue')}
                onStatusChange={onStatusChange}
                onSelectDelivery={onSelectDelivery}
                selectedDeliveryId={selectedDeliveryId}
              />
            </div>
            
            <div className="col-span-3 rounded-md overflow-hidden mt-4 h-[calc(100vh-400px)]">
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
        </div>
      )}

      {/* Dialog de Ocorrência */}
      <Dialog open={showOcorrenciaDialog} onOpenChange={setShowOcorrenciaDialog}>
        <DialogContent className="mobile-dialog">
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
            <DialogDescription>
              Informe o motivo da ocorrência para esta entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Descreva o motivo da ocorrência..."
              value={ocorrenciaText}
              onChange={(e) => setOcorrenciaText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="mobile-dialog-footer">
            <Button variant="outline" onClick={() => setShowOcorrenciaDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleOcorrenciaSubmit}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Toast */}
      {showFeedback && (
        <div className="feedback-toast">
          {feedbackMessage}
        </div>
      )}
    </>
  );
};

export default RouteViewSection;
