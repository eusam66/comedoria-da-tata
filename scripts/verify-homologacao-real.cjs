// Integração REAL e exclusiva da homologação. Sem mocks de API ou dados de produção.
// Executar com Node 24: node --use-env-proxy --use-system-ca --env-file=.env.local scripts/verify-homologacao-real.cjs
// Secrets apenas no ambiente: SUPABASE_SERVICE_ROLE_KEY e HOMOLOGACAO_ADMIN_PASSWORD.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const REF = 'nkywpsftihxcuvdxeexn';
const TARGET = `https://${REF}.supabase.co`;
const EMAIL = 'admin-homologacao@example.invalid';
const BASE = 'http://localhost:3002';
const result = { project: REF, status: 'pending', checks: [] };
const check = name => { result.checks.push(name); console.log(`PASS: ${name}`); };
function save() { fs.mkdirSync('artifacts', { recursive: true }); fs.writeFileSync('artifacts/homologacao-real-results.json', JSON.stringify(result, null, 2)); }
function guard() {
  for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) assert.equal(process.env[key]?.replace(/\/$/, ''), TARGET, `${key}: homologação exclusiva obrigatória`);
  assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, REF, 'Ref esperado incorreto');
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao', 'WhatsApp deve estar bloqueado em homologação');
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret?.startsWith('eyJ')) {
    let claims;
    try { claims = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString()); } catch { throw new Error('Chave administrativa inválida'); }
    assert.equal(claims.ref, REF, 'Chave de outro projeto: execução bloqueada antes de qualquer escrita');
    assert.equal(claims.role, 'service_role', 'Chave deve ser administrativa e exclusiva do servidor');
  }
}
async function remote(path, init = {}) {
  assert.ok(path.startsWith('/') && !path.startsWith('//'), 'Caminho remoto inválido');
  const response = await fetch(TARGET + path, { ...init, redirect: 'error', signal: AbortSignal.timeout(20000), headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', ...init.headers,
  } });
  assert.ok(response.ok, `Supabase de homologação retornou HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}
async function main() {
  guard();
  const missing = ['SUPABASE_SERVICE_ROLE_KEY', 'HOMOLOGACAO_ADMIN_PASSWORD'].filter(key => !process.env[key]);
  if (missing.length) { result.missingSecrets = missing; result.status = 'manual_action_required'; save(); console.log('PENDENTE: ' + missing.join(', ')); return; }
  const marker = await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value');
  assert.equal(marker[0]?.value?.project_ref, REF, 'Marcador do banco não corresponde à homologação');
  check('host, chave e marcador confirmam homologação antes de escritas');
  const operations = await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value');
  const previousOperations = operations[0]?.value;
  assert.ok(previousOperations, 'Configuração fictícia de funcionamento ausente');
  const member = await remote('/rest/v1/admins?email=eq.admin-homologacao%40example.invalid&select=email,role');
  assert.equal(member.length, 1); assert.equal(member[0].role, 'admin');
  check('membership administrativo de teste presente');

  const child = spawn(process.execPath, ['--use-env-proxy', '--use-system-ca', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3002'], {
    env: { ...process.env, NEXT_PUBLIC_WHATSAPP_PHONE: '', NO_PROXY: [process.env.NO_PROXY, 'localhost', '127.0.0.1'].filter(Boolean).join(',') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  let auth;
  const orderCodes = new Set();
  async function app(path, method = 'GET', body, headers = {}) {
    assert.ok(path.startsWith('/') && !path.startsWith('//'));
    const response = await auth.request.fetch(BASE + path, { method, data: body, headers, timeout: 30000 });
    let json = null;
    try { json = await response.json(); } catch { /* A verificação abaixo não registra corpo sensível. */ }
    return { status: response.status(), json };
  }
  async function cancel(code) {
    const cancelled = await app(`/api/admin/orders/${encodeURIComponent(code)}`, 'PATCH', { status: 'Cancelado' });
    assert.equal(cancelled.status, 200, 'Cancelamento administrativo falhou');
    orderCodes.delete(code);
  }
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    auth = await browser.newContext({ serviceWorkers: 'block' });
    // Só aceita o servidor iniciado por esta execução. Uma porta ocupada
    // aborta o teste antes de enviar credenciais ou permitir qualquer escrita.
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Servidor local não ficou pronto')), 15000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('Falha ao iniciar servidor local')); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Servidor local encerrou antes da validação')); });
      child.stdout.on('data', chunk => {
        if (chunk.toString().includes('Ready in')) { clearTimeout(timer); resolve(); }
      });
      child.stderr.on('data', () => { /* Logs de runtime ficam fora dos artefatos de teste. */ });
    });
    const login = await app('/api/auth/login', 'POST', { email: EMAIL, password: process.env.HOMOLOGACAO_ADMIN_PASSWORD });
    assert.equal(login.status, 200, 'Login de teste falhou; confira usuário Auth, confirmação e secret da senha');
    assert.equal(login.json.user.role, 'admin');
    assert.equal((await app('/api/admin/dishes')).status, 200);
    check('login real e autorização administrativa pela aplicação');
    const catalog = await app('/api/menu'); assert.equal(catalog.status, 200);
    const dish = catalog.json.find(row => row.name.startsWith('HOMOLOGAÇÃO Prato'));
    assert.ok(dish && dish.stock >= 4, 'Fixture de prato indisponível para teste');
    const zones = await app('/api/delivery-zones'); assert.equal(zones.status, 200);
    const zone = zones.json.find(row => row.name === 'HOMOLOGAÇÃO Zona A'); assert.ok(zone);
    check('catálogo, estoque e zonas lidos das APIs reais');
    const closed = await app('/api/admin/order-operations', 'PUT', { mode: 'closed' }); assert.equal(closed.status, 200);
    assert.equal((await app('/api/store-status')).json.isOpen, false);
    const customer = { name: 'HOMOLOGAÇÃO Integração real', phone: '00000000000', delivery: 'delivery', delivery_zone_id: zone.id,
      street: 'Rua Fictícia', number: '1', neighborhood: 'Teste', complement: '', reference: '', payment: 'pix', change: '', notes: 'HOMOLOGAÇÃO sem envio externo' };
    const payload = { customer, expected_total_cents: Math.round((Number(dish.price) + Number(zone.fee)) * 100), items: [{ id: dish.id, quantity: 1, expected_unit_cents: Math.round(Number(dish.price) * 100), type: 'dish', addons: [], notes: 'Sem cebola' }] };
    const blocked = await app('/api/orders', 'POST', payload, { 'Idempotency-Key': randomUUID() }); assert.equal(blocked.status, 409);
    check('horário fechado bloqueia registro pela API real');
    await remote('/rest/v1/restaurant_settings?key=eq.order_operations', { method: 'PATCH', body: JSON.stringify({ value: { mode: 'open', expiresAt: new Date(Date.now() + 15 * 60000).toISOString() } }) });
    assert.equal((await app('/api/store-status')).json.isOpen, true);
    const key = randomUUID();
    const [first, repeat] = await Promise.all([
      app('/api/orders', 'POST', payload, { 'Idempotency-Key': key }),
      app('/api/orders', 'POST', payload, { 'Idempotency-Key': key }),
    ]);
    for (const attempt of [first, repeat]) if (attempt.json?.code && attempt.status === 200) orderCodes.add(attempt.json.code);
    assert.equal(first.status, 200); assert.equal(repeat.status, 200);
    assert.equal(first.json.id, repeat.json.id); assert.equal(first.json.code, repeat.json.code);
    assert.equal(first.json.totalCents, Math.round((Number(dish.price) + Number(zone.fee)) * 100));
    const stored = await remote(`/rest/v1/orders?id=eq.${key}&select=id`); assert.equal(stored.length, 1);
    let stock = await remote(`/rest/v1/dishes?id=eq.${dish.id}&select=stock`); assert.equal(stock[0].stock, dish.stock - 1);
    const conflict = await app('/api/orders', 'POST', { ...payload, customer: { ...customer, notes: 'outro conteúdo' } }, { 'Idempotency-Key': key }); assert.equal(conflict.status, 409);
    check('registro concorrente, taxa e baixa única de estoque; chave conflitante recusada');
    await cancel(first.json.code); await cancel(first.json.code);
    stock = await remote(`/rest/v1/dishes?id=eq.${dish.id}&select=stock`); assert.equal(stock[0].stock, dish.stock);
    const history = await remote(`/rest/v1/order_history?order_id=eq.${key}&select=id`); assert.ok(history.length >= 1);
    check('cancelamento real e repetido repõe estoque uma vez; histórico persistido');
    const pickup = await app('/api/orders', 'POST', { ...payload, expected_total_cents: Math.round(Number(dish.price) * 100), customer: { ...customer, delivery: 'pickup', delivery_zone_id: '' } }, { 'Idempotency-Key': randomUUID() });
    if (pickup.status === 200) orderCodes.add(pickup.json.code);
    assert.equal(pickup.status, 200); assert.equal(pickup.json.fulfillment.delivery_fee, 0);
    assert.equal(pickup.json.totalCents, Math.round(Number(dish.price) * 100));
    await cancel(pickup.json.code);
    check('retirada real sem taxa de entrega');

    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await context.newPage();
      let posts = 0;
      let saved;
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== BASE) {
          if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
          return route.abort();
        }
        return route.continue();
      });
      page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders/v2') posts++; });
      page.on('response', async response => {
        if (response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/orders/v2' && response.ok()) {
          saved = await response.json(); orderCodes.add(saved.code);
        }
      });
      await page.goto(BASE);
      await page.locator('article').filter({ hasText: dish.name }).locator('.add-button').click();
      await page.locator('.header-cart').click();
      await page.getByRole('button', { name: 'Continuar para entrega' }).click();
      await page.getByRole('textbox', { name: 'Nome completo' }).fill(customer.name);
      await page.getByRole('textbox', { name: 'Telefone', exact: true }).fill(customer.phone);
      await page.getByRole('radio', { name: 'Retirada', exact: true }).check();
      const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/orders/v2');
      await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click();
      const orderResponse = await responsePromise;
      assert.ok(orderResponse.ok(), 'Checkout real não registrou o pedido');
      saved = await orderResponse.json();
      orderCodes.add(saved.code);
      await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
      assert.equal(posts, 1); assert.ok(saved?.code);
      const message = await page.getByRole('textbox', { name: 'Mensagem do pedido' }).inputValue();
      assert.ok(message.includes(saved.code) && message.includes(dish.name));
      assert.equal(await page.getByRole('link', { name: 'ABRIR WHATSAPP', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'COPIAR MENSAGEM', exact: true }).click();
      await page.getByText('Mensagem copiada. Cole na conversa e confirme o envio.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), message);
      await page.getByRole('button', { name: 'Voltar ao cardápio', exact: true }).click();
      await page.getByRole('button', { name: `Ver pedido registrado #${saved.code}`, exact: true }).click();
      await page.reload(); await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
      assert.equal(posts, 1);
      assert.equal((await remote(`/rest/v1/orders?id=eq.${saved.id}&select=id`)).length, 1);
      await page.screenshot({ path: `artifacts/homologacao-real-${viewport.width}.png` });
      await cancel(saved.code);
      await context.close();
      check(`checkout real ${viewport.width}x${viewport.height}: mensagem, clipboard e recuperação sem novo POST; WhatsApp bloqueado`);
    }
    const finalStock = await remote(`/rest/v1/dishes?id=eq.${dish.id}&select=stock`); assert.equal(finalStock[0].stock, dish.stock);
    check('estoque final restaurado após todos os pedidos de teste');
    assert.equal((await app('/api/auth/logout', 'POST')).status, 200);
    assert.equal((await app('/api/admin/dishes')).status, 401);
    check('logout invalida acesso administrativo no navegador de teste');
    result.status = 'passed';
  } finally {
    // Nunca apagar pedidos: cancela somente os códigos criados nesta execução.
    if (auth) for (const code of orderCodes) {
      try { await cancel(code); } catch { result.cleanupPending = true; }
    }
    try { await remote('/rest/v1/restaurant_settings?key=eq.order_operations', { method: 'PATCH', body: JSON.stringify({ value: previousOperations }) }); }
    catch { result.cleanupPending = true; }
    if (browser) await browser.close();
    child.kill('SIGTERM');
    if (result.cleanupPending) { result.status = 'cleanup_required'; process.exitCode = 1; }
    save();
  }
}
main().catch(() => { result.status = 'failed'; save(); console.error('FAIL: integração interrompida. Nenhum segredo foi registrado. Consulte o último check aprovado e a configuração da homologação.'); process.exitCode = 1; });
