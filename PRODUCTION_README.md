# Comedoria da Tata — Guia de Produção

Este documento descreve como preparar, configurar e deployar a aplicação Comedoria da Tata em produção (Supabase + Vercel).

1. Instalação local

- Node.js 20+ e npm instalados
- No repositório:
  ```bash
  npm install
  npm run dev
  ```

2. Configuração do Supabase

- Crie um projeto Supabase em https://app.supabase.com/
- No projeto, aplique as migrations (SQL) presentes em `/db/migrations` na ordem numérica. Elas criam as tabelas: categories, dishes, banners, restaurant_settings, orders, order_history, admins e ativam RLS/policy básicas.
- Crie os buckets (Storage) via script ou Console:
  - dishes
  - banners
  - branding

3. Variáveis de ambiente (local e Vercel)

Crie `.env.local` com as variáveis:

- NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
- NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
- SUPABASE_URL=<your-supabase-url>
- SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # secreto
- NEXT_PUBLIC_SITE_URL=https://your-domain.example

No Vercel, adicione as mesmas variáveis como Environment Variables (Production scope). SUPABASE_SERVICE_ROLE_KEY deve ser marcado como secret.

4. Migrations

- As migrations estão em `db/migrations/` numeradas. Aplicar em ordem (1..8). A migration 7 ativa RLS para leituras públicas e orders; a 8 cria a tabela `admins` e políticas que permitem que usuários presentes em `admins` atuem como administradores.

5. Buckets

- Execute `node scripts/create_buckets.js` (configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente) ou crie manualmente os buckets `dishes`, `banners`, `branding` via Console.

6. Criar contas de administrador

- Crie um usuário no Supabase Auth (email + password) para cada administrador.
- Registre o `user_id` (UUID) desse usuário na tabela `admins` (INSERT manual) ou use um script administrativo com SUPABASE_SERVICE_ROLE_KEY.

Exemplo:

```sql
INSERT INTO admins (user_id, email, role) VALUES ('<user-uuid>', 'admin@example.com', 'admin');
```

7. Deploy na Vercel

- Conectar repositório ao Vercel.
- Definir Environment Variables na configuração do projeto Vercel (as mesmas que no passo 3).
- `vercel.json` já incluído com placeholders de env vars.
- Deploy — Vercel executará `next build` e `next start`.

8. Domínio e TLS

- Configure seu domínio no Vercel (Settings → Domains) e anexe certificados TLS (Vercel cuida automaticamente em muitos casos).
- No Supabase Auth Settings, adicione a origem do site (NEXT_PUBLIC_SITE_URL) em `Site URL` e redirect URIs (ex: https://your-domain.example/admin) para OAuth se necessário.

9. Backup

- Use o painel do Supabase para configurar backups de banco (pg_dump regulares) ou criar rotinas de export via cron que baixem dumps periódicos e salvem em storage externo.
- Para Storage (imagens), crie um backup periódico (copiar objetos para outro bucket ou outro provedor) se necessário.

10. Checklist final antes de publicar

- [ ] Migrations aplicadas
- [ ] Buckets criados
- [ ] Accounts admin criadas e inseridas na tabela `admins`
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Verificar que SUPABASE_SERVICE_ROLE_KEY está seguro
- [ ] Testar fluxo de login admin (email/senha)
- [ ] Testar CRUD admin (dishes/categories/banners)
- [ ] Testar upload de imagens (admin)
- [ ] Testar criação de pedidos (público)
- [ ] Testar rota pública /pedido/[codigo]
- [ ] Testar PWA (build production) e manifest
- [ ] Testar sitemap.xml e robots.txt
- [ ] Configurar monitoramento e logs (Sentry)

11. Observações

- Política de admins: a tabela `admins` controla quem pode executar ações administrativas via UI.
- Mantenha o SUPABASE_SERVICE_ROLE_KEY fora do frontend e seguro no Vercel.


---

Para instruções avançadas (RLS refinado, claims, rotação de chaves), acione próximo sprint."