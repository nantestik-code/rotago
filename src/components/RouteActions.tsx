
import React from 'react';
import { exportToCSV } from '@/utils/fileUtils';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { toast } from '@/components/ui/use-toast';

interface RouteActionsProps {
  deliveries: DeliveryItem[];
  onNewRoute: () => void;
}

export function useRouteActions(deliveries: DeliveryItem[], onNewRoute: () => void) {
  const handleExport = React.useCallback(() => {
    if (deliveries.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Importe entregas primeiro para poder exportá-las.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      exportToCSV(deliveries);
      toast({
        title: 'Exportação concluída',
        description: 'Os dados foram exportados com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar os dados.',
        variant: 'destructive',
      });
      console.error('Export error:', error);
    }
  }, [deliveries]);

  return {
    handleExport
  };
}
