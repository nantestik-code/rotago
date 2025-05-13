
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
  statusChanged?: boolean; // Track if status was recently changed
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

// Helper to manage status change animations
export const animateMarkerStatus = (markerEl: HTMLElement, status: string) => {
  // First remove any existing animation classes
  markerEl.classList.remove('animate-marker-flash');
  
  // Apply appropriate status class
  markerEl.classList.remove('marker-occurrence', 'marker-pending', 'marker-delivered');
  
  if (status === 'ocorrencia') {
    markerEl.classList.add('marker-occurrence');
    // Add animation class
    markerEl.classList.add('animate-marker-flash');
    
    // Remove animation class after it completes to prevent repeated animations
    setTimeout(() => {
      markerEl.classList.remove('animate-marker-flash');
    }, 1500); // Animation duration + small buffer
  } else if (status === 'pendente') {
    markerEl.classList.add('marker-pending');
  } else {
    markerEl.classList.add('marker-delivered');
  }
};
