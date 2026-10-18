// Contratos REAIS da versão publicada e da branch, com Supabase real de homologação.
// Nenhum mock de RPC, preço, estoque, idempotência ou horário. Sem WhatsApp.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { randomUUID, createHash, webcrypto } = require('node:crypto');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const BASE_SHA = '8e5ef5430be8658d6852cf1c98832a9fbaea7ea9';
const REF = 'nkywpsftihxcuvdxeexn';
const TARGET = `https://${REF}.supabase.co`;
const edgeOnly = process.argv.includes('--edge-only');
const resultFile = edgeOnly ? 'artifacts/rpc-compatibility-edges.json' : 'artifacts/rpc-compatibility-real.json';
const result = { project: REF, base: BASE_SHA, matrix: {}, status: 'pending', calls: [] };
function save() { fs.mkdirSync('artifacts', { recursive: true }); fs.writeFileSync(resultFile, JSON.stringify(result, null, 2)); }
function pass(letter, evidence) { result.matrix[letter] = { status: 'passed', ...evidence }; console.log(`PASS ${letter}: ${JSON.stringify(evidence)}`); save(); }
async function main() {
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  for (const name of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) assert.equal(process.env[name], TARGET);
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao');
  assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, REF);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY; assert.ok(secret);
  if (secret.startsWith('eyJ')) assert.equal(JSON.parse(Buffer.from(secret.split('.')[1], 'base64url')).ref, REF);
  const client = createClient(TARGET, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  async function remote(route, method = 'GET', body) {
    assert.ok(route.startsWith('/') && !route.startsWith('//'));
    const response = await fetch(TARGET + route, { method, redirect: 'error', signal: AbortSignal.timeout(25000), headers: {
      apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Prefer: 'return=representation',
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    assert.ok(response.ok, `Homologação ${method} ${route.split('?')[0]} HTTP ${response.status}: ${data.code || 'falha'}`);
    return data;
  }
  const env = await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value');
  assert.equal(env[0]?.value?.project_ref, REF);
  const previousOps = (await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value;
  const beforeCatalog = await remote('/rest/v1/dishes?select=id,price,stock,promo_active,promo_price&order=id');
  const moduleCaches = new Map();
  function load(file, published = false) {
    const key = `${published}:${file}`;
    if (moduleCaches.has(key)) return moduleCaches.get(key);
    // Única injeção de ambiente: cliente configurado EXCLUSIVAMENTE para homologação.
    // A implementação da rota, store status e idempotência são carregadas sem alterações.
    if (file === 'src/lib/supabaseAdmin.ts') return { default: client };
    const source = published ? cp.execFileSync('git', ['show', `${BASE_SHA}:${file}`], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
    const exports = {}; moduleCaches.set(key, exports);
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, crypto: webcrypto, Date, SyntaxError, Request, Response, URL, console: { error() {}, warn() {} },
      require(name) {
        if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', published);
        if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)).replace(/\.ts$/, '') + '.ts', published);
        return require(name);
      },
    });
    return exports;
  }
  const legacySource = cp.execFileSync('git', ['show', `${BASE_SHA}:src/app/api/orders/route.ts`]);
  result.legacySourceSha256 = createHash('sha256').update(legacySource).digest('hex');
  const old = load('src/app/api/orders/route.ts', true);
  const current = load('src/app/api/orders/route.ts');
  const bridge = load('src/app/api/orders/v2/route.ts');
  const fixtures = { dishes: [], beverages: [], delivery_zones: [] };
  const attempts = new Set();
  let server;
  try {
    await remote('/rest/v1/restaurant_settings?key=eq.order_operations', 'PATCH', { value: { mode: 'open', expiresAt: null } });
    const suffix = randomUUID();
    const dish = (await remote('/rest/v1/dishes', 'POST', { name: `HOMOLOGAÇÃO RPC ${suffix}`, slug: `homologacao-rpc-${suffix}`, price: 59.9, stock: 100, is_available: true,
      promo_price: 49.9, promo_active: false, extras: { addons: [{ id: 'extra', name: 'Extra fictício', price: 2, maxQty: 2 }] } }))[0]; fixtures.dishes.push(dish.id);
    const drink = (await remote('/rest/v1/beverages', 'POST', { name: `HOMOLOGAÇÃO RPC ${suffix}`, size: 'Teste', price: 5.5, stock: 20 }))[0]; fixtures.beverages.push(drink.id);
    const zone = (await remote('/rest/v1/delivery_zones', 'POST', { name: `HOMOLOGAÇÃO RPC ${suffix}`, fee: 7.25, is_active: true }))[0]; fixtures.delivery_zones.push(zone.id);
    server = http.createServer(async (req, res) => {
      try {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();
        const request = new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, ...(body ? { body } : {}) });
        const handler = req.url.startsWith('/old/') ? old.POST : req.url.startsWith('/bridge/api/orders/v2') || req.url.endsWith('/v2') ? bridge.POST : current.POST;
        const response = await handler(request);
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
      } catch (e) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = async (route, body, key = randomUUID()) => {
      attempts.add(key);
      const response = await fetch(base + route, { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
      const json = await response.json(); result.calls.push({ route, status: response.status, code: json.code, totalCents: json.totalCents });
      assert.notEqual(response.status, 500, JSON.stringify({ route, error: json.error }));
      return { status: response.status, json, key };
    };
    const customer = { name: 'HOMOLOGAÇÃO Compatibilidade RPC', phone: '000', delivery: 'pickup' };
    const legacy = { customer, items: [{ id: dish.id, type: 'dish', quantity: 1, addons: [] }] };
    const expected = (unit = 5990) => ({ customer, expected_total_cents: unit, items: [{ ...legacy.items[0], expected_unit_cents: unit }] });
    const stock = async () => (await remote(`/rest/v1/dishes?id=eq.${dish.id}&select=stock`))[0].stock;
    const promo = active => remote(`/rest/v1/dishes?id=eq.${dish.id}`, 'PATCH', { promo_active: active });
    const accepted = async (route, body, total, unit = total) => {
      const before = await stock(); const r = await post(route, body); assert.equal(r.status, 200);
      assert.equal(r.json.totalCents, total); assert.equal(r.json.items[0].price, unit / 100);
      assert.equal(await stock(), before - body.items.filter(i => i.type !== 'beverage').reduce((n, i) => n + i.quantity, 0)); return r;
    };
    if (edgeOnly) {
      await promo(true);
      const before = await stock();
      const duplicate = await post('/new/api/orders/v2', { ...expected(5390), items: [{ ...expected(5390).items[0], addons: [{ addonId: 'extra', qty: 1 }, { addonId: 'extra', qty: 1 }] }] });
      assert.equal(duplicate.status, 400);
      assert.equal((await post('/new/api/orders/v2', null)).status, 400);
      assert.equal((await post('/new/api/orders/v2', { ...expected(), items: [1] })).status, 400);
      assert.equal(await stock(), before);
      pass('I-edge', { duplicateAddonV2: 400, nullJson: 400, primitiveItem: 400, stockUnchanged: true });
      result.status = 'passed'; return;
    }
    const a = await accepted('/old/api/orders', legacy, 5990);
    pass('A', { http: a.status, totalCents: a.json.totalCents, realPublishedRoute: true, stockDeduction: 1 });
    const b = await accepted('/new/api/orders/v2', expected(), 5990);
    // PWA antigo servido pela aplicação nova não é obrigado a atualizar para pedir.
    const oldPwa = await accepted('/new/api/orders', legacy, 5990);
    pass('B', { http: b.status, totalCents: b.json.totalCents, oldPwaOnNewApi: oldPwa.status });
    const beforePromo = await stock(); await promo(true); assert.equal(await stock(), beforePromo);
    const c = await accepted('/new/api/orders/v2', expected(4990), 4990);
    assert.equal(c.json.items[0].promo_active, true); assert.equal(c.json.items[0].regular_price, 59.9);
    pass('C', { http: c.status, totalCents: c.json.totalCents, regularPrice: c.json.items[0].regular_price });
    await promo(false); const d = await accepted('/new/api/orders/v2', expected(), 5990);
    const history = (await remote(`/rest/v1/orders?id=eq.${c.json.id}&select=items,total`))[0];
    assert.equal(history.total, 49.9); assert.equal(history.items[0].promo_active, true);
    pass('D', { http: d.status, totalCents: d.json.totalCents, historicalPromoTotalCents: 4990 });
    await promo(true); const e = await accepted('/old/api/orders', { ...legacy, price: .01 }, 5990);
    pass('E', { http: e.status, totalCents: e.json.totalCents, contract: 'legacy_regular', noUnexpectedDiscount: true });
    const beforeChange = await stock(); await promo(false);
    const changed = await post('/new/api/orders/v2', expected(4990)); assert.equal(changed.status, 409); assert.equal(changed.json.code, 'PRICE_CHANGED');
    assert.equal(changed.json.quote.totalCents, 5990); assert.equal(await stock(), beforeChange);
    assert.equal((await remote(`/rest/v1/orders?id=eq.${changed.key}&select=id`)).length, 0);
    const confirmed = await accepted('/new/api/orders/v2', expected(5990), 5990);
    pass('F', { initial: 409, code: changed.json.code, noOrderOrStockLossBeforeReconfirmation: true, confirmed: confirmed.status, totalCents: 5990 });
    await promo(true);
    const g = await accepted('/old/api/orders', legacy, 5990);
    const bridgeOrder = await accepted('/bridge/api/orders/v2', expected(4990), 4990);
    const same = await post('/new/api/orders/v2', expected(4990), bridgeOrder.key);
    assert.equal(same.json.id, bridgeOrder.json.id); assert.equal(same.json.totalCents, 4990);
    pass('G', { legacyRollback: g.status, legacyCents: 5990, cachedNewClientThroughBridge: bridgeOrder.status, promoCents: 4990, sameOrderAcrossDeployments: true });
    const beforeRace = await stock(); const key = randomUUID();
    const race = await Promise.all([post('/old/api/orders', legacy, key), post('/new/api/orders', legacy, key)]);
    race.forEach(r => assert.equal(r.status, 200)); assert.equal(race[0].json.id, race[1].json.id); assert.equal(await stock(), beforeRace - 1);
    const key2 = randomUUID(); const beforeV2 = await stock();
    const raceV2 = await Promise.all([post('/new/api/orders/v2', expected(4990), key2), post('/bridge/api/orders/v2', expected(4990), key2)]);
    raceV2.forEach(r => assert.equal(r.status, 200)); assert.equal(raceV2[0].json.id, raceV2[1].json.id); assert.equal(await stock(), beforeV2 - 1);
    await remote(`/rest/v1/dishes?id=eq.${dish.id}`, 'PATCH', { stock: 1, is_available: true });
    const last = await Promise.all([post('/old/api/orders', legacy), post('/new/api/orders/v2', expected(4990))]);
    assert.deepEqual(last.map(r => r.status).sort(), [200, 409]); assert.equal(await stock(), 0);
    await remote(`/rest/v1/dishes?id=eq.${dish.id}`, 'PATCH', { stock: beforeV2 - 2, is_available: true });
    pass('H', { oldAndNewLegacySameKey: race.map(r => r.status), newAndBridgeSameKey: raceV2.map(r => r.status), lastUnit: last.map(r => r.status), duplicateStockDeduction: false });
    const invalids = [legacy, { ...expected(), expected_total_cents: null }, { ...expected(), expected_total_cents: '5990' },
      { ...expected(), expected_total_cents: -1 }, { ...expected(), items: [{ ...expected().items[0], expected_unit_cents: 49.9 }] },
      { ...expected(), items: [{ ...expected().items[0], addons: [{ addonId: 'not-in-catalog', qty: 1 }] }] }];
    const beforeInvalid = await stock();
    for (const body of invalids) assert.ok([400, 409].includes((await post('/new/api/orders/v2', body)).status));
    assert.equal((await post('/new/api/orders', { ...legacy, expected_total_cents: 5990 })).status, 409);
    const oldInvalid = await post('/old/api/orders', { ...legacy, items: [{ ...legacy.items[0], addons: [{ addonId: 'bad', qty: 1 }] }] }); assert.equal(oldInvalid.status, 400);
    const duplicateAddon = await post('/old/api/orders', { ...legacy, items: [{ ...legacy.items[0], addons: [{ addonId: 'extra', qty: 1 }, { addonId: 'extra', qty: 1 }] }] }); assert.equal(duplicateAddon.status, 400);
    assert.equal(await stock(), beforeInvalid);
    const tampered = await accepted('/new/api/orders/v2', { ...expected(4990), items: [{ ...expected(4990).items[0], price: .01, promo_price: .01 }] }, 4990);
    pass('I', { invalidOrPartial: '400/409; nenhuma escrita', invalidOldApi: oldInvalid.status, duplicateAddonOldApi: duplicateAddon.status, tamperedPriceChargedCents: tampered.json.totalCents });
    const deliveryCustomer = { ...customer, delivery: 'delivery', delivery_zone_id: zone.id, street: 'Fictícia', number: '1', neighborhood: 'Teste' };
    const lines = [{ id: dish.id, type: 'dish', quantity: 2, expected_unit_cents: 5190, addons: [{ addonId: 'extra', qty: 1, price: .01 }] }, { id: drink.id, type: 'beverage', quantity: 2, expected_unit_cents: 550 }];
    const j = await accepted('/new/api/orders/v2', { customer: deliveryCustomer, items: lines, expected_total_cents: 12205 }, 12205, 5190);
    assert.equal(j.json.fulfillment.delivery_fee, 7.25); assert.equal(j.json.subtotalCents, 11480);
    const jOld = await accepted('/old/api/orders', { customer: deliveryCustomer, items: lines.map(line => { const copy = { ...line }; delete copy.expected_unit_cents; return copy; }) }, 14205, 6190);
    pass('J', { newTotalCents: j.json.totalCents, oldTotalCents: jOld.json.totalCents, newSubtotalCents: j.json.subtotalCents, deliveryCents: 725, addonsCentsPerUnit: 200 });
    // Verifica a resolução real pelo PostgREST sem criar pedido: EMPTY_ORDER vem antes de qualquer baixa.
    for (const name of ['create_order_with_stock', 'create_order_with_stock_v2']) {
      const { error } = await client.rpc(name, { p_id: randomUUID(), p_code: 'HOM-EMPTY', p_customer: { delivery: 'pickup' }, p_items: [] });
      assert.equal(error?.message, 'EMPTY_ORDER', `Resolução PostgREST de ${name}`);
    }
    result.postgrestResolvedBothContracts = true;
    result.status = 'passed';
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    const errors = [];
    for (const id of attempts) {
      try {
        const saved = await remote(`/rest/v1/orders?id=eq.${id}&select=code`);
        if (saved.length) {
          const { error } = await client.rpc('update_order_status_with_stock_restore', { p_code: saved[0].code, p_status: 'Cancelado' });
          assert.ok(!error, 'Cancelamento de fixture falhou');
          const { error: twice } = await client.rpc('update_order_status_with_stock_restore', { p_code: saved[0].code, p_status: 'Cancelado' });
          assert.ok(!twice, 'Cancelamento repetido falhou');
        }
      } catch { errors.push('pedido fictício pendente'); }
    }
    for (const table of ['dishes', 'beverages', 'delivery_zones']) for (const id of fixtures[table]) {
      try { await remote(`/rest/v1/${table}?id=eq.${id}`, 'DELETE'); } catch { errors.push('fixture ' + table); }
    }
    try { await remote('/rest/v1/restaurant_settings?key=eq.order_operations', 'PATCH', { value: previousOps }); } catch { errors.push('funcionamento'); }
    try {
      assert.deepEqual(await remote('/rest/v1/dishes?select=id,price,stock,promo_active,promo_price&order=id'), beforeCatalog);
      assert.deepEqual((await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value, previousOps);
    } catch { errors.push('estado final diferente'); }
    result.cleanup = errors.length ? errors : 'passed';
    if (errors.length) { result.status = 'cleanup_required'; process.exitCode = 1; }
    save();
  }
}
main().catch(error => { result.status = 'failed'; result.error = error.message.replace(/(?:eyJ|sb_secret_)[A-Za-z0-9_.-]+/g, '[REDACTED]'); save(); console.error(result.error); console.error(error.stack?.split('\n').slice(-3).join('\n')); process.exitCode = 1; });
