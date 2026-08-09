-- Remove the final known demo dish from the original seed.
DELETE FROM public.dishes
WHERE slug = 'spaghetti-alla-carbonara'
  AND code = 'D001';
