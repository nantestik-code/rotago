import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import DeliveryCard from './DeliveryCard';
import { Search, Filter, Check, AlertTriangle } from 'lucide-react';

interface DeliveryListProps {
  deliveries: DeliveryItem[];
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  onSelectDelivery: (id: string) => void;
  selectedDeliveryId: string | null;
  compactMode?: boolean;
}

const DeliveryList: React.FC<DeliveryListProps> = ({
  deliveries,
  onStatusChange,
  onSelectDelivery,
  selectedDeliveryId,
  compactMode = false,
}) => {
  // Refs for scrolling to selected delivery
  const listContainerRef = useRef<HTMLDivElement>(null);
  const deliveryItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'entregue' | 'ocorrencia'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Group deliveries by exact coordinates for multiple delivery detection
  const coordinateGroups = useMemo(() => {
    const groups: Record<string, {items: DeliveryItem[], indices: number[]}> = {};
    
    deliveries.forEach((delivery, index) => {
      if (!delivery.lat || !delivery.lng) return;
      
      // Use exact coordinates with 6 decimal places precision for grouping
      const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
      
      if (!groups[coordKey]) {
        groups[coordKey] = { items: [], indices: [] };
      }
      groups[coordKey].items.push(delivery);
      groups[coordKey].indices.push(index + 1); // Adding 1 to match the marker numbering
    });
    
    // Only keep groups with multiple items
    return Object.entries(groups)
      .filter(([_, data]) => data.items.length > 1)
      .reduce((acc, [key, data]) => {
        acc[key] = data;
        return acc;
      }, {} as Record<string, {items: DeliveryItem[], indices: number[]}>);
  }, [deliveries]);
  
  // Filtrar entregas com base no status selecionado e ordenar por sequence_number
  const filteredDeliveries = useMemo(() => {
    // Primeiro filtramos por status e busca
    const filtered = deliveries.filter(delivery => {
      // Filtro por status
      if (filter !== 'todos' && delivery.status !== filter) {
        return false;
      }
      
      // Filtro por busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          delivery.cliente.toLowerCase().includes(query) ||
          delivery.endereco.toLowerCase().includes(query) ||
          delivery.cidade.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
    
    // Depois ordenamos por sequence_number para mostrar na ordem otimizada
    return [...filtered].sort((a, b) => {
      const seqA = a.sequence_number || 999999; // Valor alto para itens sem sequence_number
      const seqB = b.sequence_number || 999999;
      return seqA - seqB;
    });
  }, [deliveries, filter, searchQuery]);

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

  // Effect to scroll to selected delivery when it changes
  useEffect(() => {
    if (selectedDeliveryId && deliveryItemRefs.current[selectedDeliveryId] && listContainerRef.current) {
      // Get the selected element
      const selectedElement = deliveryItemRefs.current[selectedDeliveryId];
      // Get the container
      const container = listContainerRef.current;
      
      // Calculate positions
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selectedElement.getBoundingClientRect();
      
      // Check if element is not fully visible
      const isFullyVisible = (
        selectedRect.top >= containerRect.top &&
        selectedRect.bottom <= containerRect.bottom
      );
      
      if (!isFullyVisible) {
        // Scroll the element into view with smooth behavior
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedDeliveryId]);

  return (
    <div className="flex flex-col h-full">
      {!compactMode && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={filter === 'todos' ? 'default' : 'outline'}
              onClick={() => setFilter('todos')}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={filter === 'pendente' ? 'default' : 'outline'}
              onClick={() => setFilter('pendente')}
              className="whitespace-nowrap"
            >
              Pendentes
            </Button>
            <Button
              size="sm"
              variant={filter === 'entregue' ? 'default' : 'outline'}
              onClick={() => setFilter('entregue')}
              className="whitespace-nowrap"
            >
              Entregues
            </Button>
            <Button
              size="sm"
              variant={filter === 'ocorrencia' ? 'default' : 'outline'}
              onClick={() => setFilter('ocorrencia')}
              className="whitespace-nowrap"
            >
              Ocorrências
            </Button>
          </div>
        </div>
      )}
      
      <div ref={listContainerRef} className={`flex-1 overflow-y-auto ${compactMode ? 'pr-0' : 'pr-1'}`}>
        {filteredDeliveries.length > 0 ? (
          compactMode ? (
            // Compact view - simplified list for when panel is minimized
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
              {filteredDeliveries
                .slice(0, 10) // Respeitando o filtro já aplicado anteriormente
                .map((delivery, index) => {
                  const realIndex = deliveries.findIndex(d => d.id === delivery.id);
                  const orderNumber = realIndex + 1;
                  
                  // Encontra todas as entregas no mesmo local
                  const sameLocationDeliveries = delivery.lat && delivery.lng ? 
                    deliveries.filter(d => 
                      d.lat && d.lng && 
                      d.lat.toFixed(6) === delivery.lat?.toFixed(6) && 
                      d.lng.toFixed(6) === delivery.lng?.toFixed(6)
                    ) : [];
                  
                  // Se tiver múltiplas entregas, prepara os números das ordens
                  const hasMultipleDeliveries = sameLocationDeliveries.length > 1;
                  const orderNumbers = hasMultipleDeliveries ? 
                    sameLocationDeliveries.map(d => deliveries.findIndex(item => item.id === d.id) + 1) : [];
                  
                  return (
                    <div 
                      key={delivery.id} 
                      ref={el => deliveryItemRefs.current[delivery.id] = el}
                      className={`flex-shrink-0 p-2 rounded-lg border ${selectedDeliveryId === delivery.id ? 'border-primary bg-primary/5 shadow-md' : hasMultipleDeliveries ? 'border-orange-200 bg-orange-50' : 'border-gray-200'} cursor-pointer snap-start min-w-[140px] max-w-[140px]`}
                      onClick={() => onSelectDelivery(delivery.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${hasMultipleDeliveries ? 'bg-orange-500' : 'bg-blue-500'} flex items-center justify-center text-white text-xs font-bold`}>
                          {orderNumber}
                        </div>
                        <div className="text-xs font-medium truncate max-w-[100px]">
                          {delivery.endereco.split(',')[0]}
                        </div>
                      </div>
                      
                      {hasMultipleDeliveries && (
                        <div className="text-[10px] text-orange-700 mt-1 font-medium">
                          Ordens: {orderNumbers.join(', ')}
                        </div>
                      )}
                      
                      <div className="text-[10px] text-gray-500 truncate mt-1">
                        {delivery.cliente}
                      </div>
                      
                      <div className="flex mt-2 gap-2 justify-center">
                        <Button 
                          size="sm" 
                          variant={delivery.status === 'entregue' ? 'default' : 'ghost'}
                          className={`h-7 w-7 p-0 rounded-full ${delivery.status === 'entregue' ? 'bg-green-500 hover:bg-green-600' : 'bg-green-100 hover:bg-green-200'}`}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            console.log('Marking delivery as delivered in compact view:', delivery.id);
                            onStatusChange(delivery.id, 'entregue'); 
                            
                            // If there are multiple deliveries at this location, update them all visually
                            if (hasMultipleDeliveries) {
                              const sameLocationDeliveries = deliveries.filter(d => 
                                d.lat && d.lng && delivery.lat && delivery.lng &&
                                d.lat.toFixed(6) === delivery.lat.toFixed(6) && 
                                d.lng.toFixed(6) === delivery.lng.toFixed(6)
                              );
                              
                              // Find the coordKey for this location
                              const coordKey = `${delivery.lat.toFixed(6)},${delivery.lng.toFixed(6)}`;
                              console.log('Updating multiple deliveries at location:', coordKey);
                            }
                          }}
                        >
                          <Check size={14} className={delivery.status === 'entregue' ? 'text-white' : 'text-green-700'} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-full bg-red-100 hover:bg-red-200"
                          onClick={(e) => { e.stopPropagation(); onStatusChange(delivery.id, 'ocorrencia'); }}
                        >
                          <AlertTriangle size={14} className="text-red-700" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              {filteredDeliveries.filter(d => d.status === 'pendente').length > 10 && (
                <div className="flex items-center justify-center px-3 text-xs text-gray-500 snap-end">
                  +{filteredDeliveries.filter(d => d.status === 'pendente').length - 10} mais
                </div>
              )}
            </div>
          ) : (
            // Full view - detailed list for when panel is expanded
            filteredDeliveries.map((delivery, index) => {
              // Usar o orderNumber original da entrega em vez de calcular pelo índice
              // Garantir que orderNumber seja um número para evitar erros de tipo
              const orderNumber = typeof delivery.orderNumber === 'number' ? delivery.orderNumber : (deliveries.findIndex(d => d.id === delivery.id) + 1);
              
              // Check if this delivery has multiple deliveries at the same location
              const { isMultiple, indices } = hasMultipleDeliveries(delivery);
              
              // Only show the multiple deliveries banner for the first item in the group
              const isFirstInGroup = isMultiple && 
                indices.includes(orderNumber) && 
                indices[0] === orderNumber;
              
              return (
                <div key={delivery.id} className="mb-3 relative">
                  {isMultiple && (
                    <div className="text-xs font-semibold py-1 px-2 bg-orange-100 text-orange-800 rounded mb-1">
                      {isFirstInGroup ? 
                        `Múltiplas entregas (Ordens: ${indices.join(', ')})` : 
                        `Parte de múltiplas entregas (Ordens: ${indices.join(', ')})`
                      }
                    </div>
                  )}
                  <DeliveryCard
                    ref={el => deliveryItemRefs.current[delivery.id] = el}
                    delivery={{
                      ...delivery,
                      cliente: `Ordem ${orderNumber}`
                    }}
                    isSelected={selectedDeliveryId === delivery.id}
                    onStatusChange={(id, status) => {
                      console.log('Delivery status change in desktop view:', id, status);
                      onStatusChange(id, status);
                      
                      // If this is part of a multiple delivery group, highlight that all deliveries at this location might be affected
                      if (isMultiple && status === 'entregue') {
                        // Log for debugging
                        console.log('Multiple deliveries at same location affected:', indices.join(', '));
                      }
                    }}
                    onSelect={onSelectDelivery}
                  />
                </div>
              );
            })
          )
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhuma entrega encontrada com os filtros atuais.
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryList;
