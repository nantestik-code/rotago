
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
    const filtered = deliveries.filter(delivery => {
      if (filter !== 'todos' && delivery.status !== filter) {
        return false;
      }
      
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
    
    return [...filtered].sort((a, b) => {
      const seqA = a.sequence_number || 999999;
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

  // Enhanced status change handler with proper logging
  const handleStatusChange = (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    console.log('DeliveryList: Status change requested for delivery:', id, 'to status:', status);
    onStatusChange(id, status);
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
          filteredDeliveries.map((delivery, index) => {
            const realIndex = deliveries.findIndex(d => d.id === delivery.id);
            const orderNumber = realIndex + 1;
            const { isMultiple, indices } = hasMultipleDeliveries(delivery);
            const isFirstInGroup = isMultiple && indices.includes(orderNumber) && indices[0] === orderNumber;
            
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
                  onStatusChange={handleStatusChange}
                  onSelect={onSelectDelivery}
                />
              </div>
            );
          })
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
