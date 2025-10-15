
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import DeliveryCard from './DeliveryCard';
import { Search, Filter, Check, AlertTriangle } from 'lucide-react';
import './delivery-list.css'; // Will create this file next

interface DeliveryListProps {
  deliveries: DeliveryItem[];
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  onSelectDelivery: (id: string) => void;
  selectedDeliveryId: string | null;
  compactMode?: boolean;
  status?: 'pendente' | 'entregue' | 'ocorrencia';
}

const DeliveryList: React.FC<DeliveryListProps> = ({
  deliveries,
  onStatusChange,
  onSelectDelivery,
  selectedDeliveryId,
  compactMode = false,
  status,
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const deliveryItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'entregue' | 'ocorrencia'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Group deliveries by exact coordinates for multiple delivery detection
  const coordinateGroups = useMemo(() => {
    const groups: Record<string, {items: DeliveryItem[], indices: number[]}> = {};
    
    deliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      
      if (!groups[coordKey]) {
        groups[coordKey] = { items: [], indices: [] };
      }
      groups[coordKey].items.push(delivery);
      groups[coordKey].indices.push(index + 1);
    });
    
    return Object.entries(groups)
      .filter(([_, data]) => data.items.length > 1)
      .reduce((acc, [key, data]) => {
        acc[key] = data;
        return acc;
      }, {} as Record<string, {items: DeliveryItem[], indices: number[]}>);
  }, [deliveries]);
  
  // Filter deliveries and sort by sequence_number
  const filteredDeliveries = useMemo(() => {
    // Adicionar log para debug
    console.log(`DeliveryList - status: ${status}, filter: ${filter}, deliveries recebidas: ${deliveries.length}`);
    
    // Log detalhado para depuração
    console.log('DeliveryList - Status de todas as entregas:', 
      deliveries.map(d => ({ id: d.id, cliente: d.cliente, status: d.status })));
      
    // DEBUG: Log para verificar se há entregas com status 'entregue'
    const entregues = deliveries.filter(d => d.status === 'entregue');
    console.log(`DeliveryList - Entregas com status 'entregue': ${entregues.length}`, 
      entregues.map(d => ({ id: d.id, cliente: d.cliente })));
    
    // Se não houver entregas, retornar array vazio
    if (!deliveries || deliveries.length === 0) {
      console.log('DeliveryList - Nenhuma entrega recebida');
      return [];
    }
    
    let filtered = [...deliveries];
    
    // Aplicar filtro de status - SEMPRE filtrar pelo status definido nas props
    if (status) {
      // Filtrar estritamente por status quando definido nas props
      filtered = filtered.filter(delivery => delivery.status === status);
      console.log(`DeliveryList - Filtrado por status ${status}: ${filtered.length} entregas`);
    } else if (filter !== 'todos') {
      // Quando status não está definido, aplicar filtro local
      filtered = filtered.filter(delivery => {
        if (filter === 'pendente') return delivery.status === 'pendente';
        if (filter === 'entregue') return delivery.status === 'entregue';
        if (filter === 'ocorrencia') return delivery.status === 'ocorrencia';
        return true;
      });
    }
    
    // Aplicar filtro de busca se houver um termo de pesquisa
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(delivery => {
        return (
          (delivery.cliente?.toLowerCase() || '').includes(query) ||
          (delivery.endereco?.toLowerCase() || '').includes(query) ||
          (delivery.cidade?.toLowerCase() || '').includes(query)
        );
      });
    }
    
    // Adicionar log para debug
    console.log(`DeliveryList - entregas filtradas: ${filtered.length}`);
    
    // Ordenar por número de sequência
    return filtered.sort((a, b) => {
      const seqA = a.sequence_number || 999999;
      const seqB = b.sequence_number || 999999;
      return seqA - seqB;
    });
  }, [deliveries, filter, searchQuery, status]);

  // Function to check if a delivery has multiple deliveries at the same location
  const hasMultipleDeliveries = (delivery: DeliveryItem): {isMultiple: boolean, indices: number[]} => {
    if (!delivery.lat || !delivery.lng) return {isMultiple: false, indices: []};
    
    const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
    const group = coordinateGroups[coordKey];
    
    if (group && group.items.length > 1) {
      return {isMultiple: true, indices: group.indices};
    }
    
    return {isMultiple: false, indices: []};
  };

  // Enhanced status change handler with proper logging and UI feedback
  const handleStatusChange = (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    console.log('DeliveryList: Status change requested for delivery:', id, 'to status:', status);
    
    // Adicionar feedback visual imediato para o clique do botão
    const deliveryElement = deliveryItemRefs.current[id];
    if (deliveryElement) {
      // Adicionar efeito de destaque
      deliveryElement.classList.add('status-change-highlight');
      
      // Adicionar classe específica para o tipo de status
      if (status === 'entregue') {
        deliveryElement.classList.add('status-entregue');
      } else if (status === 'ocorrencia') {
        deliveryElement.classList.add('status-ocorrencia');
      }
      
      // Remover classes após a animação
      setTimeout(() => {
        deliveryElement.classList.remove('status-change-highlight');
        deliveryElement.classList.remove('status-entregue');
        deliveryElement.classList.remove('status-ocorrencia');
      }, 800);
    }
    
    // Chamar o manipulador pai para atualizar o estado
    console.log(`DeliveryList: Chamando onStatusChange(${id}, ${status})`);
    
    // Importante: Verificar se a entrega existe antes de continuar
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) {
      console.error(`Entrega com ID ${id} não encontrada`);
      return;
    }
    
    // Chamar o manipulador pai para atualizar o estado global
    onStatusChange(id, status);
    
    // IMPORTANTE: Forçar uma re-renderização imediata da lista para garantir que a UI seja atualizada
    // Isso é crucial para que a entrega seja movida para a lista correta
    setTimeout(() => {
      console.log('Forçando re-renderização imediata após mudança de status');
      
      // Mudar o filtro temporariamente para forçar uma re-renderização completa
      const currentFilter = filter;
      setFilter('todos');
      
      // Mudar o termo de busca temporariamente
      const currentQuery = searchQuery;
      setSearchQuery(currentQuery + ' ');
      
      // Restaurar os valores originais após um curto atraso
      setTimeout(() => {
        setFilter(currentFilter);
        setSearchQuery(currentQuery);
        
        // Forçar mais uma re-renderização após um tempo maior
        setTimeout(() => {
          console.log('Forçando re-renderização final para garantir atualização da UI');
          // Alterar e restaurar rapidamente para forçar atualização
          setFilter('todos');
          setTimeout(() => setFilter(currentFilter), 10);
        }, 300);
      }, 50);
    }, 10);
    
    // Verificar se a entrega foi realmente atualizada no estado local
    setTimeout(() => {
      const updatedDelivery = deliveries.find(d => d.id === id);
      if (updatedDelivery && updatedDelivery.status !== status) {
        console.error(`Erro de sincronização: Entrega ${id} deveria ter status ${status} mas tem ${updatedDelivery.status}`);
        // Tentar forçar uma atualização manual
        console.log('Tentando forçar atualização manual do status');
        onStatusChange(id, status);
      } else {
        console.log(`Verificação de sincronização: Entrega ${id} tem status ${status} como esperado`);
      }
    }, 500);
  };

  // Effect to scroll to selected delivery when it changes
  useEffect(() => {
    if (selectedDeliveryId && deliveryItemRefs.current[selectedDeliveryId] && listContainerRef.current) {
      const selectedElement = deliveryItemRefs.current[selectedDeliveryId];
      const container = listContainerRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selectedElement.getBoundingClientRect();
      
      const isFullyVisible = (
        selectedRect.top >= containerRect.top &&
        selectedRect.bottom <= containerRect.bottom
      );
      
      if (!isFullyVisible) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedDeliveryId]);

  return (
    <div className="flex flex-col h-full">
      {!compactMode && (
        <div className="flex flex-col space-y-2 mb-2 sm:mb-3 px-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="text-sm font-medium text-gray-700 flex items-center">
              <span className="bg-gray-100 px-2 py-1 rounded-md">
                {filteredDeliveries.length} {filteredDeliveries.length === 1 ? 'entrega' : 'entregas'}
              </span>
            </div>
            <div className="flex items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-48 md:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por endereço..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full text-sm h-9"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 -mx-2 px-2">
            <Button
              size="sm"
              variant={filter === 'todos' ? 'default' : 'outline'}
              onClick={() => setFilter('todos')}
              className="whitespace-nowrap text-xs min-w-[60px] h-8"
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={filter === 'pendente' ? 'default' : 'outline'}
              onClick={() => setFilter('pendente')}
              className="whitespace-nowrap text-xs min-w-[60px] h-8"
            >
              Pendentes
            </Button>
            <Button
              size="sm"
              variant={filter === 'entregue' ? 'default' : 'outline'}
              onClick={() => setFilter('entregue')}
              className="whitespace-nowrap text-xs min-w-[60px] h-8"
            >
              Entregues
            </Button>
            <Button
              size="sm"
              variant={filter === 'ocorrencia' ? 'default' : 'outline'}
              onClick={() => setFilter('ocorrencia')}
              className="whitespace-nowrap text-xs min-w-[60px] h-8"
            >
              Ocorrências
            </Button>
          </div>
        </div>
      )}
      
      <div ref={listContainerRef} className={`flex-1 overflow-y-auto overflow-x-hidden ${compactMode ? 'pr-0' : 'pr-1'} relative`}>
        {/* Debug para verificar as entregas filtradas */}
        {/* Debug para verificar as entregas filtradas */}
        {filteredDeliveries.length > 0 && (
          <div className="hidden">
            {`DeliveryList - filteredDeliveries: ${filteredDeliveries.length}`}
          </div>
        )}
        
        {filteredDeliveries.length > 0 ? (
          <div className="py-2 px-1 lg:px-2">
            {filteredDeliveries.map((delivery, index) => {
              // Usar o orderNumber original da planilha, não o índice calculado
              const orderNumber = delivery.orderNumber || delivery.sequence_number || (index + 1);
              const { isMultiple, indices } = hasMultipleDeliveries(delivery);
              
              return (
                <div 
                  key={delivery.id} 
                  ref={el => deliveryItemRefs.current[delivery.id] = el}
                  className={`mb-2 border-l-4 ${delivery.status === 'pendente' ? 'border-l-blue-500' : delivery.status === 'entregue' ? 'border-l-green-500' : 'border-l-red-500'} ${selectedDeliveryId === delivery.id ? 'bg-gray-50 ring-2 ring-blue-200' : 'bg-white'} rounded shadow-sm hover:shadow-md transition-all`}
                  onClick={(e) => {
                    // Verificar se o clique foi em um botão ou em seus filhos
                    const target = e.target as HTMLElement;
                    const isButtonClick = target.tagName === 'BUTTON' || 
                                          target.tagName === 'svg' || 
                                          target.tagName === 'path' || 
                                          target.tagName === 'polyline' || 
                                          target.tagName === 'circle' ||
                                          target.closest('button');
                    
                    // Se não for um clique em botão, selecionar a entrega
                    if (!isButtonClick) {
                      onSelectDelivery(delivery.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-selected={selectedDeliveryId === delivery.id}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDelivery(delivery.id);
                    }
                  }}
                >
                  <div className="p-2 sm:p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-sm mr-2">#{orderNumber}</span>
                        {isMultiple && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">
                            Múltipla
                          </span>
                        )}
                      </div>
                      <div className="text-sm truncate font-medium">
                        {delivery.endereco || 'Sem endereço'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {delivery.bairro ? `${delivery.bairro}${delivery.cidade ? `, ${delivery.cidade}` : ''}` : (delivery.cidade || 'Sem localização')}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 sm:space-x-2">
                      {delivery.status !== 'pendente' && (
                        <button 
                          className="p-2 sm:p-1.5 rounded-full text-blue-600 hover:bg-blue-50 active:bg-blue-100 border border-blue-100 touch-manipulation"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleStatusChange(delivery.id, 'pendente');
                          }}
                          title="Marcar como pendente"
                          aria-label="Marcar como pendente"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </button>
                      )}
                      
                      {delivery.status !== 'entregue' && (
                        <button 
                          className="p-2 sm:p-1.5 rounded-full text-green-600 hover:bg-green-50 active:bg-green-100 border border-green-100 touch-manipulation"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleStatusChange(delivery.id, 'entregue');
                          }}
                          title="Marcar como entregue"
                          aria-label="Marcar como entregue"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </button>
                      )}
                      
                      {delivery.status !== 'ocorrencia' && (
                        <button 
                          className="p-2 sm:p-1.5 rounded-full text-red-600 hover:bg-red-50 active:bg-red-100 border border-red-100 touch-manipulation"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleStatusChange(delivery.id, 'ocorrencia');
                          }}
                          title="Marcar como ocorrência"
                          aria-label="Marcar como ocorrência"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500 text-sm">
            Nenhuma entrega encontrada.
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryList;
