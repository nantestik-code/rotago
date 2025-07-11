
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition } from '@/utils/mapUtils';
import { List, X, LayoutList, ArrowLeft, FileUp, Check, AlertTriangle, Eye, Clock, MessageSquare, MapPin, Navigation, RotateCcw } from 'lucide-react';
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
  // Estado compartilhado para controlar a aba ativa em ambos os layouts (mobile e desktop)
  const [activeTab, setActiveTab] = useState<'pendente' | 'entregue' | 'ocorrencia'>('pendente');
  
  // Log para depuração das entregas recebidas
  console.log('RouteViewSection - Entregas recebidas:', deliveries.length, deliveries);
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
  
  // Função para abrir o diálogo de ocorrência
  const handleOcorrenciaClick = (id: string) => {
    setCurrentDeliveryId(id);
    setShowOcorrenciaDialog(true);
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

      {/* Renderizar apenas um layout baseado no tamanho da tela */}
      {isMobile ? (
        /* Layout Mobile */
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
          
          {/* Feedback visual quando uma lista está aberta */}
          {showBottomSheet && <div className="fixed inset-0 bg-black bg-opacity-10 z-10"></div>}

          {/* Botão para mostrar próxima entrega */}
          {nextDelivery && (
            <div className="next-delivery-fab fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-full flex items-center shadow-lg z-20" onClick={() => setShowBottomSheet(true)}>
              <div className="fab-content flex items-center gap-1">
                <MapPin size={16} />
                <span className="text-sm font-medium">Próxima</span>
              </div>
            </div>
          )}

          {/* Botão das listas */}
          <div className="delivery-lists-fab fixed bottom-4 right-4 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg z-20" onClick={() => setShowBottomSheet(true)}>
            <List size={20} className="text-white" />
            <span className="fab-badge absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">{deliveries.length}</span>
          </div>

          {/* Bottom Sheet com listas */}
          {showBottomSheet && (
            <div className="bottom-sheet-overlay fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowBottomSheet(false)}>
              <div className="bottom-sheet z-50 bg-white rounded-t-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="bottom-sheet-header sticky top-0 bg-white border-b border-gray-200 p-3">
                  <div className="bottom-sheet-handle w-16 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
                  <div className="sheet-tabs flex space-x-2 overflow-x-auto pb-1">
                    <button 
                      className={`tab-btn px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'pendente' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                      onClick={() => setActiveTab('pendente')}
                    >
                      Pendentes ({statusCounts.pendente})
                    </button>
                    <button 
                      className={`tab-btn px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'entregue' ? 'bg-green-100 text-green-700' : 'text-gray-600'}`}
                      onClick={() => setActiveTab('entregue')}
                    >
                      Entregues ({statusCounts.entregue})
                    </button>
                    <button 
                      className={`tab-btn px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'ocorrencia' ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}
                      onClick={() => setActiveTab('ocorrencia')}
                    >
                      Ocorrências ({statusCounts.ocorrencia})
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBottomSheet(false)}
                    className="close-btn absolute right-2 top-2 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={20} />
                  </Button>
                </div>

                <div className="sheet-content p-2 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {/* Renderizar apenas a lista ativa selecionada */}
                  {activeTab === 'pendente' && (
                    <div className="delivery-cards space-y-3">
                      {pendingDeliveries.length > 0 ? pendingDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="card-header">
                            <div className="delivery-number w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium mr-2">{index + 1}</div>
                            <div className="delivery-info">
                              <h3 className="truncate">{delivery.endereco.split(',')[0]}</h3>
                              <p className="truncate">{delivery.cidade}</p>
                              <span className="status-label">Pendente</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <Button
                              className="action-btn nav-btn flex-1 flex items-center justify-center gap-1"
                              onClick={() => openNavigation(delivery)}
                              size="sm"
                              disabled={!delivery.lat || !delivery.lng}
                            >
                              <MapPin size={16} />
                              <span className="hidden sm:inline">Navegar</span>
                            </Button>
                            <Button
                              className="action-btn done-btn flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleStatusChange(delivery.id, 'entregue')}
                              size="sm"
                            >
                              <Check size={16} />
                              <span className="hidden sm:inline">Entregue</span>
                            </Button>
                            <Button
                              className="action-btn issue-btn flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleOcorrenciaClick(delivery.id)}
                              size="sm"
                            >
                              <AlertTriangle size={16} />
                              <span className="hidden sm:inline">Ocorrência</span>
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="empty-list-message p-4 text-center text-gray-500 italic">Nenhuma entrega pendente</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'entregue' && (
                    <div className="delivery-cards space-y-3">
                      {deliveredDeliveries.length > 0 ? deliveredDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card delivered bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="card-header">
                            <div className="delivery-number delivered w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-medium mr-2">{index + 1}</div>
                            <div className="delivery-info">
                              <h3 className="truncate">{delivery.endereco.split(',')[0]}</h3>
                              <p className="truncate">{delivery.cidade}</p>
                              <span className="status-label">Entregue</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <Button
                              className="action-btn undo-btn"
                              onClick={() => handleStatusChange(delivery.id, 'pendente')}
                              size="sm"
                            >
                              <RotateCcw size={16} />
                              <span className="hidden sm:inline">Desfazer</span>
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="empty-list-message p-4 text-center text-gray-500 italic">Nenhuma entrega concluída</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'ocorrencia' && (
                    <div className="delivery-cards space-y-3">
                      {occurrenceDeliveries.length > 0 ? occurrenceDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card occurrence bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="card-header">
                            <div className="delivery-number occurrence w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-medium mr-2">{index + 1}</div>
                            <div className="delivery-info">
                              <h3 className="truncate">{delivery.endereco.split(',')[0]}</h3>
                              <p className="truncate">{delivery.cidade}</p>
                              <span className="status-label">Ocorrência</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <Button
                              className="action-btn undo-btn"
                              onClick={() => handleStatusChange(delivery.id, 'pendente')}
                              size="sm"
                            >
                              <RotateCcw size={16} />
                              <span className="hidden sm:inline">Desfazer</span>
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="empty-list-message p-4 text-center text-gray-500 italic">Nenhuma ocorrência registrada</div>
                      )}
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

          <div className="h-[calc(100vh-230px)] overflow-hidden">
            {/* Layout em grid para desktop - mapa à esquerda (60%), lista à direita (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-6 h-full">
              {/* Mapa à esquerda - ocupa 60% do espaço em desktop */}
              <div className="h-full rounded-md overflow-hidden col-span-3">
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
              
              {/* Lista de entregas à direita - ocupa 40% do espaço em desktop */}
              <div className="h-full flex flex-col border-l border-gray-200 pl-2 lg:pl-4 col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Abas de navegação */}
                <div className="flex flex-wrap gap-1 lg:space-x-2 mb-4 border-b border-gray-200 pb-2 overflow-x-auto">
                  <button 
                    className={`px-2 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'pendente' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('pendente')}
                  >
                    <Clock size={16} className="mr-1 lg:mr-2 text-blue-500" />
                    <span className="hidden sm:inline">Pendentes</span>
                    <span className="sm:hidden">Pend.</span>
                    <span className="ml-1">({pendingDeliveries.length || deliveries.length})</span>
                  </button>
                  <button 
                    className={`px-2 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'entregue' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('entregue')}
                  >
                    <Check size={16} className="mr-1 lg:mr-2 text-green-500" />
                    <span className="hidden sm:inline">Entregues</span>
                    <span className="sm:hidden">Entr.</span>
                    <span className="ml-1">({deliveredDeliveries.length})</span>
                  </button>
                  <button 
                    className={`px-2 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'ocorrencia' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('ocorrencia')}
                  >
                    <AlertTriangle size={16} className="mr-1 lg:mr-2 text-red-500" />
                    <span className="hidden sm:inline">Ocorrências</span>
                    <span className="sm:hidden">Ocor.</span>
                    <span className="ml-1">({occurrenceDeliveries.length})</span>
                  </button>
                </div>
                
                {/* Conteúdo da aba ativa */}
                <div className="flex-1 overflow-hidden">
                  {/* Debug para verificar as entregas */}
                  {false && (
                    <div className="hidden">
                      {'RouteViewSection - deliveries: ' + deliveries.length}
                      {'RouteViewSection - pendingDeliveries: ' + pendingDeliveries.length}
                      {'RouteViewSection - deliveredDeliveries: ' + deliveredDeliveries.length}
                      {'RouteViewSection - occurrenceDeliveries: ' + occurrenceDeliveries.length}
                      {'RouteViewSection - activeTab: ' + activeTab}
                    </div>
                  )}
                  
                  {activeTab === 'pendente' && (
                    <div className="h-full">
                      <DeliveryList
                        deliveries={deliveries} /* Sempre passamos todas as entregas */
                        onStatusChange={onStatusChange}
                        onSelectDelivery={onSelectDelivery}
                        selectedDeliveryId={selectedDeliveryId}
                        status="pendente"
                      />
                    </div>
                  )}
                  
                  {activeTab === 'entregue' && (
                    <div className="h-full">
                      <DeliveryList
                        deliveries={deliveries} /* Sempre passamos todas as entregas */
                        onStatusChange={onStatusChange}
                        onSelectDelivery={onSelectDelivery}
                        selectedDeliveryId={selectedDeliveryId}
                        status="entregue"
                      />
                    </div>
                  )}
                  
                  {activeTab === 'ocorrencia' && (
                    <div className="h-full">
                      <DeliveryList
                        deliveries={deliveries} /* Sempre passamos todas as entregas */
                        onStatusChange={onStatusChange}
                        onSelectDelivery={onSelectDelivery}
                        selectedDeliveryId={selectedDeliveryId}
                        status="ocorrencia"
                      />
                    </div>
                  )}
                </div>
              </div>
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
