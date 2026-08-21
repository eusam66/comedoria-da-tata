-- 2_create_dishes.sql
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  ingredients text,
  servings int,
  popular boolean DEFAULT false,
  is_new boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dishes_name ON dishes (lower(name));
CREATE INDEX IF NOT EXISTS idx_dishes_slug ON dishes (slug);
