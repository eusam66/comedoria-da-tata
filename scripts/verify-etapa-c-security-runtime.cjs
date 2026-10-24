// Regressão direcionada do runtime atualizado. Somente local + homologação guardada.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { request } = require('playwright');
const sharp = require('sharp');
process.loadEnvFile('.env.local');
const REF = 'nkywpsftihxcuvdxeexn',
  TARGET = `https://${REF}.supabase.co`,
  BASE = 'http://localhost:3000';
async function main() {
  assert.equal(process.env.SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao');
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(secret && process.env.HOMOLOGACAO_ADMIN_PASSWORD);
  async function remote(path) {
    const r = await fetch(TARGET + path, {
      redirect: 'error',
      headers: { apikey: secret, Authorization: 'Bearer ' + secret },
    });
    assert.ok(r.ok);
    return r.json();
  }
  assert.equal(
    (await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value'))[0].value
      .project_ref,
    REF
  );
  const before = {
    dishes: await remote('/rest/v1/dishes?select=id,price,promo_price,promo_active,stock&order=id'),
    beverages: await remote('/rest/v1/beverages?select=id,price,stock&order=id'),
    orders: await remote('/rest/v1/orders?select=id,status&order=id'),
    operations: (
      await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value')
    )[0].value,
  };
  const fixture = 'security-runtime-' + randomUUID();
  const dir = 'public/' + fixture;
  fs.mkdirSync(dir);
  fs.copyFileSync('public/icons/icon-192.png', dir + '/logo.png');
  fs.copyFileSync('public/pratos/lasanha-1.jpg', dir + '/photo.jpg');
  await sharp('public/pratos/lasanha-1.jpg')
    .resize(256)
    .avif()
    .toFile(dir + '/photo.avif');
  fs.writeFileSync(
    dir + '/probe.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="white"/></svg>'
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
      '3000',
    ],
    {
      env: {
        ...process.env,
        NO_PROXY: [process.env.NO_PROXY, 'localhost', '127.0.0.1'].filter(Boolean).join(','),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const log = fs.createWriteStream('artifacts/etapa-c-security-runtime-server.log');
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let client, anon;
  const checks = [];
  async function api(path, method = 'GET', data) {
    const r = await client.fetch(BASE + path, { method, data, timeout: 30000 });
    return { status: r.status(), json: await r.json() };
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Servidor não iniciou')), 15000);
      child.once('error', reject);
      child.stdout.on('data', (v) => {
        if (v.toString().includes('Ready in')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    client = await request.newContext();
    anon = await request.newContext();
    assert.equal(
      (
        await api('/api/auth/login', 'POST', {
          email: 'admin-homologacao@example.invalid',
          password: process.env.HOMOLOGACAO_ADMIN_PASSWORD,
        })
      ).status,
      200
    );
    assert.equal((await anon.get(BASE + '/api/admin/commercial')).status(), 401);
    assert.equal((await client.get(BASE + '/api/admin/commercial')).status(), 200);
    assert.ok(
      (await client.get(BASE + '/admin/settings')).headers()['x-robots-tag'].includes('noindex')
    );
    checks.push('Login, middleware, autorização de API e headers privados preservados');
    for (const mode of ['open', 'closed', 'automatic']) {
      const result = await api('/api/admin/order-operations', 'PUT', { mode });
      assert.equal(result.status, 200);
      const status = await api('/api/store-status');
      assert.equal(status.status, 200);
      assert.equal(status.json.mode, mode);
      if (mode !== 'automatic') {
        assert.equal(status.json.isOpen, mode === 'open');
        assert.equal(status.json.expiresAt, null);
      }
    }
    checks.push(
      'Abertura e fechamento manuais sem expiração, retorno ao horário padrão America/Recife'
    );
    for (const file of ['logo.png', 'photo.jpg', 'photo.avif', 'probe.svg']) {
      const source = await client.get(BASE + '/' + fixture + '/' + file);
      assert.equal(source.status(), 200, 'Fixture local disponível ' + file);
      const response = await client.get(
        BASE + '/_next/image?url=' + encodeURIComponent('/' + fixture + '/' + file) + '&w=256&q=75',
        { headers: { Accept: 'image/webp' } }
      );
      if (file === 'probe.svg') {
        assert.equal(response.status(), 400);
        continue;
      }
      assert.equal(response.status(), 200, 'Otimização ' + file);
      const metadata = await sharp(await response.body()).metadata();
      assert.ok(metadata.width > 0 && metadata.width <= 256);
      assert.ok(response.headers()['content-type'].startsWith('image/'));
    }
    checks.push(
      'Sharp real processa PNG/JPEG/AVIF com bibliotecas corrigidas; SVG continua bloqueado no otimizador'
    );
    const pwa = execFileSync(process.execPath, ['scripts/verify-pwa-browser.cjs'], {
      encoding: 'utf8',
      timeout: 90000,
    });
    fs.writeFileSync('artifacts/etapa-c-security-pwa.log', pwa);
    checks.push(
      'Service Worker real: remove caches antigos, assets offline, APIs sem cache e pedidos offline bloqueados'
    );
    assert.deepEqual(
      await remote('/rest/v1/dishes?select=id,price,promo_price,promo_active,stock&order=id'),
      before.dishes
    );
    assert.deepEqual(
      await remote('/rest/v1/beverages?select=id,price,stock&order=id'),
      before.beverages
    );
    assert.deepEqual(await remote('/rest/v1/orders?select=id,status&order=id'), before.orders);
    checks.push(
      'Nenhum pedido criado/alterado e nenhum preço/estoque modificado nesta regressão de runtime'
    );
    fs.writeFileSync(
      'artifacts/etapa-c-security-runtime-results.json',
      JSON.stringify(
        {
          status: 'passed',
          project: REF,
          node: process.version,
          next: require('next/package.json').version,
          sharp: sharp.versions.sharp,
          nativeVersions: sharp.versions,
          checks,
        },
        null,
        2
      )
    );
    console.log('PASS: ' + checks.join('; '));
  } finally {
    try {
      // Restaura somente a configuração fictícia de homologação; produção nunca é usada.
      const restore = await fetch(TARGET + '/rest/v1/restaurant_settings?key=eq.order_operations', {
        method: 'PATCH',
        headers: {
          apikey: secret,
          Authorization: 'Bearer ' + secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: before.operations }),
      });
      assert.ok(restore.ok);
    } finally {
      if (client) await client.dispose();
      if (anon) await anon.dispose();
      child.kill('SIGTERM');
      log.end();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}
main().catch((e) => {
  console.error(e.message);
  console.error(e.stack?.split('\n').slice(-3).join('\n'));
  process.exitCode = 1;
});
