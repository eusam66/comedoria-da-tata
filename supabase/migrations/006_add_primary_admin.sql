INSERT INTO public.admins (email, name, role)
VALUES ('samuel-alves95@hotmail.com', 'Samuel Alves', 'admin')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;
