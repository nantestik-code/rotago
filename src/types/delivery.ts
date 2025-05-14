
export interface Delivery {
  id: string;
  order_number: string;
  client_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  notes?: string;
  status: 'pendente' | 'em_rota' | 'entregue' | 'cancelado';
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryInput {
  order_number: string;
  client_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export type DeliveryStatus = 'pendente' | 'em_rota' | 'entregue' | 'cancelado';

// Tipo para mapear entre Delivery (API) e DeliveryItem (Frontend)
export interface DeliveryMapping {
  // De Delivery para DeliveryItem
  toItem(delivery: Delivery): DeliveryItem;
  // De DeliveryItem para Delivery
  fromItem(item: DeliveryItem): Delivery;
  // De array de Delivery para array de DeliveryItem
  toItemArray(deliveries: Delivery[]): DeliveryItem[];
  // De array de DeliveryItem para array de Delivery
  fromItemArray(items: DeliveryItem[]): Delivery[];
}

// Tipo DeliveryItem usado na interface
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

// Mapeamento entre tipos de status
export const statusMapping = {
  // De Delivery para DeliveryItem
  toItem(status: 'pendente' | 'em_rota' | 'entregue' | 'cancelado'): 'pendente' | 'entregue' | 'ocorrencia' {
    if (status === 'pendente' || status === 'em_rota') return 'pendente';
    if (status === 'entregue') return 'entregue';
    return 'ocorrencia'; // 'cancelado' se torna 'ocorrencia'
  },
  // De DeliveryItem para Delivery
  fromItem(status: 'pendente' | 'entregue' | 'ocorrencia'): 'pendente' | 'em_rota' | 'entregue' | 'cancelado' {
    if (status === 'pendente') return 'pendente';
    if (status === 'entregue') return 'entregue';
    return 'cancelado'; // 'ocorrencia' se torna 'cancelado'
  }
};

// Implementação do mapeamento entre Delivery e DeliveryItem
export const deliveryMapper: DeliveryMapping = {
  toItem(delivery: Delivery): DeliveryItem {
    return {
      id: delivery.id,
      cliente: delivery.client_name,
      endereco: delivery.address,
      cidade: delivery.city,
      estado: delivery.state,
      cep: delivery.zip_code,
      telefone: delivery.phone,
      observacoes: delivery.notes || '',
      status: statusMapping.toItem(delivery.status),
      lat: delivery.latitude,
      lng: delivery.longitude
    };
  },
  fromItem(item: DeliveryItem): Delivery {
    return {
      id: item.id,
      order_number: item.id.substring(0, 8),
      client_name: item.cliente,
      address: item.endereco,
      city: item.cidade,
      state: item.estado,
      zip_code: item.cep,
      phone: item.telefone,
      notes: item.observacoes,
      status: statusMapping.fromItem(item.status),
      latitude: item.lat,
      longitude: item.lng
    };
  },
  toItemArray(deliveries: Delivery[]): DeliveryItem[] {
    return deliveries.map(delivery => this.toItem(delivery));
  },
  fromItemArray(items: DeliveryItem[]): Delivery[] {
    return items.map(item => this.fromItem(item));
  }
};
