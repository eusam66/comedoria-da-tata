-- ROLLBACK SEM PERDA DE DADOS: a reversão é somente da aplicação para a ponte.
-- Preservar promo_price, promo_active, constraints e ambas as RPCs.
-- Não remover colunas, restaurar RPC legada anterior ou reescrever pedidos.
-- A ponte mantém /api/orders (API publicada) e /api/orders/v2 (confirmação estrita).
-- Esta consulta é apenas de diagnóstico; não executa reversão de schema.
select to_regprocedure('public.create_order_with_stock(uuid,text,jsonb,jsonb)') as legacy_rpc,
       to_regprocedure('public.create_order_with_stock_v2(uuid,text,jsonb,jsonb)') as confirmed_rpc;
