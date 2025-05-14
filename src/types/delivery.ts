
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
