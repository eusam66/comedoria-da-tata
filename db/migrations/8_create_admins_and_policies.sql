-- Create admins table and policies

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_admins_email ON admins (lower(email));

-- Policy: allow users in admins table to act as admins

-- categories
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_manage_categories ON categories;
CREATE POLICY admins_manage_categories ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
);

-- dishes
ALTER TABLE IF EXISTS dishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_manage_dishes ON dishes;
CREATE POLICY admins_manage_dishes ON dishes FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
);

-- banners
ALTER TABLE IF EXISTS banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_manage_banners ON banners;
CREATE POLICY admins_manage_banners ON banners FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
);

-- restaurant_settings
ALTER TABLE IF EXISTS restaurant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_manage_settings ON restaurant_settings;
CREATE POLICY admins_manage_settings ON restaurant_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
);

-- orders: keep existing insert policy for authenticated customers, but allow admins to select/update/delete
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_manage_orders ON orders;
CREATE POLICY admins_manage_orders ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
);

-- order_history: allow admins to insert/select
ALTER TABLE IF EXISTS order_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_manage_order_history ON order_history;
CREATE POLICY admins_manage_order_history ON order_history FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE lower(admins.email) = lower(auth.jwt() ->> 'email'))
);

-- Note: public SELECT policies for categories/dishes/banners/restaurant_settings remain (from previous migration). Service role still bypasses RLS for admin scripts.
