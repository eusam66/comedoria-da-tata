-- seed_initial.sql
-- Insert example categories
INSERT INTO public.categories (name, slug, description, position)
VALUES
  ('Massas', 'massas', 'Pratos à base de massas caseiras', 1),
  ('Assados', 'assados', 'Carnes e acompanhamentos assados', 2),
  ('Vegetarianos', 'vegetarianos', 'Opções sem carne', 3)
ON CONFLICT (slug) DO NOTHING;

-- Insert example banners
INSERT INTO public.banners (title, image_url, link, alt, position)
VALUES
  ('Promoção de Almoço', '/images/banners/almoço.jpg', '/', 'Banner promoção almoço', 1),
  ('Combo Família', '/images/banners/combo.jpg', '/promo/combo', 'Combo família', 2)
ON CONFLICT (image_url) DO NOTHING;

-- Insert restaurant settings
INSERT INTO public.restaurant_settings (key, value)
VALUES
  ('branding', '{"primary":"#2A140F","accent":"#F58634","bg":"#F7F2EC"}'::jsonb),
  ('delivery_time', '{"min":20,"max":40}'::jsonb),
  ('open_hours', '{"monday":"11:00-15:00","tuesday":"11:00-15:00","wednesday":"11:00-15:00","thursday":"11:00-15:00","friday":"11:00-15:00","saturday":"12:00-16:00","sunday":"12:00-16:00"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert example dishes (note: category association by slug via subquery)
INSERT INTO public.dishes (code, name, slug, description, price, serves, category_id, is_featured, is_new, image_url)
VALUES
  ('D001','Spaghetti Alla Carbonara','spaghetti-alla-carbonara','Spaghetti com molho cremoso e pancetta',39.90,1,(SELECT id FROM public.categories WHERE slug='massas'), true, false, '/images/dishes/carbonara.jpg'),
  ('D002','Frango Assado com Batatas','frango-assado-batatas','Frango assado com ervas e batatas rústicas',49.50,2,(SELECT id FROM public.categories WHERE slug='assados'), true, true, '/images/dishes/frango_assado.jpg'),
  ('D003','Lasanha Vegetariana','lasanha-vegetariana','Lasanha de legumes com queijo gratinado',44.00,2,(SELECT id FROM public.categories WHERE slug='vegetarianos'), false, true, '/images/dishes/lasanha_veg.jpg')
ON CONFLICT (slug) DO NOTHING;

-- Insert a sample order
INSERT INTO public.orders (code, customer_name, customer_phone, customer_address, items, total, status)
VALUES
  ('O-1001', 'João Silva', '+5511999999999','Rua das Flores, 123','[{"dishCode":"D001","name":"Spaghetti Alla Carbonara","price":39.90,"qty":1}]'::jsonb,39.90,'completed')
ON CONFLICT (code) DO NOTHING;

-- Insert sample admin
INSERT INTO public.admins (email, name, role)
VALUES
  ('admin@comedoriadatata.com','Administrador','admin')
ON CONFLICT (email) DO NOTHING;

-- Fim do seed

