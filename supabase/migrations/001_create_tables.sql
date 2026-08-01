-- 001_create_tables.sql
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text UNIQUE,
  link text,
  alt text,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- CONFIGURAÇÕES/SETTINGS DO RESTAURANTE
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE,
  value jsonb,
  created_at timestamptz DEFAULT now()
);

-- PRATOS
CREATE TABLE IF NOT EXISTS public.dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  serves integer DEFAULT 1,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  image_url text,
  extras jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb,
  total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HISTÓRICO DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  event text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- ADMINISTRADORES (tabela leve para referência / RLS)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_dishes_category ON public.dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON public.orders(code);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_dishes_slug ON public.dishes(slug);

-- Garantia de UNIQUE constraints para seed ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS uniq_categories_slug ON public.categories(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_banners_image_url ON public.banners(image_url);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_restaurant_settings_key ON public.restaurant_settings(key);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dishes_slug ON public.dishes(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_code ON public.orders(code);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_admins_email ON public.admins(email);

-- Fim da migration
