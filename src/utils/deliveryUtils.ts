
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

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  // Haversine formula for calculating distance between two points
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance in meters
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
