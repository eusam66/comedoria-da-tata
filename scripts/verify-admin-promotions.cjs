// Homologação real exclusiva da Comedoria. Nunca abre WhatsApp ou qualquer produção.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const REF = 'nkywpsftihxcuvdxeexn';
const TARGET = `https://${REF}.supabase.co`;
const BASE = 'http://localhost:3003';
const output = { project: REF, checks: [], screenshots: [], status: 'pending' };
function pass(name) { output.checks.push(name); console.log('PASS: ' + name); }
function save() { fs.mkdirSync('artifacts', { recursive: true }); fs.writeFileSync('artifacts/admin-promotions-results.json', JSON.stringify(output, null, 2)); }
async function main() {
  for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) assert.equal(process.env[key], TARGET);
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao');
  assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, REF);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(secret && process.env.HOMOLOGACAO_ADMIN_PASSWORD);
  if (secret.startsWith('eyJ')) assert.equal(JSON.parse(Buffer.from(secret.split('.')[1], 'base64url')).ref, REF);
  const remote = async (path, init = {}) => {
    assert.ok(path.startsWith('/') && !path.startsWith('//'));
    const response = await fetch(TARGET + path, { ...init, redirect: 'error', signal: AbortSignal.timeout(20000), headers: {
      apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', ...init.headers,
    } });
    assert.ok(response.ok, `Homologação HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  assert.equal((await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value'))[0]?.value?.project_ref, REF);
  const previousOperations = (await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value;
  pass('host, segredo e marcador confirmam homologação antes das escritas');
  const child = spawn(process.execPath, ['--use-env-proxy', '--use-system-ca', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3003'], {
    env: { ...process.env, NO_PROXY: [process.env.NO_PROXY, 'localhost', '127.0.0.1'].filter(Boolean).join(',') }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser, auth;
  const fixtures = { dishes: [], beverages: [], categories: [], banners: [] };
  const orders = new Set();
  async function api(path, method = 'GET', data, context = auth, extra = {}) {
    assert.ok(path.startsWith('/') && !path.startsWith('//'));
    const response = await context.request.fetch(BASE + path, { method, data, headers: extra, timeout: 30000 });
    const json = await response.json();
    return { status: response.status(), json };
  }
  async function patchDish(id, patch) { const r = await api(`/api/admin/dishes/${id}`, 'PATCH', patch); assert.equal(r.status, 200); return r.json; }
  async function cancel(code) { assert.equal((await api(`/api/admin/orders/${code}`, 'PATCH', { status: 'Cancelado' })).status, 200); orders.delete(code); }
  async function order(body, key = randomUUID()) {
    const r = await api('/api/orders', 'POST', body, auth, { 'Idempotency-Key': key });
    if (r.status === 200) orders.add(r.json.code);
    return r;
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Servidor não iniciou')), 15000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('Servidor falhou')); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Porta ocupada ou servidor encerrado')); });
      child.stdout.on('data', chunk => { if (chunk.toString().includes('Ready in')) { clearTimeout(timer); resolve(); } });
      child.stderr.on('data', () => {});
    });
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    auth = await browser.newContext({ serviceWorkers: 'block' });
    const login = await api('/api/auth/login', 'POST', { email: 'admin-homologacao@example.invalid', password: process.env.HOMOLOGACAO_ADMIN_PASSWORD });
    assert.equal(login.status, 200);
    assert.equal((await api('/api/admin/orders', 'POST', { items: [] })).status, 400, 'Criação administrativa também exige chave de idempotência');
    const anonymous = await browser.newContext();
    assert.equal((await api('/api/admin/dishes', 'POST', { price: 1 }, anonymous)).status, 401);
    await anonymous.close();
    pass('login administrativo real; alteração anônima rejeitada');
    const suffix = randomUUID().slice(0, 8);
    for (const [kind, payload] of [
      ['categories', { name: `HOMOLOGAÇÃO Categoria ${suffix}`, slug: `homolog-promo-cat-${suffix}` }],
      ['beverages', { name: `HOMOLOGAÇÃO Bebida ${suffix}`, size: 'Teste', price: 5.5, stock: 10 }],
      ['banners', { title: `HOMOLOGAÇÃO Banner ${suffix}`, active: false }],
    ]) {
      const created = await api(`/api/admin/${kind}`, 'POST', payload); assert.equal(created.status, 200, `Criar fixture ${kind}: ${created.json.error || created.status}`); fixtures[kind].push(created.json);
    }
    const created = await api('/api/admin/dishes', 'POST', { name: `HOMOLOGAÇÃO Oferta ${suffix}`, slug: `homolog-promo-${suffix}`, price: 59.9,
      stock: 10, categoryId: fixtures.categories[0].id, promo_price: 49.9, promo_active: false,
      extras: { addons: [{ id: 'extra', name: 'Extra fictício', price: 2, maxQty: 2, required: false }] } });
    assert.equal(created.status, 200); const dish = created.json; fixtures.dishes.push(dish);
    const zones = (await api('/api/delivery-zones')).json; const zone = zones.find(z => z.name === 'HOMOLOGAÇÃO Zona A'); assert.ok(zone);
    await patchDish(dish.id, { promo_active: true });
    assert.equal((await api('/api/admin/order-operations', 'PUT', { mode: 'open' })).status, 200);
    if (!process.argv.includes('--ui-only') && !process.argv.includes('--navigation-only')) {
    for (const promo_price of [0, -1, 59.9, 60, 'NaN', null]) {
      assert.equal((await api(`/api/admin/dishes/${dish.id}`, 'PATCH', { promo_active: true, promo_price })).status, 400);
    }
    await patchDish(dish.id, { promo_active: true });
    assert.equal((await api(`/api/admin/dishes/${dish.id}`, 'PATCH', { price: 49.9 })).status, 400);
    pass('validação real: zero, negativo, igual, maior, inválido, ausente e alteração de preço normal');
    const operations = await api('/api/admin/order-operations', 'PUT', { mode: 'open' }); assert.equal(operations.status, 200);
    const customer = { name: 'HOMOLOGAÇÃO Promoção', phone: '000', delivery: 'delivery', delivery_zone_id: zone.id, street: 'Fictícia', number: '1', neighborhood: 'Teste' };
    const body = { customer, expected_total_cents: 10380 + Math.round(zone.fee * 100), items: [{ id: dish.id, type: 'dish', quantity: 2,
      expected_unit_cents: 5190, price: .01, addons: [{ addonId: 'extra', qty: 1, price: .01 }] }] };
    const key = randomUUID();
    const responses = await Promise.all([order(body, key), order(body, key)]);
    responses.forEach(r => assert.equal(r.status, 200));
    assert.equal(responses[0].json.id, responses[1].json.id);
    assert.equal(responses[0].json.totalCents, body.expected_total_cents);
    assert.equal(responses[0].json.items[0].price, 51.9);
    assert.equal((await api('/api/admin/dishes')).json.find(d => d.id === dish.id).stock, 8);
    await patchDish(dish.id, { promo_active: false });
    const historical = (await remote(`/rest/v1/orders?id=eq.${key}&select=items,total`))[0];
    assert.equal(historical.items[0].price, 51.9); assert.equal(historical.items[0].promo_active, true);
    const priceChange = await order(body); assert.equal(priceChange.status, 409); assert.equal(priceChange.json.code, 'PRICE_CHANGED');
    assert.equal(priceChange.json.quote.totalCents, body.expected_total_cents + 2000);
    assert.equal((await api('/api/admin/dishes')).json.find(d => d.id === dish.id).stock, 8);
    await cancel(responses[0].json.code); await cancel(responses[0].json.code);
    assert.equal((await api('/api/admin/dishes')).json.find(d => d.id === dish.id).stock, 10);
    await patchDish(dish.id, { promo_active: true, stock: 1 });
    const pickupBody = { customer: { ...customer, delivery: 'pickup' }, expected_total_cents: 4990, items: [{ id: dish.id, quantity: 1, expected_unit_cents: 4990 }] };
    const race = await Promise.all([order(pickupBody), order(pickupBody)]);
    assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
    for (const r of race) if (r.status === 200) { assert.equal(r.json.fulfillment.delivery_fee, 0); await cancel(r.json.code); }
    await patchDish(dish.id, { stock: 10 });
    pass('financeiro real: promoção + adicional + quantidade + taxa; idempotência, snapshot, reprecificação, rollback, retirada e concorrência de estoque');
    }
    const state = await auth.storageState();
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }, { width: 320, height: 700 }]) {
      const context = await browser.newContext({ viewport, storageState: state, serviceWorkers: 'block', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== BASE) {
          if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow em ${page.url()} @${viewport.width}`);
      for (const [kind, record] of [['dishes', dish], ['beverages', fixtures.beverages[0]], ['categories', fixtures.categories[0]], ['banners', fixtures.banners[0]]]) {
        await page.goto(`${BASE}/admin/${kind}`);
        assert.ok((await page.title()).includes('Comedoria'));
        const card = page.locator(`[data-admin-item="${record.id}"]`);
        await card.getByRole('button', { name: 'Editar', exact: true }).click();
        await page.waitForFunction(() => document.activeElement?.textContent?.startsWith('EDITANDO:'));
        const heading = page.locator('.admin-editor-heading');
        const rect = await heading.boundingBox(); assert.ok(rect.y >= 0 && rect.y < viewport.height, 'Título fora do viewport');
        await noOverflow();
        console.log(`UI: ${kind} ${viewport.width} foco correto`);
        if (kind === 'dishes') { await page.screenshot({ path: `artifacts/admin-edit-${viewport.width}.png` }); output.screenshots.push(`artifacts/admin-edit-${viewport.width}.png`); }
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-item') === id, record.id);
        if (kind !== 'dishes') {
          await card.getByRole('button', { name: 'Editar', exact: true }).click();
          await page.getByRole('button', { name: /^Salvar/ }).click();
          await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-item') === id, record.id);
          if (viewport.width === 320) {
            page.once('dialog', dialog => dialog.accept());
            await card.getByRole('button', { name: 'Excluir', exact: true }).click();
            await page.waitForFunction(id => !document.querySelector(`[data-admin-item="${id}"]`), record.id);
            fixtures[kind] = fixtures[kind].filter(item => item.id !== record.id);
          }
        }
        if (kind === 'dishes') {
          await page.getByLabel('Pesquisar pratos').fill('HOMOLOGAÇÃO Oferta');
          await card.getByRole('button', { name: 'Editar', exact: true }).click();
          await page.waitForFunction(() => document.activeElement?.textContent?.startsWith('EDITANDO:'));
          await page.getByLabel('Preço promocional (R$)', { exact: true }).fill('48.90');
          if (viewport.width === 390) {
            const failure = route => route.request().method() === 'PATCH' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'HOMOLOGAÇÃO: falha simulada' }) }) : route.fallback();
            await context.route(`${BASE}/api/admin/dishes/${dish.id}`, failure);
            await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
            await page.getByRole('alert').filter({ hasText: 'HOMOLOGAÇÃO: falha simulada' }).waitFor();
            assert.equal(Number(await page.getByLabel('Preço promocional (R$)', { exact: true }).inputValue()), 48.9);
            assert.ok((await heading.innerText()).startsWith('EDITANDO:'));
            await context.unroute(`${BASE}/api/admin/dishes/${dish.id}`, failure);
            await page.locator('input[type="file"]').first().setInputFiles({ name: 'homologacao-promo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1C8AAAAASUVORK5CYII=', 'base64') });
          }
          await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
          await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-item') === id, record.id);
          assert.equal(await page.getByLabel('Pesquisar pratos').inputValue(), 'HOMOLOGAÇÃO Oferta');
          if (viewport.width === 390) {
            const uploaded = (await api('/api/admin/dishes')).json.find(row => row.id === dish.id).image_url;
            assert.equal(new URL(uploaded).origin, TARGET);
            pass('Falha de salvamento preserva rascunho (503 simulado); nova tentativa e upload reais só na homologação');
          }
          await card.getByRole('button', { name: `Desativar promoção de ${record.name}`, exact: true }).click();
          await card.getByRole('button', { name: `Ativar promoção de ${record.name}`, exact: true }).waitFor();
          assert.equal(await card.locator('.offer-label').count(), 0, 'Selo deve sumir ao desativar');
          await card.getByRole('button', { name: `Ativar promoção de ${record.name}`, exact: true }).click();
          await card.locator('.offer-label').waitFor();
          await page.getByRole('combobox', { name: /Exibir/ }).selectOption('promo');
          assert.ok(await card.isVisible());
          await page.reload(); await card.waitFor(); assert.equal(await page.getByRole('combobox', { name: /Exibir/ }).inputValue(), 'promo');
          await page.getByRole('combobox', { name: /Exibir/ }).selectOption('all');
          const duplicateResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/admin/dishes');
          await card.getByRole('button', { name: 'Duplicar', exact: true }).click();
          const dup = await (await duplicateResponse).json();
          fixtures.dishes.push({ id: dup.id });
          const duplicate = page.locator(`[data-admin-item="${dup.id}"]`);
          await duplicate.waitFor();
          const dupId = dup.id;
          const copied = (await api('/api/admin/dishes')).json.find(row => row.id === dupId);
          assert.equal(copied.stock, 0); assert.equal(copied.promo_active, false); assert.equal(copied.price, 59.9);
          await duplicate.getByRole('button', { name: `Ativar promoção de ${copied.name}`, exact: true }).click();
          await page.waitForFunction(() => document.activeElement?.textContent?.startsWith('EDITANDO:'));
          assert.ok((await page.locator('.admin-editor-heading').innerText()).includes('(cópia)'));
          await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
          await page.getByRole('combobox', { name: /Exibir/ }).selectOption('empty');
          assert.ok(await duplicate.isVisible());
          await page.getByRole('combobox', { name: /Exibir/ }).selectOption('available');
          await card.waitFor();
          assert.equal(await duplicate.count(), 0);
          await page.getByRole('combobox', { name: /Exibir/ }).selectOption('all');
          page.once('dialog', dialog => dialog.accept());
          await duplicate.getByRole('button', { name: 'Excluir', exact: true }).click();
          await page.waitForFunction(id => !document.querySelector(`[data-admin-item="${id}"]`), dupId);
          fixtures.dishes = fixtures.dishes.filter(item => item.id !== dupId);
          await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-item') === id, dish.id);
          if (viewport.width === 390) {
            const patchResponse = () => page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/admin/dishes/${dish.id}`);
            let changed = patchResponse();
            await card.getByRole('button', { name: `Aumentar estoque de ${dish.name}`, exact: true }).click();
            assert.equal((await (await changed).json()).stock, 11);
            changed = patchResponse();
            await card.getByRole('button', { name: `Diminuir estoque de ${dish.name}`, exact: true }).click();
            assert.equal((await (await changed).json()).stock, 10);
          }
          await page.getByRole('combobox', { name: /Exibir/ }).selectOption('all');
          if (viewport.width === 390) {
            await card.getByRole('button', { name: 'Editar', exact: true }).click();
            await page.getByLabel('Preço promocional (R$)', { exact: true }).fill('47.90');
            const dismiss = dialog => dialog.dismiss(); page.once('dialog', dismiss);
            await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
            assert.equal(Number(await page.getByLabel('Preço promocional (R$)', { exact: true }).inputValue()), 47.9);
            page.once('dialog', dialog => dialog.accept());
            await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
            await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-item') === id, dish.id);
          }
          await page.screenshot({ path: `artifacts/admin-promotions-${viewport.width}.png` });
          output.screenshots.push(`artifacts/admin-promotions-${viewport.width}.png`);
          await patchDish(dish.id, { promo_price: 49.9, promo_active: true });
        }
      }
      // Todas as rotas administrativas, inclusive taxas e funcionamento.
      for (const path of ['/admin', '/admin/orders', '/admin/settings']) {
        await page.goto(BASE + path); await page.locator('h1').waitFor(); await noOverflow();
      }
      await page.getByRole('heading', { name: 'Taxas de entrega', exact: true }).waitFor();
      const zoneCard = page.locator(`[data-admin-item="${zone.id}"]`);
      await zoneCard.getByRole('button', { name: 'Editar', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.textContent?.startsWith('EDITANDO:'));
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-item') === id, zone.id);
      if (viewport.width < 768) {
        await page.getByText('Mais', { exact: true }).click();
        await page.getByRole('navigation', { name: 'Painel administrativo móvel' }).getByRole('link', { name: 'Categorias' }).click();
        await page.getByRole('heading', { name: 'Categorias da loja' }).waitFor();
        assert.equal(await page.locator('.admin-mobile-nav [aria-current="page"]').getAttribute('href'), '/admin/categories');
        assert.ok((await page.locator('.admin-mobile-nav summary').getAttribute('class')).includes('admin-nav-active'));
      }
      if(process.argv.includes('--navigation-only')) {
        assert.equal(errors.length,0,errors.join('; '));await context.close();
        pass(`Navegação administrativa ${viewport.width}: editores, foco, retorno, numéricos, estoque fictício, filtros, dashboard, pedidos, configurações, taxas e barra mobile`);
        continue;
      }
      await page.goto(BASE);
      await page.getByRole('heading', { name: 'Ofertas da Comedoria' }).waitFor();
      await noOverflow();
      await page.screenshot({ path: `artifacts/offers-${viewport.width}.png` });
      output.screenshots.push(`artifacts/offers-${viewport.width}.png`);
      const offer = page.locator('.offer-card').filter({ hasText: dish.name });
      await offer.getByRole('button', { name: 'Adicionar', exact: true }).click();
      await page.locator('.header-cart').click();
      await page.getByRole('button', { name: 'Continuar para entrega' }).click();
      await page.getByRole('textbox', { name: 'Nome completo' }).fill('HOMOLOGAÇÃO Checkout promoção');
      await page.getByRole('textbox', { name: 'Telefone', exact: true }).fill('000');
      await page.getByRole('radio', { name: 'Retirada', exact: true }).check();
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')));
      await noOverflow();
      await patchDish(dish.id, { promo_active: false });
      let responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/orders/v2');
      await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click();
      const changed = await responsePromise; assert.equal(changed.status(), 409);
      await page.getByRole('alert').filter({ hasText: 'Os preços mudaram' }).waitFor();
      assert.ok((await page.locator('.checkout-total').innerText()).includes('59,90'));
      assert.equal(await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).count(), 0);
      responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/orders/v2');
      await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click();
      const confirmed = await responsePromise; assert.equal(confirmed.status(), 200);
      const receipt = await confirmed.json(); orders.add(receipt.code); assert.equal(receipt.totalCents, 5990);
      await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
      const message = await page.getByRole('textbox', { name: 'Mensagem do pedido' }).inputValue();
      assert.ok(message.includes('59,90') && message.includes(receipt.code));
      assert.equal(await page.getByRole('link', { name: 'ABRIR WHATSAPP', exact: true }).count(), 0);
      await page.screenshot({ path: `artifacts/checkout-promotions-${viewport.width}.png` });
      output.screenshots.push(`artifacts/checkout-promotions-${viewport.width}.png`);
      await cancel(receipt.code);
      await patchDish(dish.id, { promo_active: true });
      pass(`Checkout real ${viewport.width}: oferta no mesmo carrinho, preço alterado bloqueia confirmação, resumo atualizado, segundo clique consciente e WhatsApp usa snapshot; nenhum envio externo`);
      assert.equal(errors.length, 0, errors.join('; '));
      await context.close();
      pass(`UI administrativa ${viewport.width}x${viewport.height}: quatro editores, salvar/cancelar/retorno/foco, promo rápida, duplicação, filtros persistidos, dashboard/pedidos/configurações/taxas sem overflow ou erro runtime`);
    }
    output.status = 'passed';
  } finally {
    if (auth) {
      for (const code of orders) { try { await cancel(code); } catch { output.cleanupPending = true; } }
      // Apenas fixtures criadas nesta execução; pedidos fictícios preservados e cancelados.
      for (const kind of ['dishes', 'beverages', 'banners', 'categories']) for (const fixture of fixtures[kind]) {
        try { assert.equal((await api(`/api/admin/${kind}/${fixture.id}`, 'DELETE')).status, 200); } catch { output.cleanupPending = true; }
      }
    }
    try { await remote('/rest/v1/restaurant_settings?key=eq.order_operations', { method: 'PATCH', body: JSON.stringify({ value: previousOperations }) }); }
    catch { output.cleanupPending = true; }
    if (browser) await browser.close(); child.kill('SIGTERM');
    if (output.cleanupPending) { output.status = 'cleanup_required'; process.exitCode = 1; }
    save();
  }
}
main().catch(error => { output.status = 'failed'; output.error = String(error.message).replace(/(?:eyJ|sb_secret_)[A-Za-z0-9_.-]+/g, '[REDACTED]'); save(); console.error('FAIL: ' + output.error); console.error(error.stack?.split('\n').slice(-4).join('\n'));  process.exitCode = 1; });
