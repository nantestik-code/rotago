
import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { Check, AlertTriangle, RotateCcw, Navigation, MapPin } from 'lucide-react';

interface DeliveryCardProps {
  delivery: DeliveryItem;
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

const DeliveryCard = forwardRef<HTMLDivElement, DeliveryCardProps>(({ delivery, onStatusChange, onSelect, isSelected }, ref) => {
  // Determinar as classes CSS baseadas no status
  const getStatusClasses = () => {
    switch (delivery.status) {
      case 'entregue':
        return 'bg-green-50 border-green-200';
      case 'ocorrencia':
        return 'bg-red-50 border-red-200';
      case 'pendente':
      default:
        return '';
    }
  };

  // Classe para o status badge
  const getStatusBadgeClasses = () => {
    switch (delivery.status) {
      case 'entregue':
        return 'bg-green-500';
      case 'ocorrencia':
        return 'bg-red-500';
      case 'pendente':
      default:
        return 'bg-blue-500';
    }
  };

  const handleStatusChange = (e: React.MouseEvent, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    e.stopPropagation();
    onStatusChange(delivery.id, status);
  };

  const openNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!delivery.lat || !delivery.lng) {
      console.error('Coordenadas não disponíveis para navegação');
      return;
    }
    
    // Detect platform and open appropriate app
    const userAgent = navigator.userAgent || navigator.vendor;
    const lat = delivery.lat;
    const lng = delivery.lng;
    
    // iOS
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } 
    // Android
    else if (/android/i.test(userAgent)) {
      window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
    } 
    // Fallback to Google Maps web
    else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  return (
    <Card 
      ref={ref}
      className={`transition-all hover:shadow-md cursor-pointer 
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        ${getStatusClasses()}
        ${delivery.statusChanged ? 'animate-pulse scale-[1.02]' : ''}
      `}
      onClick={() => onSelect(delivery.id)}
    >
      <CardContent className="p-3">
        <div className="flex justify-between">
          <h3 className="font-semibold text-lg">{delivery.cliente}</h3>
          <div className={`w-3 h-3 rounded-full ${getStatusBadgeClasses()}`}></div>
        </div>
        
        <div className="text-sm text-gray-600 mt-1">
          <p className="font-medium">{delivery.endereco}</p>
          <p>{delivery.cidade}, {delivery.estado}</p>
          {delivery.observacoes && (
            <p className="mt-1 italic text-xs">{delivery.observacoes}</p>
          )}
        </div>
        
        <div className="mt-3 flex flex-wrap gap-1">
          <Button 
            size="sm" 
            variant="outline"
            className="flex items-center gap-1 h-8 px-2 text-xs"
            onClick={openNavigation}
          >
            <Navigation size={14} />
            Navegar
          </Button>
          
          <Button 
            size="sm" 
            variant={delivery.status === 'entregue' ? 'default' : 'outline'}
            className={`flex items-center gap-1 h-8 px-2 text-xs ${delivery.status === 'entregue' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={(e) => handleStatusChange(e, 'entregue')}
          >
            <Check size={14} />
            Entregue
          </Button>
          
          <Button 
            size="sm" 
            variant={delivery.status === 'ocorrencia' ? 'default' : 'outline'}
            className={`flex items-center gap-1 h-8 px-2 text-xs ${delivery.status === 'ocorrencia' ? 'bg-red-500 hover:bg-red-600' : ''}`}
            onClick={(e) => handleStatusChange(e, 'ocorrencia')}
          >
            <AlertTriangle size={14} />
            Ocorrência
          </Button>
          
          <Button 
            size="sm" 
            variant={delivery.status === 'pendente' ? 'default' : 'outline'}
            className={`flex items-center gap-1 h-8 px-2 text-xs ${delivery.status === 'pendente' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            onClick={(e) => handleStatusChange(e, 'pendente')}
          >
            <RotateCcw size={14} />
            Voltar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default DeliveryCard;
