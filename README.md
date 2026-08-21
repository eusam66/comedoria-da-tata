Comedoria da Tata — Sprint 1

Este repositório contém a fundação do frontend para o projeto "Comedoria da Tata".

Stack proposta:

- Next.js 15 (app router)
- React 19
- TypeScript
- Tailwind CSS v4
- ESLint + Prettier
- PWA via next-pwa

Arquivos criados:

- src/app/layout.tsx, src/app/page.tsx
- src/components (Header, Footer, Banner, CategoryList, DishCard, Section, SearchBar, WhatsAppButton)
- src/lib/mock.ts (dados mockados)
- tailwind, postcss, eslint, prettier configs
- public/manifest.json e ícones placeholder

Próximos passos recomendados (execute localmente):

1. Instalar dependências: npm install
2. Criar um projeto Supabase e configurar as tabelas (exemplos SQL abaixo)
3. Preencher .env.local com as variáveis do Supabase (use .env.example como referência)
4. Rodar dev: npm run dev
5. Substituir ícones em public/icons e ajustar manifest

Configuração do Supabase (exemplos de schema SQL)

-- categories
CREATE TABLE categories (
id uuid PRIMARY KEY,
name text NOT NULL,
image text
);

-- dishes
CREATE TABLE dishes (
id uuid PRIMARY KEY,
code text UNIQUE,
name text NOT NULL,
slug text UNIQUE NOT NULL,
description text,
price numeric NOT NULL,
image text,
category_id uuid REFERENCES categories(id),
ingredients text,
servings int,
popular boolean DEFAULT false,
is_new boolean DEFAULT false,
created_at timestamptz DEFAULT now()
);

-- banners
CREATE TABLE banners (
id uuid PRIMARY KEY,
title text,
subtitle text,
image text,
created_at timestamptz DEFAULT now()
);

-- orders
CREATE TABLE orders (
id uuid PRIMARY KEY,
code text UNIQUE,
items jsonb,
total numeric,
status text,
customer jsonb,
created_at timestamptz DEFAULT now()
);

Notas importantes

- Adicione as chaves em .env.local. Nunca commit as chaves privadas. Use a variável SUPABASE_SERVICE_ROLE_KEY apenas em ambiente servidor.
- O código atual do projeto foi adaptado para usar o cliente Supabase (src/lib/supabase.ts) e as funções server-side em src/lib/adminApi.ts.
- Antes de rodar, execute npm install para instalar @supabase/supabase-js e uuid.

Migrações

- Encontre as migrações SQL em db/migrations. Aplique-as no seu projeto Supabase (por exemplo via psql, supabase CLI ou diretamente no Editor SQL do painel Supabase).

Obs: o scaffold automático (create-next-app) não pôde ser executado neste ambiente; os arquivos base foram criados manualmente — rode npm install localmente.
