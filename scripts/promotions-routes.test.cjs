const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
function compile(file, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, crypto: require('node:crypto').webcrypto, console: { error() {} }, Date, require: name => {
    assert.ok(name in deps, 'Dependência não isolada: ' + name); return deps[name];
  } });
  return exports;
}
const pricing = compile('src/lib/pricing.ts');
const idempotency = compile('src/lib/orderIdempotency.ts');
function adminSetup() {
  const writes = [];
  const current = { id: 'dish', price: 59.9, promo_price: 49.9, promo_active: false };
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: current }),
    insert: row => { writes.push(row); return query; }, update: row => { writes.push(row); return query; },
    single: async () => ({ data: { ...current, ...writes.at(-1) } }) };
  const api = compile('src/lib/adminApi.ts', { './pricing': pricing, './orders': {}, './supabaseAdmin': { default: { from: () => query } }, './slug': {}, './storageAdmin': {} });
  return { api, writes };
}
test('API administrativa valida registro completo ao ativar e ao mudar preço regular', async () => {
  const { api, writes } = adminSetup();
  for (const payload of [{ promo_price: 60 }, { promo_price: 0 }, { price: 40 }, { promo_price: null, promo_active: true }, { price: Infinity }, { promo_active: 'true' }])
    await assert.rejects(api.adminUpdateDish('dish', payload));
  assert.equal(writes.length, 0);
  await api.adminUpdateDish('dish', { promo_active: true });
  assert.equal(writes[0].promo_active, true);
  await api.adminUpdateDish('dish', { promo_active: false });
  assert.ok(!('promo_price' in writes[1]), 'Desativação preserva o valor configurado');
});
test('criação rejeita dados inválidos antes da escrita; cópia inicia inativa', async () => {
  const { api, writes } = adminSetup();
  await assert.rejects(api.adminCreateDish({ price: 10, promo_price: 12, promo_active: true }));
  assert.equal(writes.length, 0);
  await api.adminCreateDish({ name: 'Cópia', price: 10, stock: 0 });
  assert.equal(writes[0][0].promo_active, false);
  assert.equal(writes[0][0].stock, 0);
  assert.equal(writes[0][0].price, 10);
});
function ordersSetup({ rpcError, saved, findOrder } = {}) {
  const rpcCalls = [];
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: findOrder ?? null }) };
  const route = compile('src/lib/orderRoute.ts', {
    'node:crypto': require('node:crypto'), '@/lib/orderIdempotency': idempotency,
    'next/server': { NextResponse }, '@/lib/supabaseAdmin': { default: { from: () => query, rpc: async (name, args) => {
      rpcCalls.push({ name, args }); return { data: saved, error: rpcError };
    } } }, '@/lib/orders': { generateOrderCode: () => 'HOM1234' },
    '@/lib/storeSettings': { getCurrentStoreStatus: async () => ({ isOpen: true }) },
    '@/lib/deliveryZones': { isZoneId: () => true, readFulfillment: () => null },
  });
  return { POST: req => route.handleOrder(req), rpcCalls };
}
const payload = { customer: { name: 'HOMOLOGAÇÃO', phone: '000', delivery: 'pickup' }, expected_total_cents: 4990,
  items: [{ id: '647935d4-33b5-4133-baa4-37f4b04d617e', quantity: 1, price: .01, promo_price: .01, expected_unit_cents: 4990 }] };
function request(body = payload, key = '33333333-3333-4333-8333-333333333333') {
  return new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
}
test('rota encaminha somente expectativas e seleção; preço do navegador nunca vira valor cobrado', async () => {
  const api = ordersSetup({ saved: { id: 'saved', code: 'HOM1234', total: 49.9, items: [] } });
  const result = await api.POST(request());
  assert.equal(result.status, 200);
  const args = api.rpcCalls[0].args;
  assert.equal(args.p_customer.expected_total_cents, 4990);
  assert.equal(args.p_items[0].expected_unit_cents, 4990);
  assert.ok(!('price' in args.p_items[0]) && !('promo_price' in args.p_items[0]));
});
test('divergência retorna 409 com resumo e sem apresentar sucesso', async () => {
  const api = ordersSetup({ rpcError: { message: 'PRICE_CHANGED', details: JSON.stringify({ totalCents: 5990, items: [{ price: 59.9 }] }) } });
  const result = await api.POST(request());
  assert.equal(result.status, 409);
  const body = await result.json();
  assert.equal(body.code, 'PRICE_CHANGED'); assert.equal(body.quote.totalCents, 5990); assert.ok(!body.id);
});
test('falha de confirmação exige atualização e chave de idempotência continua obrigatória', async () => {
  const api = ordersSetup({ rpcError: { message: 'PRICE_CONFIRMATION_REQUIRED' } });
  assert.equal((await api.POST(request())).status, 409);
  assert.equal((await api.POST(request(payload, ''))).status, 400);
});
test('endpoints de promoção exigem autorização antes de chamar persistência', async () => {
  let calls = 0;
  const { PATCH } = compile('src/app/api/admin/dishes/[id]/route.ts', {
    'next/server': { NextResponse }, '@/lib/adminApi': { adminUpdateDish: async () => { calls++; } },
    '@/lib/adminAuthSafe': { requireAdmin: async () => { throw new Error('Forbidden'); } },
  });
  const response = await PATCH(request({ promo_active: true }), { params: Promise.resolve({ id: 'dish' }) });
  assert.equal(response.status, 403); assert.equal(calls, 0);
});
test('criação administrativa de pedido usa o mesmo caminho financeiro com idempotência', async () => {
  let called = false;
  const { POST } = compile('src/app/api/admin/orders/route.ts', {
    'next/server': { NextResponse }, '@/lib/adminApi': {},
    '@/lib/adminAuthSafe': { requireAdmin: async () => {} },
    '@/app/api/orders/route': { POST: async req => { called = req.headers.has('Idempotency-Key'); return NextResponse.json({ code: 'PRICE_CHANGED' }, { status: 409 }); } },
  });
  assert.equal((await POST(request())).status, 409); assert.equal(called, true);
});
