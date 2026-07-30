-- 4_create_restaurant_settings.sql
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text,
  address text,
  opening_hours jsonb,
  theme jsonb,
  created_at timestamptz DEFAULT now()
);

-- Usually there will be a single row; you can enforce constraints in your app logic.
