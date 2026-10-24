// Contrato HTTP real da main 86d3a7b + patch Storage, em schema atualizado de homologação.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { request } = require('playwright');
process.loadEnvFile('.env.local');
const REF = 'nkywpsftihxcuvdxeexn',
  TARGET = `https://${REF}.supabase.co`,
  BASE = 'http://localhost:3011';
async function main() {
  const manifest = JSON.parse(fs.readFileSync('artifacts/etapa-c-release-manifest.json', 'utf8'));
  assert.equal(manifest.base, '86d3a7beeb026ead43481ec9dc52734a93105a13');
  assert.ok(manifest.bridgeDirectory, 'Prepare a ponte e execute o build antes do teste');
  for (const file of [
    'src/lib/storageAdmin.ts',
    'package.json',
    'package-lock.json',
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/sw.js',
  ])
    assert.ok(
      fs.readFileSync(manifest.bridgeDirectory + '/' + file).equals(fs.readFileSync(file)),
      'Ponte ou dependências divergentes: ' + file
    );
  assert.equal(process.env.SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao');
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
        ...init.headers,
      },
    });
    assert.ok(r.ok, `HOMO ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }
  assert.equal(
    (await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value'))[0].value
      .project_ref,
    REF
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
      '3011',
    ],
    {
      cwd: manifest.bridgeDirectory,
      env: { ...process.env, NO_PROXY: [process.env.NO_PROXY, 'localhost', '127.0.0.1'].join(',') },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const log = fs.createWriteStream('artifacts/etapa-c-bridge-server.log');
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let context;
  const ids = [],
    photos = [];
  async function api(path, method = 'GET', data) {
    const r = await context.fetch(BASE + path, { method, data });
    return { status: r.status(), json: await r.json() };
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Ponte não iniciou')), 15000);
      child.once('error', reject);
      child.stdout.on('data', (data) => {
        if (data.toString().includes('Ready in')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    context = await request.newContext();
    assert.equal(
      (
        await api('/api/auth/login', 'POST', {
          email: 'admin-homologacao@example.invalid',
          password: process.env.HOMOLOGACAO_ADMIN_PASSWORD,
        })
      ).status,
      200
    );
    for (const file of ['lasanha-1.jpg', 'lasanha-2.jpg', 'galeto-completo.jpg']) {
      const r = await context.post(BASE + '/api/upload', {
        multipart: {
          bucket: 'dishes',
          file: {
            name: file,
            mimeType: 'image/jpeg',
            buffer: fs.readFileSync('public/pratos/' + file),
          },
        },
      });
      assert.equal(r.status(), 200);
      photos.push((await r.json()).publicUrl);
    }
    const suffix = randomUUID().slice(0, 8);
    for (const label of ['A', 'B']) {
      const r = await api('/api/admin/dishes', 'POST', {
        name: `HOMOLOGAÇÃO Ponte C ${label} ${suffix}`,
        slug: `etapa-c-bridge-${label.toLowerCase()}-${suffix}`,
        price: 10,
        stock: 3,
        image: photos[0],
      });
      assert.equal(r.status, 200);
      ids.push(r.json.id);
      assert.deepEqual(r.json.gallery, []);
    }
    await remote('/rest/v1/dishes?id=eq.' + ids[1], {
      method: 'PATCH',
      body: JSON.stringify({
        gallery: [{ url: '/pratos/feijoada-completa.jpg' }, { url: photos[0] }],
      }),
    });
    const updated = await api('/api/admin/dishes/' + ids[0], 'PATCH', { image: photos[1] });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.price, 10);
    assert.equal(updated.json.stock, 3);
    assert.equal(
      (await fetch(photos[0], { redirect: 'error' })).status,
      200,
      'API publicada com ponte deve proteger foto secundária compartilhada'
    );
    await remote('/rest/v1/dishes?id=eq.' + ids[0], {
      method: 'PATCH',
      body: JSON.stringify({ gallery: [{ url: photos[1] }, { url: photos[0] }] }),
    });
    const legacy = await api('/api/admin/dishes/' + ids[0], 'PATCH', { image: photos[2] });
    assert.equal(legacy.status, 200);
    assert.equal(legacy.json.gallery[0].url, photos[2]);
    assert.equal(legacy.json.gallery[1].url, photos[0]);
    assert.equal(legacy.json.stock, 3);
    assert.equal(legacy.json.promo_active, false);
    const menu = await api('/api/menu');
    assert.equal(menu.status, 200);
    assert.equal(menu.json.find((d) => d.id === ids[0]).price, 10);
    fs.writeFileSync(
      'artifacts/etapa-c-bridge-results.json',
      JSON.stringify(
        {
          status: 'passed',
          base: '86d3a7beeb026ead43481ec9dc52734a93105a13',
          project: REF,
          checks: [
            'Build real da main com somente patch Storage',
            'Autenticação e contrato HTTP administrativo publicados',
            'CRUD antigo aceita defaults novos',
            'Imagem secundária compartilhada preservada',
            'Capa legada preserva demais fotos pelo trigger',
            'Preço/estoque/promoção inalterados',
            'API pública antiga responde no schema atualizado',
          ],
        },
        null,
        2
      )
    );
    console.log('PASS: ponte real, API publicada, galeria/Storage compartilhado e schema aditivo');
  } finally {
    if (context) {
      for (const id of ids)
        assert.equal((await api('/api/admin/dishes/' + id, 'DELETE')).status, 200);
      for (const publicUrl of photos) await api('/api/upload', 'DELETE', { publicUrl });
      await context.dispose();
    }
    child.kill('SIGTERM');
    log.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
