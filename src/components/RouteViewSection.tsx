import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition } from '@/utils/mapUtils';
import { List, X, LayoutList, ArrowLeft, FileUp, Check, AlertTriangle, Eye, Clock, MessageSquare } from 'lucide-react';
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
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragThreshold = 50; // pixels to determine drag direction
  const [showFullList, setShowFullList] = useState(false); // Estado para controlar a exibição completa ou apenas próxima entrega
  
  // Estados para diálogos e interatividade
  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState(false);
  const [ocorrenciaText, setOcorrenciaText] = useState('');
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  const [voltarDepoisList, setVoltarDepoisList] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info'>('info');

  const toggleListOverlay = () => {
    setShowListOverlay(!showListOverlay);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = startY - currentY;
    
    // Se arrastar para cima, mostra a lista completa
    if (diff > dragThreshold) {
      setShowFullList(true);
    }
    // Se arrastar para baixo, mostra apenas a próxima entrega
    else if (diff < -dragThreshold) {
      setShowFullList(false);
    }
    
    setIsDragging(false);
  };
  
  // Função para alternar entre lista completa e próxima entrega
  const toggleFullList = () => {
    setShowFullList(!showFullList);
  };
  
  // Funções para lidar com ocorrências
  const handleOcorrenciaClick = (id: string) => {
    setCurrentDeliveryId(id);
    setOcorrenciaText('');
    setShowOcorrenciaDialog(true);
  };
  
  const handleOcorrenciaSubmit = () => {
    if (currentDeliveryId) {
      onStatusChange(currentDeliveryId, 'ocorrencia');
      setShowOcorrenciaDialog(false);
      setFeedbackMessage('Ocorrência registrada com sucesso!');
      setFeedbackType('success');
      setShowFeedback(true);
      
      // Esconde o feedback após 3 segundos
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    }
  };
  
  // Função para "Voltar depois"
  const handleVoltarDepois = (id: string) => {
    // Adiciona ou remove da lista de "voltar depois"
    if (voltarDepoisList.includes(id)) {
      setVoltarDepoisList(voltarDepoisList.filter(item => item !== id));
      setFeedbackMessage('Entrega removida da lista de "voltar depois"');
    } else {
      setVoltarDepoisList([...voltarDepoisList, id]);
      setFeedbackMessage('Entrega marcada para "voltar depois"');
    }
    
    setFeedbackType('info');
    setShowFeedback(true);
    
    // Esconde o feedback após 3 segundos
    setTimeout(() => {
      setShowFeedback(false);
    }, 3000);
  };
  
  // Função para entregar
  const handleEntregue = (id: string) => {
    onStatusChange(id, 'entregue');
    setFeedbackMessage('Entrega realizada com sucesso!');
    setFeedbackType('success');
    setShowFeedback(true);
    
    // Esconde o feedback após 3 segundos
    setTimeout(() => {
      setShowFeedback(false);
    }, 3000);
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
          {/* Versão mobile com mapa em tela cheia e lista na parte inferior */}
          <div className="fixed inset-0 z-10 bg-white">
            {/* Mapa em tela cheia */}
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
            
            {/* Barra de navegação superior */}
            <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm p-2 flex items-center">
              {onBackToImport && (
                <Button
                  onClick={onBackToImport}
                  className="h-8 w-8 p-0 mr-2"
                  variant="ghost"
                  size="sm"
                >
                  <ArrowLeft size={18} />
                </Button>
              )}
              
              <div className="flex items-center gap-2 ml-1">
                <span className="text-sm font-medium">
                  {localStorage.getItem('current-route-name') || 'Rota Atual'}
                </span>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <div className="flex items-center bg-blue-100 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                  <span className="text-xs text-blue-700 font-medium">{statusCounts.pendente}</span>
                </div>
                <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs text-green-700 font-medium">{statusCounts.entregue}</span>
                </div>
                <div className="flex items-center bg-red-100 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs text-red-700 font-medium">{statusCounts.ocorrencia}</span>
                </div>
              </div>
            </div>
            
            {/* Lista de entregas estilo desktop - limpa e interativa */}
            <div 
              className="fixed inset-x-0 bottom-0 z-40 bg-white shadow-lg rounded-t-xl transition-all duration-300"
              style={{
                height: showFullList ? '80vh' : '220px',
                overflow: showFullList ? 'auto' : 'hidden'
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Indicador de arraste */}
              <div className="flex justify-center py-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Cabeçalho da lista */}
              <div className="px-4 py-2 flex justify-between items-center border-b border-gray-100">
                <h3 className="font-medium text-sm">
                  {showFullList ? 'Todas as Entregas' : 'Próxima Entrega'}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7 px-2"
                  onClick={toggleFullList}
                >
                  {showFullList ? 'Mostrar Próxima' : 'Ver Todas'}
                </Button>
              </div>
              
              {/* Lista de entregas rolável - estilo desktop */}
              <div className="divide-y divide-gray-100">
                {/* Filtra para mostrar apenas a próxima entrega ou todas */}
                {/* As entregas já estão ordenadas por sequence_number no DeliveryList */}
                {deliveries
                  .filter((delivery, index) => showFullList || index === 0)
                  .map((delivery, index) => {
                    const isSelected = selectedDeliveryId === delivery.id;
                    const isFirst = deliveries.indexOf(delivery) === 0;
                    // Manter orderNumber para identificação do pedido
                    const orderNumber = delivery.orderNumber || deliveries.indexOf(delivery) + 1;
                    // Usar sequence_number apenas para ordenar a lista, não para exibir
                    
                    return (
                      <div 
                        key={delivery.id} 
                        className={`p-3 ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => onSelectDelivery(delivery.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full ${delivery.status === 'pendente' ? 'bg-blue-500' : delivery.status === 'ocorrencia' ? 'bg-red-500' : 'bg-green-500'} flex items-center justify-center text-white text-xs font-bold`}>
                              {index + 1}
                            </div>
                            {showFullList && index < deliveries.length - 1 && (
                              <div className="h-12 w-0.5 bg-gray-200 my-1"></div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                {/* Verificar se há múltiplas ordens no mesmo endereço */}
                                {(() => {
                                  // Encontrar todas as entregas com o mesmo endereço
                                  const sameAddressDeliveries = deliveries.filter(d => 
                                    d.endereco === delivery.endereco && d.id !== delivery.id
                                  );
                                  
                                  // Se houver múltiplas entregas no mesmo endereço, destacar com borda laranja
                                  const hasDuplicateAddress = sameAddressDeliveries.length > 0;
                                  const orderNumbers = hasDuplicateAddress ? 
                                    [delivery.orderNumber, ...sameAddressDeliveries.map(d => d.orderNumber)].filter(Boolean) : 
                                    [delivery.orderNumber].filter(Boolean);
                                  
                                  return (
                                    <div className={`${hasDuplicateAddress ? 'border-2 border-orange-400 rounded-md p-2' : ''}`}>
                                      <h3 className="font-medium text-sm flex items-center">
                                        <span>{delivery.endereco.split(',')[0]}</span>
                                        {orderNumbers.length > 0 && (
                                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                            Ordem: {orderNumbers.join(', ')}
                                          </span>
                                        )}
                                      </h3>
                                      <p className="text-xs text-gray-600 mt-0.5">
                                        {delivery.endereco.split(',').slice(1).join(',').trim()}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {delivery.cep || ''}
                                      </p>
                                    </div>
                                  );
                                })()} 
                              </div>
                              <div className="text-sm font-medium text-gray-500">
                                {delivery.horario || ''}
                              </div>
                            </div>
                            
                            {/* Botões de ação estilo desktop - mais limpos */}
                            <div className="flex gap-2 mt-3">
                              <Button 
                                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 h-9 rounded-md flex items-center justify-center gap-1 px-3"
                                onClick={(e) => { e.stopPropagation(); }}
                                size="sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                                <span>Navegar</span>
                              </Button>
                              
                              <Button 
                                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 h-9 rounded-md flex items-center justify-center gap-1 px-3"
                                onClick={(e) => { e.stopPropagation(); handleEntregue(delivery.id); }}
                                size="sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                <span>Entregue</span>
                              </Button>
                              
                              <Button 
                                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 h-9 rounded-md flex items-center justify-center gap-1 px-3"
                                onClick={(e) => { e.stopPropagation(); handleOcorrenciaClick(delivery.id); }}
                                size="sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>Ocorrência</span>
                              </Button>
                              
                              <Button 
                                className="bg-blue-500 hover:bg-blue-600 text-white h-9 rounded-md flex items-center justify-center gap-1 px-3 ml-auto"
                                onClick={(e) => { e.stopPropagation(); }}
                                size="sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                <span>Voltar</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </>
      
      ) : (
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-230px)]">
          {/* Lista de ocorrências (à esquerda) */}
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
          
          {/* Lista de pendentes (no centro) */}
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
          
          {/* Lista de entregues (à direita) */}
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
          
          {/* Mapa (abaixo das listas) */}
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
      )}
      
      {/* Diálogo de confirmação para ocorrências */}
      <Dialog open={showOcorrenciaDialog} onOpenChange={setShowOcorrenciaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
            <DialogDescription>
              Informe o motivo da ocorrência para esta entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Descreva o motivo da ocorrência (ex: endereço não encontrado, cliente ausente, etc.)"
              value={ocorrenciaText}
              onChange={(e) => setOcorrenciaText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowOcorrenciaDialog(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleOcorrenciaSubmit}
            >
              Confirmar Ocorrência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Feedback visual para ações */}
      {showFeedback && (
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${feedbackType === 'success' ? 'bg-green-500' : feedbackType === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white font-medium`}>
          {feedbackMessage}
        </div>
      )}
      
      {/* Indicador visual para entregas marcadas como "voltar depois" */}
      {voltarDepoisList.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
          <Clock size={20} />
          <span className="absolute -top-2 -right-2 bg-white text-orange-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {voltarDepoisList.length}
          </span>
        </div>
      )}
    </>
  );
};

export default RouteViewSection;
