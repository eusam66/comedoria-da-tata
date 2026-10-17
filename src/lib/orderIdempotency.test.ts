import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderOnce, IdempotencyConflict } from './orderIdempotency.ts';

const saved = { code: 'HOM1234', total: 34.40, metadata: { checkout_fingerprint: 'same' } };
test('retry após resposta perdida devolve total e código históricos sem criar', async () => {
  let writes = 0;
  const result = await createOrderOnce('same', async () => saved, async () => { writes++; return saved; });
  assert.equal(result, saved);
  assert.equal(writes, 0);
});
test('falha de RPC concorrente recupera o pedido confirmado pela outra instância', async () => {
  let reads = 0;
  const result = await createOrderOnce('same', async () => ++reads === 1 ? null : saved,
    async () => { throw new Error('duplicate primary key / stock lock'); });
  assert.equal(result, saved);
  assert.equal(reads, 2);
});
test('chave reutilizada com outro conteúdo não expõe nem altera o pedido', async () => {
  await assert.rejects(createOrderOnce('other', async () => saved, async () => saved), IdempotencyConflict);
});
test('erro real sem pedido confirmado continua sendo falha', async () => {
  await assert.rejects(createOrderOnce('same', async () => null, async () => { throw new Error('INSUFFICIENT_STOCK'); }), /INSUFFICIENT_STOCK/);
});
