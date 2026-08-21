-- Migration 008: normaliza somente os dois status legados conhecidos.
-- NÃO APLICADA. Deve ser executada apenas após autorização e backup lógico.
--
-- Idempotência: apenas pedidos ainda em 'Entregue' ou 'completed' entram no CTE.
-- A inserção no histórico e a atualização acontecem na mesma instrução SQL; uma
-- nova execução não encontra esses pedidos e, portanto, não duplica o histórico.

with legacy_orders as materialized (
  select id, status as previous_status
  from public.orders
  where status in ('Entregue', 'completed')
  for update
), recorded_history as (
  insert into public.order_history (order_id, event, payload)
  select
    id,
    'status_normalized',
    jsonb_build_object(
      'previous_status', previous_status,
      'new_status', 'Finalizado',
      'migration', '008_normalize_legacy_order_statuses'
    )
  from legacy_orders
  returning order_id
)
update public.orders as orders
set
  status = 'Finalizado',
  updated_at = now()
from legacy_orders
join recorded_history on recorded_history.order_id = legacy_orders.id
where orders.id = legacy_orders.id
  and orders.status = legacy_orders.previous_status;
