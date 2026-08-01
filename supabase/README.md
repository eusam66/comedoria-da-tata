Supabase migrations and seeds for Comedoria da Tata

Files in this folder:
- migrations/001_create_tables.sql  - schema creation for categories, dishes, banners, orders, order_history, restaurant_settings, admins
- seeds/seed_initial.sql           - example data to populate categories, banners, dishes, settings and a sample order

How to apply using Supabase SQL Editor (recommended):
1. Open your Supabase project and go to "SQL Editor".
2. Create a new query and paste the contents of migrations/001_create_tables.sql. Run the query.
3. After schema is created, create a new query and paste contents of seeds/seed_initial.sql. Run the query.

How to apply using psql (if you have DATABASE_URL):
1. psql "<DATABASE_URL>" -f supabase/migrations/001_create_tables.sql
2. psql "<DATABASE_URL>" -f supabase/seeds/seed_initial.sql

Notes:
- The migration uses gen_random_uuid() from the pgcrypto extension. Ensure the extension is allowed in your Supabase Postgres (it is enabled by default in Supabase projects).
- The seed script attempts idempotent inserts using ON CONFLICT DO NOTHING to avoid duplicates on re-run.
- After running, ensure the storage buckets exist for images (banners, dishes, branding) if you plan to upload images via the app.

Buckets recommended:
- dishes
- banners
- branding

If you want, I can also create a simple SQL file to create the buckets via Supabase API (requires service-role key) or provide a script to run with supabase CLI.
