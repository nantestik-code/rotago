
import { Delivery } from './delivery';

export interface Route {
  id: string;
  name: string;
  description?: string;
  date?: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  created_at?: string;
  updated_at?: string;
  deliveries?: DeliveryWithSequence[];
}

export interface RouteInput {
  name: string;
  description?: string;
  date?: string;
}

export interface DeliveryWithSequence extends Delivery {
  sequence_number: number;
}

export interface RouteDelivery {
  id: string;
  route_id: string;
  delivery_id: string;
  sequence_number: number;
  created_at?: string;
  updated_at?: string;
}
