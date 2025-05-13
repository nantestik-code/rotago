
export interface DeliveryItem {
  id: string;
  cliente: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  observacoes: string;
  status: 'pendente' | 'entregue' | 'ocorrencia';
  lat?: number;
  lng?: number;
}

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'entregue':
      return 'bg-green-500';
    case 'ocorrencia':
      return 'bg-red-500';
    case 'pendente':
    default:
      return 'bg-blue-500';
  }
};

export const getStatusCounts = (deliveries: DeliveryItem[]) => {
  const counts = {
    pendente: 0,
    entregue: 0,
    ocorrencia: 0,
    total: deliveries.length,
  };

  deliveries.forEach((delivery) => {
    counts[delivery.status]++;
  });

  return counts;
};
