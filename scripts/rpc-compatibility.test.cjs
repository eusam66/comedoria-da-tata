const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
function compile(file, deps) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Date, SyntaxError, console: { error() {} }, require: name => { assert.ok(name in deps, name); return deps[name]; } });
  return exports;
}
function setup(rpcError = null) {
  const calls = [];
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: null }) };
  const once = compile('src/lib/orderIdempotency.ts', {});
  const api = compile('src/lib/orderRoute.ts', {
    'node:crypto': require('node:crypto'), 'next/server': { NextResponse }, '@/lib/orderIdempotency': once,
    '@/lib/supabaseAdmin': { default: { from: () => query, rpc: async (name, args) => {
      calls.push({ name, args }); return { data: { id: args.p_id, code: 'LOCAL', items: [], total: 59.9 }, error: rpcError };
    } } }, '@/lib/orders': { generateOrderCode: () => 'LOCAL' },
    '@/lib/storeSettings': { getCurrentStoreStatus: async () => ({ isOpen: true }) },
    '@/lib/deliveryZones': { isZoneId: () => true, readFulfillment: () => null },
  });
  return { ...api, calls };
}
const legacy = { customer: { name: 'LOCAL', phone: '000', delivery: 'pickup' }, items: [{ id: 'fake', quantity: 1 }] };
const confirmed = { ...legacy, expected_total_cents: 5990, items: [{ ...legacy.items[0], expected_unit_cents: 5990 }] };
const req = body => new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': '33333333-3333-4333-8333-333333333333' }, body: JSON.stringify(body) });
test('cliente legado continua no preço regular e RPC original; sem expectativa inventada', async () => {
  const api = setup(); assert.equal((await api.handleOrder(req(legacy))).status, 200);
  assert.equal(api.calls[0].name, 'create_order_with_stock');
  assert.equal(api.calls[0].args.p_customer.expected_total_cents, undefined);
});
test('contrato completo usa exclusivamente V2; preço manipulado não é encaminhado', async () => {
  const api = setup(); assert.equal((await api.handleOrder(req({ ...confirmed, price: .01 }))).status, 200);
  assert.equal(api.calls[0].name, 'create_order_with_stock_v2');
  assert.equal(api.calls[0].args.p_customer.expected_total_cents, 5990);
  assert.ok(!('price' in api.calls[0].args.p_items[0]));
});
test('expectativas parciais ou inválidas nunca degradam para o contrato legado', async () => {
  for (const body of [{ ...legacy, expected_total_cents: 5990 }, { ...legacy, items: confirmed.items },
    ...[null, -1, 1.1, '5990', 1e20].map(expected_total_cents => ({ ...confirmed, expected_total_cents }))]) {
    const api = setup(); assert.equal((await api.handleOrder(req(body))).status, 409); assert.equal(api.calls.length, 0);
  }
});
test('rota V2 exige confirmação inclusive de clientes sem campos', async () => {
  const api = setup(); assert.equal((await api.handleOrder(req(legacy), true)).status, 409); assert.equal(api.calls.length, 0);
  const route = compile('src/app/api/orders/v2/route.ts', { 'next/server': { NextResponse }, '@/lib/orderRoute': api });
  assert.equal((await route.POST(req(legacy))).status, 409);
  assert.equal((await (await route.GET()).json()).checkoutContract, 2);
});
test('JSON nulo, seleção inválida e quantidades fora do contrato são recusados antes da RPC', async () => {
  for (const body of [null, [], { ...legacy, items: {} }, ...[0, -1, 1.5, 21, '1'].map(quantity => ({ ...legacy, items: [{ id: 'fake', quantity }] }))]) {
    const api = setup(); assert.equal((await api.handleOrder(req(body))).status, 400); assert.equal(api.calls.length, 0);
  }
});
test('migração original permanece intacta e expansão não inclui SQL destrutivo', () => {
  const hash = require('node:crypto').createHash('sha256').update(fs.readFileSync('supabase/migrations/20261018153509_dish_promotions_manual.sql')).digest('hex');
  assert.equal(hash, 'a186a01c7d008abb129596831153cb4baa531029211cdcb3414eaed3b15118de');
  const name = fs.readdirSync('supabase/migrations').find(n => n.endsWith('_dish_promotions_rpc_compatibility.sql'));
  const sql = fs.readFileSync('supabase/migrations/' + name, 'utf8');
  assert.ok(!/\bdrop\s+(column|table|function)|\btruncate\b/i.test(sql));
  assert.ok(/create or replace function public.create_order_with_stock_v2\(/.test(sql));
  assert.ok(/from public, anon, authenticated/.test(sql));
  assert.ok(/search_path = ''/.test(sql));
  const rollback = fs.readFileSync('supabase/rollback/dish_promotions_manual.sql', 'utf8');
  assert.ok(!/\bdrop\s+(column|table|function)/i.test(rollback));
});

test('adicional duplicado é rejeitado de forma controlada na V2, sem HTTP 500', async () => {
  const api = setup({ message: 'DUPLICATE_ADDON' });
  assert.equal((await api.handleOrder(req(confirmed), true)).status, 400);
});
