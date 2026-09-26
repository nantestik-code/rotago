
export interface DeliveryItem {
  id: string;
  orderNumber?: string | number; // Número da ordem (1, 2, 3, etc.)
  sequence_number?: number; // Número do pacote na planilha (imutável)
  optimizedOrder?: number; // Ordem de visita geográfica (definida pelo botão Otimizar)
  // Campos originais
  cliente: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  observacoes: string;
  trackingNumber?: string;
  atId?: string;
  // Campos para compatibilidade com Supabase
  client?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  // Campos de posição
  lat?: number;
  lng?: number;
  position?: { lat: number; lng: number } | null;
  // Campos de status
  status: 'pendente' | 'entregue' | 'ocorrencia';
  statusChanged?: boolean; // Track if status was recently changed
  isMultiple?: boolean;  // Indica se há múltiplas entregas neste local
  horario?: string;      // Horário estimado de entrega (ex: "15:15")
  // Campos de persistência e controle de versão
  updated_at?: string;   // Data de última atualização (ISO string)
  created_at?: string;   // Data de criação (ISO string)
  delivered_at?: string | null; // Data de entrega (ISO string)
  synced?: boolean;      // Se está sincronizado com o servidor
  numero?: string;       // Número do endereço
  complemento?: string;  // Complemento do endereço
  bairro?: string;       // Bairro do endereço
}

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const getStatusColor = (status: string, isMultiple?: boolean): string => {
  // Se for um ponto com múltiplas entregas, retorna laranja
  if (isMultiple) {
    return 'bg-orange-500';
  }
  
  // Caso contrário, retorna a cor baseada no status
  switch (status) {
    case 'entregue':
      return 'bg-green-500';
    case 'ocorrencia':
      return 'bg-red-500';
    case 'pendente':
    default:
      return 'bg-brand-500';
  }
};

export const getStatusCounts = (deliveries: DeliveryItem[]) => {
  const counts = {
    pendente: 0,
    entregue: 0,
    ocorrencia: 0,
    multiple: 0, // Novo contador para pontos com múltiplas entregas
    total: deliveries.length,
  };

  deliveries.forEach((delivery) => {
    counts[delivery.status]++;
    if (delivery.isMultiple) {
      counts.multiple++;
    }
  });

  return counts;
};

// Helper to manage status change animations
export const animateMarkerStatus = (markerEl: HTMLElement, status: string, isMultiple?: boolean) => {
  // First remove any existing animation classes
  markerEl.classList.remove('animate-marker-flash');
  
  // Apply appropriate status class
  markerEl.classList.remove('marker-occurrence', 'marker-pending', 'marker-delivered', 'marker-multiple');
  
  if (isMultiple) {
    markerEl.classList.add('marker-multiple');
    markerEl.classList.add('animate-marker-flash');
    
    setTimeout(() => {
      markerEl.classList.remove('animate-marker-flash');
    }, 1500);
  } else if (status === 'ocorrencia') {
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

// Helper para formatação de endereços para exibição
export const formatEnderecoCompleto = (delivery: DeliveryItem): string => {
  return `${delivery.endereco}, ${delivery.cidade} - ${delivery.estado}, ${delivery.cep}`;
};

// Helper para mapear status para texto em português
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'entregue':
      return 'Entregue';
    case 'ocorrencia':
      return 'Ocorrência';
    case 'pendente':
    default:
      return 'Pendente';
  }
};
