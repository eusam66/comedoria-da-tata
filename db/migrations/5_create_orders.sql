-- 5_create_orders.sql
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  items jsonb NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL,
  customer jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders (code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
