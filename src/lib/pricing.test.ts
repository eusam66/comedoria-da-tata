import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cents, effectivePrice, hasPromotion, discountPercent, pricingError } from './pricing.ts';
const offer = { price: 59.9, promo_price: 49.9, promo_active: true };
test('ativação manual preserva preço normal, economia e desconto calculado', () => {
  assert.equal(effectivePrice(offer), 49.9);
  assert.equal(cents(offer.price) - cents(offer.promo_price), 1000);
  assert.equal(discountPercent(offer), 17);
  assert.equal(effectivePrice({ ...offer, promo_active: false }), 59.9);
  assert.equal(effectivePrice({ ...offer, promo_active: true }), 49.9);
  assert.equal(offer.price, 59.9);
});
test('rejeita preços inválidos e ativação sem valor; inativa não usa promoção', () => {
  for (const promo_price of [0, -1, 59.9, 60, NaN, Infinity, 4.001]) {
    assert.ok(pricingError({ ...offer, promo_price }));
    assert.equal(hasPromotion({ ...offer, promo_price }), false);
  }
  for (const price of [0, -1, NaN, Infinity, 1.001, 100000000])
    assert.ok(pricingError({ ...offer, price }));
  assert.ok(pricingError({ price: 59.9, promo_active: true }));
  assert.equal(pricingError({ price: 59.9, promo_price: null, promo_active: false }), null);
});
test('mudança do preço normal exige corrigir oferta e operações em centavos são exatas', () => {
  assert.ok(pricingError({ ...offer, price: 49.9 }));
  assert.equal((cents(effectivePrice(offer)) + cents(2)) * 2 + cents(5.5) * 2 + cents(7.25), 12205);
  assert.equal(cents(0.1) + cents(0.2), 30);
});
