ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS subtitle text;

ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_position ON public.categories(position);
CREATE INDEX IF NOT EXISTS idx_banners_position ON public.banners(position);
CREATE INDEX IF NOT EXISTS idx_dishes_position ON public.dishes(position);
