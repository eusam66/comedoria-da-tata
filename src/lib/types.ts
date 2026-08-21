// Tipos TypeScript para as tabelas Supabase

export type CategoryRow = {
  id: string;
  name: string;
  image?: string | null;
  image_url?: string | null;
  slug?: string | null;
  description?: string | null;
  position?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type DishRow = {
  id: string;
  code?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  image?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  ingredients?: string | null;
  servings?: number | null;
  serves?: number | null;
  popular?: boolean | null;
  is_featured?: boolean | null;
  is_new?: boolean | null;
  is_available?: boolean | null;
  stock?: number | null;
  position?: number | null;
  extras?: any | null;
  addons?: Array<{
    id: string;
    name: string;
    price: number;
    maxQty: number;
    required: boolean;
  }> | null;
  created_at?: string | null;
};

export type BannerRow = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  image_url?: string | null;
  link?: string | null;
  alt?: string | null;
  position?: number | null;
  active?: boolean | null;
  created_at?: string | null;
};

export type RestaurantSettingsRow = {
  id: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  opening_hours?: any | null; // JSONB
  theme?: any | null; // JSONB
  created_at?: string | null;
};

export type OrderRow = {
  id: string;
  code: string;
  items: any; // jsonb with items array
  total: number;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  metadata?: {
    name?: string;
    phone?: string;
    delivery?: 'delivery' | 'pickup';
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
    payment?: 'pix' | 'card' | 'cash';
    change?: string;
    notes?: string;
  } | null;
  created_at?: string | null;
};

export type OrderHistoryRow = {
  id: string;
  order_id: string;
  event?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
};
