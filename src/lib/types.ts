// Tipos TypeScript para as tabelas Supabase

export type CategoryRow = {
  id: string;
  name: string;
  image?: string | null;
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
  category_id?: string | null;
  ingredients?: string[] | null;
  servings?: number | null;
  popular?: boolean | null;
  is_new?: boolean | null;
  created_at?: string | null;
};

export type BannerRow = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
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
  customer?: any | null;
  created_at?: string | null;
};

export type OrderHistoryRow = {
  id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  note?: string | null;
  created_at?: string | null;
};
