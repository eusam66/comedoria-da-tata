-- Enable Row Level Security and basic policies for Comedoria da Tata

-- Enable RLS on tables
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_history ENABLE ROW LEVEL SECURITY;

-- Public read access for public-facing tables
-- categories, dishes, banners, restaurant_settings should be readable publicly
DROP POLICY IF EXISTS public_select_categories ON categories;
CREATE POLICY public_select_categories ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS public_select_dishes ON dishes;
CREATE POLICY public_select_dishes ON dishes FOR SELECT USING (true);

DROP POLICY IF EXISTS public_select_banners ON banners;
CREATE POLICY public_select_banners ON banners FOR SELECT USING (true);

DROP POLICY IF EXISTS public_select_settings ON restaurant_settings;
CREATE POLICY public_select_settings ON restaurant_settings FOR SELECT USING (true);

-- Orders: allow authenticated users to INSERT (create orders)
DROP POLICY IF EXISTS authenticated_insert_orders ON orders;
CREATE POLICY authenticated_insert_orders ON orders FOR INSERT USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Orders: allow service_role or admin users (no explicit policy) to SELECT/UPDATE via admin API (service role bypasses RLS)
-- order_history: internal inserts performed by service role; no public policies created

-- NOTE: Admin modifications (insert/update/delete) for categories/dishes/banners/settings should be performed via Service Role (supabaseAdmin) which bypasses RLS.

-- Make sure to enable the pgcrypto extension if uuid generation depends on it (if not present already)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
