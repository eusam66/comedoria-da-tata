-- 002_rls_categories_select.sql
-- Enable Row Level Security on categories and allow public SELECT access.

ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on categories" ON public.categories;

CREATE POLICY "Allow public select on categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- If the table was already accessed by the anonymous role, this ensures reads continue to work.
