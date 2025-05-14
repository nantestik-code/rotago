
import { Delivery } from './delivery';

export interface Route {
  id: string;
  name: string;
  date: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  driver_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RouteInput {
  name: string;
  date: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  driver_id?: string;
}

export interface DeliveryWithSequence extends Delivery {
  sequence_number: number;
}

export interface RouteWithDeliveries extends Route {
  deliveries: DeliveryWithSequence[];
}
