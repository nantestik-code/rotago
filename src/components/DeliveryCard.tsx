
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DeliveryCardProps {
  delivery: DeliveryItem;
  isSelected: boolean;
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  onSelect: (id: string) => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  isSelected,
  onStatusChange,
  onSelect,
}) => {
  const { id, cliente, endereco, cidade, estado, telefone, status } = delivery;
  
  const statusColors = {
    pendente: 'bg-blue-500',
    entregue: 'bg-green-500',
    ocorrencia: 'bg-red-500',
  };

  return (
    <Card 
      className={`delivery-card mb-2 ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onSelect(id)}
    >
      <CardContent className="p-4">
        <Collapsible>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium">{cliente}</h3>
              <p className="text-sm text-gray-500">{endereco}</p>
              <p className="text-xs text-gray-400">{cidade}, {estado}</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
          </div>
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
              {isSelected ? 'Ocultar detalhes' : 'Ver detalhes'}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="pt-3 border-t mt-2">
              {telefone && (
                <p className="text-sm mb-2">
                  <span className="font-medium">Telefone:</span> {telefone}
                </p>
              )}
              
              {delivery.observacoes && (
                <p className="text-sm mb-3">
                  <span className="font-medium">Observações:</span> {delivery.observacoes}
                </p>
              )}
              
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  className="bg-green-500 hover:bg-green-600 text-white flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(id, 'entregue');
                  }}
                >
                  Marcar como Entregue
                </Button>
                <Button 
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(id, 'ocorrencia');
                  }}
                >
                  Registrar Ocorrência
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default DeliveryCard;
