import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutTotalCents, fulfillmentLines, isZoneId, parseFeeCents, readFulfillment, validateZonePayload } from './deliveryZones.ts';

test('monetary input accepts comma, dot, zero and exact cents', () => {
  for (const input of ['8,00', '8.00', 8]) assert.equal(parseFeeCents(input), 800);
  assert.equal(parseFeeCents('0'), 0);
  assert.equal(parseFeeCents('0,01'), 1);
  assert.equal(parseFeeCents('59.9'), 5990);
  assert.equal(parseFeeCents('99999999.99'), 9999999999);
});

test('invalid fees are rejected instead of coerced or rounded', () => {
  for (const input of ['', ' ', null, false, {}, '-1', '-0.01', '1.234', '1,234', '1.000,00', '1e2', 'NaN', Infinity, NaN, '100000000'])
    assert.equal(parseFeeCents(input), null, String(input));
});

test('admin validation trims name and normalizes fee without losing cents', () => {
  assert.deepEqual(validateZonePayload({ name: ' Local de teste ', fee: '8,05', is_active: true, position: 2 }), {
    name: 'Local de teste', fee: '8.05', is_active: true, position: 2,
  });
  assert.deepEqual(validateZonePayload({ is_active: false }, true), { is_active: false });
  for (const patch of [{}, { fee: '' }, { position: -1 }, { position: 1.5 }, { position: '' }, { is_active: 'false' }, { name: ' ' }])
    assert.throws(() => validateZonePayload(patch, true));
});

test('delivery total changes by location and pickup always ignores stale fee', () => {
  const zone = { id: '11111111-1111-4111-8111-111111111111', name: 'Local de teste', fee: 8 };
  assert.equal(checkoutTotalCents(59.9, 'delivery', zone), 6790);
  assert.equal(checkoutTotalCents(59.9, 'delivery', { ...zone, fee: 15 }), 7490);
  assert.equal(checkoutTotalCents(59.9, 'pickup', zone), 5990);
  assert.equal(checkoutTotalCents(59.9, 'delivery'), 5990);
});

test('only valid location IDs are accepted', () => {
  assert.equal(isZoneId('11111111-1111-4111-8111-111111111111'), true);
  for (const value of [null, '', 'not-a-zone', {}, '11111111-1111-4111-8111-111111111111extra']) assert.equal(isZoneId(value), false);
});

test('historical display uses the saved fee and tolerates orders without snapshots', () => {
  const snapshot = { type: 'delivery' as const, delivery_zone_id: 'test', delivery_zone_name: 'Local antigo', delivery_fee: 8, subtotal: 59.9 };
  const lines = fulfillmentLines(readFulfillment({ fulfillment: snapshot }), 'delivery', 'Rua de teste, 123');
  assert.match(lines.join('\n'), /Local antigo.*8,00/);
  assert.match(lines.join('\n'), /Subtotal:.*59,90/);
  assert.equal(readFulfillment(null), null);
  assert.equal(readFulfillment({ delivery: 'pickup' }), null);
  assert.deepEqual(fulfillmentLines(null, 'pickup'), ['Retirada na Comedoria']);
  assert.deepEqual(fulfillmentLines(null, 'delivery', 'Rua antiga'), ['Endereço: Rua antiga']);
  assert.deepEqual(fulfillmentLines({ ...snapshot, type: 'pickup', delivery_zone_id: null, delivery_zone_name: null, delivery_fee: 0 }), ['Retirada na Comedoria']);
});
