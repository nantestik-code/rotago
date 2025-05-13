
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import DeliveryCard from './DeliveryCard';
import { Search, Filter } from 'lucide-react';

interface DeliveryListProps {
  deliveries: DeliveryItem[];
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  onSelectDelivery: (id: string) => void;
  selectedDeliveryId: string | null;
}

const DeliveryList: React.FC<DeliveryListProps> = ({
  deliveries,
  onStatusChange,
  onSelectDelivery,
  selectedDeliveryId,
}) => {
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'entregue' | 'ocorrencia'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Group deliveries by address
  const addressGroups: Record<string, {items: DeliveryItem[], indices: number[]}> = {};
  
  deliveries.forEach((delivery, index) => {
    const key = `${delivery.endereco},${delivery.cidade}`.toLowerCase();
    if (!addressGroups[key]) {
      addressGroups[key] = { items: [], indices: [] };
    }
    addressGroups[key].items.push(delivery);
    addressGroups[key].indices.push(index + 1); // Adding 1 to match the marker numbering
  });
  
  const filteredDeliveries = deliveries
    .filter(delivery => 
      filter === 'todos' || delivery.status === filter
    )
    .filter(delivery => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        delivery.cliente.toLowerCase().includes(query) ||
        delivery.endereco.toLowerCase().includes(query) ||
        delivery.cidade.toLowerCase().includes(query)
      );
    });

  return (
    <div className="flex flex-col h-full">
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
      
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredDeliveries.length > 0 ? (
          filteredDeliveries.map((delivery, index) => {
            const key = `${delivery.endereco},${delivery.cidade}`.toLowerCase();
            const group = addressGroups[key];
            
            // Encontrar o índice real da entrega na lista completa de entregas
            const realIndex = deliveries.findIndex(d => d.id === delivery.id);
            const orderNumber = realIndex + 1;
            
            // Se houver múltiplas entregas no mesmo endereço, mostrar o grupo
            const isMultipleDelivery = group?.items.length > 1;
            
            return (
              <div key={delivery.id} className="relative">
                {isMultipleDelivery && group?.items[0].id === delivery.id && (
                  <div className="text-xs font-semibold py-1 px-2 bg-orange-100 text-orange-800 rounded mb-1">
                    Múltiplas entregas (Ordens: {group.indices.join(', ')})
                  </div>
                )}
                <DeliveryCard
                  delivery={{
                    ...delivery,
                    cliente: `Ordem ${orderNumber}`
                  }}
                  isSelected={selectedDeliveryId === delivery.id}
                  onStatusChange={onStatusChange}
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
