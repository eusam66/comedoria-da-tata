import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderMessage, whatsappUrl, BUSINESS_WHATSAPP_PHONE, type SavedOrder } from './whatsapp.ts';
import { validateHomologationEnvironment } from './environment.ts';

const order: SavedOrder = {
  id: 'test', code: 'HOM1234', totalCents: 6630, subtotalCents: 5780,
  items: [{ name: 'HOMOLOGAÇÃO Café & pão 🍞', quantity: 2, price: 28.90,
    notes: 'Sem açúcar\nObrigado!', addons: [{ qty: 1, name: 'Queijo' }] }],
  customer: { name: 'HOMOLOGAÇÃO João', phone: '000', delivery: 'delivery', street: 'Rua Fictícia',
    number: '1', neighborhood: 'Teste', complement: 'Casa A', reference: 'Portão', payment: 'cash',
    change: '100,00', notes: 'Não tocar campainha', delivery_zone_id: 'zone' },
  fulfillment: { type: 'delivery', delivery_zone_id: 'zone', delivery_zone_name: 'HOMOLOGAÇÃO Zona A', delivery_fee: 8.5, subtotal: 57.8 },
};

test('mensagem usa o snapshot persistido e inclui detalhes, taxa, adicionais e observações', () => {
  const message = buildOrderMessage(order);
  for (const fragment of ['HOM1234', 'João', '2x HOMOLOGAÇÃO Café & pão 🍞', 'Sem açúcar\nObrigado!',
    '1x Queijo', 'Rua Fictícia, 1', 'Casa A', 'Portão', 'Zona A', '57,80', '8,50', '66,30', '100,00', 'Não tocar campainha'])
    assert.ok(message.includes(fragment), fragment);
  assert.ok(!message.includes('Pedido enviado'));
});
test('URL preserva quebras, caracteres reservados e emoji sem duplo encoding', () => {
  const message = 'João & Maria? #1\n🍽️ + 10%';
  const url = new URL(whatsappUrl(message, '+55 (81) 99274-3126')!);
  assert.equal(url.pathname, `/${BUSINESS_WHATSAPP_PHONE}`);
  assert.equal(url.searchParams.get('text'), message);
  assert.equal(url.hash, '');
});
test('retirada não apresenta endereço ou zona antigos e tem taxa zero', () => {
  const message = buildOrderMessage({ ...order, totalCents: 5780, fulfillment: { ...order.fulfillment!, type: 'pickup', delivery_fee: 0, delivery_zone_name: null } });
  assert.ok(message.includes('Retirada'));
  assert.ok(!message.includes('Rua Fictícia'));
  assert.ok(!message.includes('Zona A'));
  assert.match(message, /Taxa de entrega: R\$\s0,00/);
});
test('homologação bloqueia inclusive número explícito; número vazio não usa fallback', () => {
  const before = process.env.NEXT_PUBLIC_APP_ENV;
  process.env.NEXT_PUBLIC_APP_ENV = 'homologacao';
  assert.equal(whatsappUrl('teste', BUSINESS_WHATSAPP_PHONE), null);
  if (before === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env.NEXT_PUBLIC_APP_ENV = before;
  assert.equal(whatsappUrl('teste', ''), null);
});
test('homologação rejeita projeto de produção ou URLs misturadas', () => {
  const env = { NEXT_PUBLIC_APP_ENV: 'homologacao', SUPABASE_EXPECTED_PROJECT_REF: 'teste', SUPABASE_URL: 'https://teste.supabase.co', NEXT_PUBLIC_SUPABASE_URL: 'https://teste.supabase.co' };
  assert.doesNotThrow(() => validateHomologationEnvironment(env));
  assert.throws(() => validateHomologationEnvironment({ ...env, SUPABASE_URL: 'https://kjxivrltvdiswpaxjowa.supabase.co' }));
  assert.throws(() => validateHomologationEnvironment({ ...env, SUPABASE_EXPECTED_PROJECT_REF: 'kjxivrltvdiswpaxjowa' }));
});
