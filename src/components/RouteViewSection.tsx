
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition, calculateDistance } from '@/utils/mapUtils';
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
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia', onDeliveryCompleted?: (nextDeliveryId: string | null) => void) => void;
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
  onFinishRoute?: () => void;
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
  onBackToImport,
  onFinishRoute
}) => {
  // Estado compartilhado para controlar a aba ativa em ambos os layouts (mobile e desktop)
  const [activeTab, setActiveTab] = useState<'pendente' | 'entregue' | 'ocorrencia'>('pendente');
  
  // Log para depuração das entregas recebidas
  console.log('RouteViewSection - Entregas recebidas:', deliveries.length, deliveries);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [sheetPosition, setSheetPosition] = useState('default'); // 'minimized', 'default', 'maximized'
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  
  // Referências para elementos
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  // Calcular altura da lista quando o componente montar e quando a orientação mudar
  useEffect(() => {
    if (isMobile && sheetRef.current) {
      const updateSheetHeight = () => {
        const viewportHeight = window.innerHeight;
        setSheetHeight(viewportHeight * 0.6); // 60% da altura da tela
        
        // Reset para posição padrão quando a orientação mudar
        setSheetPosition('default');
        setCurrentY(0);
      };
      
      updateSheetHeight();
      window.addEventListener('resize', updateSheetHeight);
      window.addEventListener('orientationchange', updateSheetHeight);
      
      return () => {
        window.removeEventListener('resize', updateSheetHeight);
        window.removeEventListener('orientationchange', updateSheetHeight);
      };
    }
  }, [isMobile]);
  
  // Prevenir que o body role quando a lista estiver sendo arrastada
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDragging]);
  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState(false);
  const [ocorrenciaText, setOcorrenciaText] = useState('');
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState(0);

  // Sincronizar lista horizontal quando entrega for selecionada no mapa
  useEffect(() => {
    if (selectedDeliveryId && deliveries.length > 0) {
      const selectedIndex = deliveries.findIndex(d => d.id === selectedDeliveryId);
      if (selectedIndex !== -1) {
        setCurrentDeliveryIndex(selectedIndex);
        // Scroll automático para a parada correta na lista horizontal
        const container = document.querySelector('.flex.overflow-x-auto.snap-x');
        if (container) {
          const cardWidth = container.clientWidth;
          container.scrollTo({
            left: selectedIndex * cardWidth,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedDeliveryId, deliveries]);

  useEffect(() => {
    if (!currentLocation || selectedDeliveryId) return;
    const pendings = deliveries.filter(d => d.status === 'pendente' && d.lat && d.lng);
    if (pendings.length === 0) return;
    let nearest = pendings[0];
    let best = calculateDistance(currentLocation.lat, currentLocation.lng, nearest.lat!, nearest.lng!);
    for (let i = 1; i < pendings.length; i++) {
      const d = pendings[i];
      const dist = calculateDistance(currentLocation.lat, currentLocation.lng, d.lat!, d.lng!);
      if (dist < best) {
        best = dist;
        nearest = d;
      }
    }
    onSelectDelivery(nearest.id);
    setActiveTab('pendente');
  }, [currentLocation, deliveries, selectedDeliveryId]);

  useEffect(() => {
    if (!selectedDeliveryId) return;
    const sel = deliveries.find(d => d.id === selectedDeliveryId);
    if (!sel) return;
    const status = sel.status as 'pendente' | 'entregue' | 'ocorrencia';
    if (status !== activeTab) setActiveTab(status);
  }, [selectedDeliveryId, deliveries]);

  // Filtrar entregas por status
  const pendingDeliveries = deliveries.filter(d => d.status === 'pendente');
  const deliveredDeliveries = deliveries.filter(d => d.status === 'entregue');
  const occurrenceDeliveries = deliveries.filter(d => d.status === 'ocorrencia');

  // Agrupar entregas pendentes por localização (mesmo endereço/coordenadas)
  const groupedPendingDeliveries = useMemo(() => {
    const groups: { [key: string]: DeliveryItem[] } = {};
    
    pendingDeliveries.forEach(delivery => {
      // Criar chave única baseada no endereço completo
      const locationKey = `${delivery.endereco}-${delivery.cidade}-${delivery.cep}`.toLowerCase().trim();
      
      if (!groups[locationKey]) {
        groups[locationKey] = [];
      }
      groups[locationKey].push(delivery);
    });
    
    // Converter grupos em array e ordenar por sequence_number
    return Object.values(groups).map(group => {
      return group.sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
    }).sort((a, b) => (a[0].sequence_number || 0) - (b[0].sequence_number || 0));
  }, [pendingDeliveries]);

  // Próxima entrega (primeira pendente)
  const nextDelivery = pendingDeliveries[0];

  const handleStatusChange = (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    console.log('RouteViewSection: Changing delivery status:', id, 'to', status);
    console.log('RouteViewSection: Estado atual das entregas:', {
      total: deliveries.length,
      pendentes: deliveries.filter(d => d.status === 'pendente').length,
      entregues: deliveries.filter(d => d.status === 'entregue').length,
      ocorrencias: deliveries.filter(d => d.status === 'ocorrencia').length
    });
    
    if (status === 'ocorrencia') {
      setCurrentDeliveryId(id);
      setShowOcorrenciaDialog(true);
      return;
    }
    
    // Encontrar a entrega para atualização
    const deliveryToUpdate = deliveries.find(d => d.id === id);
    if (!deliveryToUpdate) {
      console.error(`RouteViewSection: Entrega com ID ${id} não encontrada`);
      return;
    }
    
    // Registrar o status anterior para verificação
    const previousStatus = deliveryToUpdate.status;
    console.log(`RouteViewSection: Alterando status da entrega ${id} de ${previousStatus} para ${status}`);
    
    // IMPORTANTE: Primeiro mostrar feedback para melhor UX
    let message = 'Status atualizado!';
    if (status === 'entregue') {
      // Encontrar a entrega e seu número de ordem real
      const delivery = deliveries.find(d => d.id === id);
      // Usar o orderNumber se disponível, ou o índice + 1 como fallback
      const orderNum = delivery?.orderNumber || 
                     (delivery ? deliveries.findIndex(d => d.id === delivery.id) + 1 : '?');
      message = `Entrega concluída, ordem ${orderNum}`;
    }
    setFeedbackMessage(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
    
    // IMPORTANTE: Criar uma cópia local atualizada da entrega para verificação
    const updatedDelivery = {
      ...deliveryToUpdate,
      status: status
    };
    
    // Chamar o handler pai para atualizar o estado global
    // Se for uma entrega concluída, passar callback para navegação automática
    if (status === 'entregue') {
      onStatusChange(id, status, (nextDeliveryId: string | null) => {
        try {
          const latest = JSON.parse(localStorage.getItem('currentRouteDeliveries') || '[]');
          const pendings = (Array.isArray(latest) && latest.length > 0 ? latest : deliveries)
            .filter((d: DeliveryItem) => d.status === 'pendente');
          let nextId: string | null = null;
          if (pendings.length > 0) {
            if (currentLocation) {
              let nearest = pendings.find(d => d.lat && d.lng);
              if (nearest && nearest.lat && nearest.lng) {
                let best = calculateDistance(currentLocation.lat, currentLocation.lng, nearest.lat, nearest.lng);
                pendings.forEach(d => {
                  if (d.lat && d.lng) {
                    const dist = calculateDistance(currentLocation.lat, currentLocation.lng, d.lat, d.lng);
                    if (dist < best) {
                      best = dist;
                      nearest = d;
                    }
                  }
                });
                nextId = nearest.id;
              }
            }
            if (!nextId) {
              pendings.sort((a: DeliveryItem, b: DeliveryItem) => {
                const seqA = Number(a.sequence_number || a.orderNumber || 0);
                const seqB = Number(b.sequence_number || b.orderNumber || 0);
                return seqA - seqB;
              });
              nextId = pendings[0].id;
            }
          }
          if (!nextId) {
            nextId = nextDeliveryId || null;
          }
          if (nextId) {
            onSelectDelivery(nextId);
            setActiveTab('pendente');
          } else {
            setActiveTab('entregue');
          }
        } catch {
          setActiveTab('pendente');
        }
      });
    } else {
      // Para outros status, comportamento normal
      onStatusChange(id, status);
      setActiveTab(status);
    }
    
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
    
    // Criar o endereço formatado para melhor compatibilidade
    const address = encodeURIComponent(
      `${delivery.endereco || ''}, ${delivery.numero || ''}, ${delivery.bairro || ''}, ${delivery.cidade || ''}`
    );
    
    // Log para debug
    console.log('Abrindo navegação para:', { lat, lng, address, userAgent });
    
    try {
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        // iOS - tentar com endereço e coordenadas como fallback
        window.location.href = `maps://maps.apple.com/?q=${address}&ll=${lat},${lng}`;
      } else if (/android/i.test(userAgent)) {
        // Android - usar intent com fallback para Google Maps
        window.location.href = `google.navigation:q=${lat},${lng}`;
        
        // Fallback se o primeiro método não funcionar
        setTimeout(() => {
          window.location.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }, 500);
      } else {
        // Desktop e outros dispositivos
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      }
    } catch (error) {
      console.error('Erro ao abrir navegação:', error);
      // Fallback universal
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
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
          {/* Header Mobile Fixo */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm shadow-sm mobile-header">
            <div className="flex items-center gap-2">
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
              
              {onFinishRoute && (
                <Button
                  onClick={onFinishRoute}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Check size={16} />
                  <span className="hidden sm:inline">Finalizar</span>
                </Button>
              )}
            </div>
            
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

          {/* Layout para mobile com mapa e lista suspensa arrastável */}
          <div className="flex flex-col h-screen pt-20 relative">
            {/* Mapa em tela cheia */}
            <div className="h-full rounded-md overflow-hidden">
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
            
            {/* Lista de entregas suspensa arrastável */}
            <div 
              ref={sheetRef}
              className={`absolute bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-xl shadow-lg transition-transform duration-300 ease-out ${
                sheetPosition === 'minimized' ? 'translate-y-[70%]' : 
                sheetPosition === 'maximized' ? 'translate-y-0' : 
                'translate-y-[30%]'
              }`}
              style={{
                height: sheetHeight ? `${sheetHeight}px` : '60%',
                transform: isDragging ? `translateY(${currentY}px)` : undefined,
                transition: isDragging ? 'none' : 'transform 300ms ease-out',
                zIndex: 50
              }}
              onTouchStart={(e) => {
                if (dragHandleRef.current?.contains(e.target as Node)) {
                  setStartY(e.touches[0].clientY);
                  setIsDragging(true);
                  e.preventDefault();
                }
              }}
              onTouchMove={(e) => {
                if (isDragging) {
                  const deltaY = e.touches[0].clientY - startY;
                  // Limitar o arraste para não ultrapassar os limites
                  const maxUp = sheetPosition === 'default' ? -(sheetHeight * 0.3) : 0;
                  const maxDown = sheetPosition === 'default' ? (sheetHeight * 0.4) : (sheetPosition === 'minimized' ? 0 : (sheetHeight * 0.7));
                  
                  const limitedDelta = Math.max(maxUp, Math.min(deltaY, maxDown));
                  setCurrentY(limitedDelta);
                  e.preventDefault();
                }
              }}
              onTouchEnd={(e) => {
                if (isDragging) {
                  setIsDragging(false);
                  
                  // Determinar a nova posição com base no movimento
                  const threshold = sheetHeight * 0.15;
                  
                  if (currentY > threshold) {
                    // Arrastar para baixo
                    if (sheetPosition === 'maximized') {
                      setSheetPosition('default');
                    } else if (sheetPosition === 'default') {
                      setSheetPosition('minimized');
                    }
                  } else if (currentY < -threshold) {
                    // Arrastar para cima
                    if (sheetPosition === 'minimized') {
                      setSheetPosition('default');
                    } else if (sheetPosition === 'default') {
                      setSheetPosition('maximized');
                    }
                  }
                  
                  setCurrentY(0);
                  e.preventDefault();
                }
              }}
              // Suporte para mouse também
              onMouseDown={(e) => {
                if (dragHandleRef.current?.contains(e.target as Node)) {
                  setStartY(e.clientY);
                  setIsDragging(true);
                }
              }}
              onMouseMove={(e) => {
                if (isDragging) {
                  const deltaY = e.clientY - startY;
                  const maxUp = sheetPosition === 'default' ? -(sheetHeight * 0.3) : 0;
                  const maxDown = sheetPosition === 'default' ? (sheetHeight * 0.4) : (sheetPosition === 'minimized' ? 0 : (sheetHeight * 0.7));
                  
                  const limitedDelta = Math.max(maxUp, Math.min(deltaY, maxDown));
                  setCurrentY(limitedDelta);
                }
              }}
              onMouseUp={() => {
                if (isDragging) {
                  setIsDragging(false);
                  
                  const threshold = sheetHeight * 0.15;
                  
                  if (currentY > threshold) {
                    if (sheetPosition === 'maximized') {
                      setSheetPosition('default');
                    } else if (sheetPosition === 'default') {
                      setSheetPosition('minimized');
                    }
                  } else if (currentY < -threshold) {
                    if (sheetPosition === 'minimized') {
                      setSheetPosition('default');
                    } else if (sheetPosition === 'default') {
                      setSheetPosition('maximized');
                    }
                  }
                  
                  setCurrentY(0);
                }
              }}
              onMouseLeave={() => {
                if (isDragging) {
                  setIsDragging(false);
                  setCurrentY(0);
                }
              }}
            >
              {/* Indicador de arraste */}
              <div 
                ref={dragHandleRef}
                className="drag-handle w-full h-8 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing mx-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mb-1"></div>
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                {sheetPosition === 'minimized' && (
                  <div className="text-xs text-gray-400 mt-1">Arraste para cima</div>
                )}
                {sheetPosition === 'maximized' && (
                  <div className="text-xs text-gray-400 mt-1">Arraste para baixo</div>
                )}
              </div>
              
              {/* Abas de navegação */}
              <div className="flex flex-wrap gap-1 space-x-1 mb-2 border-b border-gray-200 pb-2 overflow-x-auto px-2">
                <button 
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center whitespace-nowrap ${activeTab === 'pendente' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('pendente')}
                >
                  <Clock size={14} className="mr-1 text-blue-500" />
                  <span>Pend.</span>
                  <span className="ml-1">({pendingDeliveries.length || deliveries.length})</span>
                </button>
                <button 
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center whitespace-nowrap ${activeTab === 'entregue' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('entregue')}
                >
                  <Check size={14} className="mr-1 text-green-500" />
                  <span>Entr.</span>
                  <span className="ml-1">({deliveredDeliveries.length})</span>
                </button>
                <button 
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center whitespace-nowrap ${activeTab === 'ocorrencia' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('ocorrencia')}
                >
                  <AlertTriangle size={14} className="mr-1 text-red-500" />
                  <span>Ocor.</span>
                  <span className="ml-1">({occurrenceDeliveries.length})</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-1 touch-auto overscroll-contain">
                {/* Renderizar apenas a lista ativa selecionada */}
                {activeTab === 'pendente' && (
                  <div className="relative">
                    <div 
                      className="flex overflow-x-auto snap-x snap-mandatory" 
                      style={{ 
                        scrollbarWidth: 'none', 
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      {pendingDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="flex-none w-full snap-start">
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold relative ${
                                    delivery.id === selectedDeliveryId ? 'bg-blue-500 text-white ring-2 ring-blue-200' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    #{delivery.sequence_number || index + 1}
                                    {/* Verificar se há entregas múltiplas no mesmo endereço */}
                                    {pendingDeliveries.filter(d => d.lat === delivery.lat && d.lng === delivery.lng).length > 1 && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">
                                        {pendingDeliveries.filter(d => d.lat === delivery.lat && d.lng === delivery.lng).length}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate text-sm">{delivery.endereco}</h3>
                                    <p className="text-xs text-gray-500 truncate">{delivery.bairro && `${delivery.bairro}, `}{delivery.cidade}</p>
                                    {/* Sempre mostrar o número da ordem */}
                                    <p className="text-xs text-blue-600 font-medium">
                                      📦 Ordem: #{delivery.sequence_number || delivery.orderNumber || deliveries.findIndex(del => del.id === delivery.id) + 1} | 🚩 Parada: #{delivery.orderNumber || delivery.sequence_number || deliveries.findIndex(del => del.id === delivery.id) + 1}
                                    </p>
                                    {/* Mostrar outras ordens no mesmo endereço se houver múltiplas */}
                                    {pendingDeliveries.filter(d => d.lat === delivery.lat && d.lng === delivery.lng).length > 1 && (
                                      <p className="text-xs text-orange-600 font-medium">
                                        📍 Entregas múltiplas: {pendingDeliveries
                                          .filter(d => d.lat === delivery.lat && d.lng === delivery.lng)
                                          .map(d => `#${d.orderNumber || d.sequence_number || deliveries.findIndex(del => del.id === d.id) + 1}`)
                                          .join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {delivery.observacoes && (
                                  <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1 truncate">💬 {delivery.observacoes}</p>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center justify-center space-x-1 h-10 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                onClick={(e) => { e.stopPropagation(); openNavigation(delivery); }}
                                disabled={!delivery.lat || !delivery.lng}
                              >
                                <Navigation size={14} />
                                <span>Navegar</span>
                              </Button>
                              <Button
                                size="sm"
                                className="flex items-center justify-center space-x-1 h-10 text-xs bg-green-500 hover:bg-green-600 text-white"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(delivery.id, 'entregue'); }}
                              >
                                <Check size={14} />
                                <span>Entregue</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center justify-center space-x-1 h-10 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                onClick={(e) => { e.stopPropagation(); handleOcorrenciaClick(delivery.id); }}
                              >
                                <AlertTriangle size={14} />
                                <span>Problema</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {pendingDeliveries.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                        {pendingDeliveries.map((delivery, index) => (
                          <div 
                            key={index} 
                            className={`w-2 h-2 rounded-full transition-colors ${
                              delivery.id === selectedDeliveryId ? 'bg-blue-500' : 'bg-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'entregue' && (
                  <div className="delivery-cards space-y-3">
                    {deliveredDeliveries.length > 0 ? deliveredDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="mobile-delivery-card delivered bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="card-header">
                            <div className="delivery-number delivered w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-medium mr-2">{delivery.sequence_number || delivery.orderNumber || (index + 1)}</div>
                            <div className="delivery-info">
                              <h3 className="truncate">{delivery.endereco.split(',')[0]}</h3>
                              <p className="truncate">{delivery.cidade}</p>
                              <p className="truncate text-xs text-blue-600">Ordem: {delivery.sequence_number || '?'} • Parada: #{delivery.orderNumber || delivery.sequence_number || (index + 1)}</p>
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
                            <div className="delivery-number occurrence w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-medium mr-2">{delivery.sequence_number || delivery.orderNumber || (index + 1)}</div>
                            <div className="delivery-info">
                              <h3 className="truncate">{delivery.endereco.split(',')[0]}</h3>
                              <p className="truncate">{delivery.cidade}</p>
                              <p className="truncate text-xs text-blue-600">Ordem: {delivery.sequence_number || '?'} • Parada: #{delivery.orderNumber || delivery.sequence_number || (index + 1)}</p>
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
        </div>
      ) : (
        // Layout desktop
        <div className="desktop-route-view">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-semibold">Rota Otimizada</h2>
              <div className="flex gap-2">
                {onFinishRoute && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={onFinishRoute}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check size={16} />
                    Finalizar Rota
                  </Button>
                )}
                {onBackToImport && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onBackToImport}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft size={16} />
                    <FileUp size={16} />
                    Nova Rota
                  </Button>
                )}
              </div>
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
                  {activeTab === 'pendente' && (
                    <div className="relative">
                      <div 
                        className="flex overflow-x-auto snap-x snap-mandatory" 
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                      >
                        {pendingDeliveries.map((delivery, index) => (
                          <div key={delivery.id} className="flex-none w-full snap-start">
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold relative ${delivery.id === selectedDeliveryId ? 'bg-blue-500 text-white ring-2 ring-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                                      #{delivery.sequence_number || index + 1}
                                      {pendingDeliveries.filter(d => d.lat === delivery.lat && d.lng === delivery.lng).length > 1 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">
                                          {pendingDeliveries.filter(d => d.lat === delivery.lat && d.lng === delivery.lng).length}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-gray-900 truncate text-sm">{delivery.endereco}</h3>
                                      <p className="text-xs text-gray-500 truncate">{delivery.bairro && `${delivery.bairro}, `}{delivery.cidade}</p>
                                      <p className="text-xs text-blue-600 font-medium">📦 Ordem: #{delivery.sequence_number || delivery.orderNumber || deliveries.findIndex(del => del.id === delivery.id) + 1} | 🚩 Parada: #{delivery.orderNumber || delivery.sequence_number || deliveries.findIndex(del => del.id === delivery.id) + 1}</p>
                                      {pendingDeliveries.filter(d => d.lat === delivery.lat && d.lng === delivery.lng).length > 1 && (
                                        <p className="text-xs text-orange-600 font-medium">
                                          📍 Entregas múltiplas: {pendingDeliveries
                                            .filter(d => d.lat === delivery.lat && d.lng === delivery.lng)
                                            .map(d => `#${d.orderNumber || d.sequence_number || deliveries.findIndex(del => del.id === d.id) + 1}`)
                                            .join(', ')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {delivery.observacoes && (
                                    <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1 truncate">💬 {delivery.observacoes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <Button size="sm" variant="outline" className="flex items-center justify-center space-x-1 h-10 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); openNavigation(delivery); }} disabled={!delivery.lat || !delivery.lng}>
                                  <Navigation size={14} />
                                  <span>Navegar</span>
                                </Button>
                                <Button size="sm" className="flex items-center justify-center space-x-1 h-10 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={(e) => { e.stopPropagation(); handleStatusChange(delivery.id, 'entregue'); }}>
                                  <Check size={14} />
                                  <span>Entregue</span>
                                </Button>
                                <Button size="sm" variant="outline" className="flex items-center justify-center space-x-1 h-10 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleOcorrenciaClick(delivery.id); }}>
                                  <AlertTriangle size={14} />
                                  <span>Problema</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {pendingDeliveries.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                          {pendingDeliveries.map((delivery, index) => (
                            <div key={index} className={`w-2 h-2 rounded-full transition-colors ${delivery.id === selectedDeliveryId ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'entregue' && (
                    <div className="p-2 space-y-2 overflow-y-auto h-full">
                      {deliveredDeliveries.length === 0 && (
                        <div className="text-sm text-gray-500 italic p-4">Nenhuma entrega concluída</div>
                      )}
                      {deliveredDeliveries.map((delivery, index) => (
                        <div key={delivery.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{delivery.endereco}</div>
                            <div className="text-xs text-gray-500 truncate">📦 Ordem: #{delivery.sequence_number || delivery.orderNumber} | 🚩 Parada: #{delivery.orderNumber || delivery.sequence_number}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => onStatusChange(delivery.id, 'pendente')}>
                            Desfazer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'ocorrencia' && (
                    <div className="p-2 space-y-2 overflow-y-auto h-full">
                      {occurrenceDeliveries.length === 0 && (
                        <div className="text-sm text-gray-500 italic p-4">Nenhuma ocorrência registrada</div>
                      )}
                      {occurrenceDeliveries.map((delivery) => (
                        <div key={delivery.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{delivery.endereco}</div>
                            <div className="text-xs text-gray-500 truncate">📦 Ordem: #{delivery.sequence_number || delivery.orderNumber} | 🚩 Parada: #{delivery.orderNumber || delivery.sequence_number}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => onStatusChange(delivery.id, 'pendente')}>
                            Desfazer
                          </Button>
                        </div>
                      ))}
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
