
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  CircleCheck, 
  Navigation, 
  AlertCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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
  const { id, cliente, endereco, cidade, estado, telefone, status, lat, lng } = delivery;
  
  const statusColors = {
    pendente: 'bg-blue-500',
    entregue: 'bg-green-500',
    ocorrencia: 'bg-red-500',
  };

  const handleNavigation = () => {
    if (!lat || !lng) {
      toast({
        title: "Coordenadas não disponíveis",
        description: "Não foi possível iniciar a navegação para este endereço.",
        variant: "destructive"
      });
      return;
    }

    // Detect platform and open appropriate app
    const userAgent = navigator.userAgent || navigator.vendor;
    
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
    
    toast({
      title: 'Abrindo navegação GPS',
      description: 'Iniciando navegação para o endereço selecionado',
    });
  };

  const [isOpen, setIsOpen] = React.useState(isSelected);

  // Atualizar o estado de abertura quando a seleção mudar
  React.useEffect(() => {
    if (isSelected && !isOpen) {
      setIsOpen(true);
    }
  }, [isSelected]);

  return (
    <Card 
      className={`delivery-card mb-2 ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''} 
        transition-all hover:shadow-md cursor-pointer`}
      onClick={() => onSelect(id)}
    >
      <CardContent className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 flex items-center justify-center rounded-full ${statusColors[status]} text-white`}>
                  {cliente.replace(/[^\d]/g, '')}
                </div>
                <h3 className="text-lg font-medium">{cliente}</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">{endereco}</p>
              <p className="text-xs text-gray-400">{cidade}, {estado}</p>
            </div>
            
            <CollapsibleTrigger asChild onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <div className="pt-3 border-t mt-3 space-y-3">
              {telefone && (
                <p className="text-sm">
                  <span className="font-medium">Telefone:</span> {telefone}
                </p>
              )}
              
              {delivery.observacoes && (
                <p className="text-sm">
                  <span className="font-medium">Observações:</span> {delivery.observacoes}
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button 
                  variant="outline"
                  className="flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation();
                  }}
                >
                  <Navigation className="h-4 w-4" />
                  <span>Navegar</span>
                </Button>
                
                <Button 
                  variant="outline"
                  className="flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(id);
                    const mapElement = document.querySelector('.mapboxgl-map');
                    if (mapElement) {
                      mapElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Ver no Mapa</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(id, 'entregue');
                  }}
                >
                  <CircleCheck className="h-4 w-4" />
                  <span>Entregue</span>
                </Button>
                
                <Button 
                  className="bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(id, 'pendente');
                  }}
                >
                  <Clock className="h-4 w-4" />
                  <span>Voltar</span>
                </Button>
                
                <Button 
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(id, 'ocorrencia');
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Ocorrência</span>
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
