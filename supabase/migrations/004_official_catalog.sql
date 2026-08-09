-- Replace only the original demo catalog with the nine official dishes.
DELETE FROM public.dishes
WHERE slug IN ('frango-assado-batatas', 'lasanha-vegetariana', 'salada-tropical-quinoa');

INSERT INTO public.categories (name, slug, description, position, is_active)
VALUES
  ('Lasanhas', 'lasanhas', 'Lasanhas artesanais de 900 g', 10, true),
  ('Feijoadas', 'feijoadas', 'Feijoadas completas e meia porção', 20, true),
  ('Galetos', 'galetos', 'Galetos e acompanhamentos', 30, true),
  ('Feijões', 'feijoes', 'Feijão charqueado da casa', 40, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  position = EXCLUDED.position,
  is_active = true;

INSERT INTO public.dishes
  (code, name, slug, description, price, serves, category_id, image_url, is_available, position)
VALUES
  ('D001', 'Lasanha de frango', 'lasanha-frango', '900 g · Serve até 2 pessoas.', 54.90, 2, (SELECT id FROM public.categories WHERE slug='lasanhas'), '/pratos/lasanha-1.jpg', true, 10),
  ('D002', 'Lasanha de carne', 'lasanha-carne', '900 g · Serve até 2 pessoas.', 59.90, 2, (SELECT id FROM public.categories WHERE slug='lasanhas'), '/pratos/lasanha-2.jpg', true, 20),
  ('D003', 'Feijoada completa', 'feijoada-completa', 'Serve 3 a 4 pessoas · Arroz, farofa, vinagrete, torresmo e laranja.', 64.90, 4, (SELECT id FROM public.categories WHERE slug='feijoadas'), '/pratos/feijoada-completa.jpg', true, 30),
  ('D004', 'Meia feijoada', 'meia-feijoada', 'Arroz, farofa, vinagrete, torresmo e laranja.', 59.90, 1, (SELECT id FROM public.categories WHERE slug='feijoadas'), '/pratos/meia-feijoada.png', true, 40),
  ('D005', 'Galeto completo', 'galeto-completo', 'Serve 3 a 4 pessoas · Arroz, feijão macassar, farofa e vinagrete.', 59.90, 4, (SELECT id FROM public.categories WHERE slug='galetos'), '/pratos/galeto-completo.jpg', true, 50),
  ('D006', 'Meio galeto', 'meio-galeto', 'Serve até 2 pessoas · Arroz, feijão macassar, farofa e vinagrete.', 39.99, 2, (SELECT id FROM public.categories WHERE slug='galetos'), '/pratos/meio-galeto-provisorio.png', true, 60),
  ('D007', 'Galeto sem acompanhamentos', 'galeto-sem-acompanhamentos', 'Acompanha farofa e vinagrete.', 34.99, 1, (SELECT id FROM public.categories WHERE slug='galetos'), '/pratos/galeto-embalado.jpg', true, 70),
  ('D008', 'Feijão charqueado', 'feijao-charqueado', 'Serve 3 a 4 pessoas · Arroz, farofa e vinagrete.', 49.99, 4, (SELECT id FROM public.categories WHERE slug='feijoes'), '/pratos/feijao-charqueado.jpg', true, 80),
  ('D009', 'Meio charqueado', 'meio-charqueado', 'Arroz, farofa e vinagrete.', 39.99, 1, (SELECT id FROM public.categories WHERE slug='feijoes'), '/pratos/meio-charqueado.png', true, 90)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  serves = EXCLUDED.serves,
  category_id = EXCLUDED.category_id,
  image_url = EXCLUDED.image_url,
  is_available = EXCLUDED.is_available,
  position = EXCLUDED.position,
  updated_at = now();
