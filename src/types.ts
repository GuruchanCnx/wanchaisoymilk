export type Product = {
  id: number;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  category: 'drinks' | 'snacks';
  price: number;
  image_url: string;
  available: boolean;
  sold_out: boolean;
  next_batch_time: string;
  stock: number;
  sort_order: number;
};

export type Order = {
  id: number;
  customer_name: string;
  phone: string;
  items: OrderItem[];
  total: number;
  pickup_time: string;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'done' | 'cancelled';
  payment_status: 'unpaid' | 'paid';
  payment_method: 'promptpay' | 'cash';
  notes: string;
  created_at: string;
};

export type OrderItem = {
  product_id: number;
  slug: string;
  name_th: string;
  name_en: string;
  qty: number;
  unit_price: number;
  vessel: string;
  sweetness: string;
  temp: string;
  extras: string[];
  notes?: string;
};
