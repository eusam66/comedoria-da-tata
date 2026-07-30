-- 3_create_banners.sql
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  image text,
  created_at timestamptz DEFAULT now()
);
