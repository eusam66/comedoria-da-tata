// Fluxo novo em navegador -> APIs reais -> RPC V2 -> snapshot, apenas fixtures de homologação.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
process.loadEnvFile('.env.local');
const REF = 'nkywpsftihxcuvdxeexn',
  TARGET = `https://${REF}.supabase.co`,
  BASE = 'http://localhost:3012';
async function main() {
  assert.equal(process.env.SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao');
  assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, REF);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(secret && process.env.HOMOLOGACAO_ADMIN_PASSWORD);
  async function remote(path, init = {}) {
    const r = await fetch(TARGET + path, {
      ...init,
      redirect: 'error',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
    assert.ok(r.ok, `HOMO HTTP ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }
  assert.equal(
    (await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value'))[0].value
      .project_ref,
    REF
  );
  const previousOperations = (
    await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value')
  )[0].value;
  const baseline = await remote(
    '/rest/v1/dishes?select=id,price,stock,promo_price,promo_active&order=id'
  );
  const child = spawn(
    process.execPath,
    [
      '--use-env-proxy',
      '--use-system-ca',
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3012',
    ],
    {
      env: { ...process.env, NO_PROXY: [process.env.NO_PROXY, 'localhost', '127.0.0.1'].join(',') },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const log = fs.createWriteStream('artifacts/etapa-c-checkout-server.log');
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let browser, auth, page, code;
  const fixtures = [];
  const errors = [];
  async function api(path, method = 'GET', data) {
    const r = await auth.request.fetch(BASE + path, { method, data });
    return { status: r.status(), json: await r.json() };
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Servidor não iniciou')), 15000);
      child.once('error', reject);
      child.stdout.on('data', (data) => {
        if (data.toString().includes('Ready in')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    browser = await chromium.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    });
    auth = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    assert.equal(
      (
        await api('/api/auth/login', 'POST', {
          email: 'admin-homologacao@example.invalid',
          password: process.env.HOMOLOGACAO_ADMIN_PASSWORD,
        })
      ).status,
      200
    );
    const suffix = randomUUID().slice(0, 8);
    const bev = await api('/api/admin/beverages', 'POST', {
      name: `HOMOLOGAÇÃO Recomendação Checkout ${suffix}`,
      price: 5.5,
      size: 'Teste',
      stock: 10,
    });
    assert.equal(bev.status, 200);
    fixtures.push({ kind: 'beverages', id: bev.json.id });
    const main = await api('/api/admin/dishes', 'POST', {
      name: `HOMOLOGAÇÃO Prato Checkout C ${suffix}`,
      slug: `etapa-c-checkout-${suffix}`,
      price: 59.9,
      promo_price: 49.9,
      promo_active: true,
      stock: 10,
      image: '/pratos/lasanha-1.jpg',
      related_products: [{ id: bev.json.id, type: 'beverage' }],
      extras: {
        addons: [{ id: 'extra', name: 'Extra C de teste', price: 2, maxQty: 1, required: false }],
      },
    });
    assert.equal(main.status, 200);
    fixtures.push({ kind: 'dishes', id: main.json.id });
    assert.equal((await api('/api/admin/order-operations', 'PUT', { mode: 'open' })).status, 200);
    const zones = (await api('/api/delivery-zones')).json;
    const zone = zones.find((z) => Number(z.fee) === 8.5);
    assert.ok(zone);
    await auth.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin === BASE) return route.continue();
      if (url.hostname === 'fonts.googleapis.com')
        return route.fulfill({ contentType: 'text/css', body: '' });
      return route.abort();
    });
    page = await auth.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    let orderPosts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/orders/v2') orderPosts++;
    });
    await page.goto(BASE + '/dishes/' + main.json.slug);
    await page.getByRole('button', { name: 'Aumentar Extra C de teste', exact: true }).click();
    await page.getByRole('button', { name: /Adicionar à sacola/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Seu carrinho', exact: true });
    await drawer.waitFor();
    const rec = drawer.locator('.cart-recommendations article').filter({ hasText: bev.json.name });
    await rec.getByRole('button', { name: '+ ADICIONAR', exact: true }).click();
    await page.waitForFunction(
      (id) => JSON.parse(localStorage.getItem('cart_v1') || '[]').some((i) => i.dish.id === id),
      bev.json.id
    );
    assert.equal(orderPosts, 0);
    assert.equal(
      (await api('/api/admin/dishes')).json.find((d) => d.id === main.json.id).stock,
      10
    );
    const finish = drawer.getByRole('button', { name: 'Finalizar pedido', exact: true });
    const rect = await finish.boundingBox();
    assert.ok(
      rect && rect.y >= 0 && rect.y + rect.height <= 844,
      'Ação final do drawer deve permanecer acessível'
    );
    await finish.click();
    await page.waitForURL(BASE + '/?checkout=1');
    await page
      .getByRole('textbox', { name: 'Nome completo', exact: true })
      .fill('HOMOLOGAÇÃO Navegador C');
    await page.getByRole('textbox', { name: 'Telefone', exact: true }).fill('000');
    await page.getByRole('textbox', { name: 'Rua / avenida', exact: true }).fill('Fictícia');
    await page.getByRole('textbox', { name: 'Número', exact: true }).fill('1');
    await page.getByRole('textbox', { name: 'Bairro', exact: true }).fill('Teste');
    await page.getByRole('combobox').selectOption(zone.id);
    assert.ok((await page.locator('.checkout-total').innerText()).includes('65,90'));
    await page.getByRole('radio', { name: 'Retirada', exact: true }).check();
    assert.ok((await page.locator('.checkout-total').innerText()).includes('57,40'));
    await page.getByRole('radio', { name: 'Entrega', exact: true }).check();
    await page.getByRole('combobox').selectOption(zone.id);
    await api('/api/admin/dishes/' + main.json.id, 'PATCH', { promo_active: false });
    let pending = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/orders/v2' && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click();
    const changed = await pending;
    assert.equal(changed.status(), 409);
    await page.getByRole('alert').filter({ hasText: 'Os preços mudaram' }).waitFor();
    assert.ok((await page.locator('.checkout-total').innerText()).includes('75,90'));
    assert.equal(
      (await api('/api/admin/dishes')).json.find((d) => d.id === main.json.id).stock,
      10
    );
    pending = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/orders/v2' && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click();
    const success = await pending;
    assert.equal(success.status(), 200);
    const receipt = await success.json();
    code = receipt.code;
    assert.equal(receipt.totalCents, 7590);
    assert.equal(receipt.items.length, 2);
    assert.equal(receipt.items[0].price, 61.9);
    assert.equal(receipt.items[1].price, 5.5);
    await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
    const message = await page
      .getByRole('textbox', { name: 'Mensagem do pedido', exact: true })
      .inputValue();
    assert.ok(
      message.includes(code) && message.includes('75,90') && message.includes(bev.json.name)
    );
    assert.equal(await page.getByRole('link', { name: 'ABRIR WHATSAPP', exact: true }).count(), 0);
    assert.ok(await page.getByRole('button', { name: 'ABRIR WHATSAPP', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'COPIAR MENSAGEM', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Mensagem copiada.' }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), message);
    assert.equal(orderPosts, 2);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'artifacts/etapa-c-checkout-390.png' });
    fs.writeFileSync(
      'artifacts/etapa-c-checkout-results.json',
      JSON.stringify(
        {
          status: 'passed',
          project: REF,
          viewport: '390x844',
          checks: [
            'Detalhe com adicional abre CartDrawer',
            'Recomendação de bebida real adicionada sem pedido/estoque',
            'Botão de finalizar visível no drawer',
            'Carrinho reidratado no checkout preserva tipos/adicionais',
            'Entrega R$65,90 e retirada R$57,40',
            'Desativação durante checkout rejeita 409 e atualiza resumo para R$75,90',
            'Segunda confirmação registra um único pedido fictício com snapshot correto',
            'Mensagem contém bebida e valores; copiar funciona; WhatsApp externo bloqueado',
            'Nenhum erro runtime/overflow',
          ],
          ordersCreated: 1,
          ordersCancelled: 1,
        },
        null,
        2
      )
    );
    console.log(
      'PASS: navegador -> sacola/recomendação -> checkout V2 real -> reconfirmação -> snapshot/WhatsApp, somente homologação'
    );
  } finally {
    try {
      if (page && !page.isClosed() && errors.length)
        await page.screenshot({ path: 'artifacts/etapa-c-checkout-failure.png' });
      if (auth) {
        if (code)
          assert.equal(
            (await api('/api/admin/orders/' + code, 'PATCH', { status: 'Cancelado' })).status,
            200
          );
        for (const row of fixtures.reverse())
          assert.equal((await api('/api/admin/' + row.kind + '/' + row.id, 'DELETE')).status, 200);
      }
      await remote('/rest/v1/restaurant_settings?key=eq.order_operations', {
        method: 'PATCH',
        body: JSON.stringify({ value: previousOperations }),
      });
      assert.deepEqual(
        await remote('/rest/v1/dishes?select=id,price,stock,promo_price,promo_active&order=id'),
        baseline
      );
    } finally {
      if (browser) await browser.close();
      child.kill('SIGTERM');
      log.end();
    }
  }
}
main().catch((e) => {
  console.error('FAIL: ' + e.message);
  console.error(e.stack?.split('\n').slice(-3).join('\n'));
  process.exitCode = 1;
});
