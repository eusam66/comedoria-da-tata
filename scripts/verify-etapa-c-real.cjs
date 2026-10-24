// Homologação integrada: dados fictícios, projeto guardado, nenhuma produção ou WhatsApp.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
const sharp = require('sharp');
process.loadEnvFile('.env.local');
const REF = 'nkywpsftihxcuvdxeexn',
  TARGET = `https://${REF}.supabase.co`,
  BASE = 'http://localhost:3010';
const output = { project: REF, status: 'pending', checks: [], screenshots: [] };
const pass = (text) => {
  output.checks.push(text);
  console.log('PASS: ' + text);
};
const save = () => {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/etapa-c-real-results.json', JSON.stringify(output, null, 2));
};
const noOverflow = async (page) =>
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    `Overflow ${page.url()}`
  );
async function main() {
  assert.equal(process.env.SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, TARGET);
  assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'homologacao');
  assert.equal(process.env.SUPABASE_EXPECTED_PROJECT_REF, REF);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(secret && process.env.HOMOLOGACAO_ADMIN_PASSWORD);
  if (secret.startsWith('eyJ'))
    assert.equal(JSON.parse(Buffer.from(secret.split('.')[1], 'base64url')).ref, REF);
  async function remote(path, init = {}) {
    assert.ok(path.startsWith('/') && !path.startsWith('//'));
    const r = await fetch(TARGET + path, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    assert.ok(r.ok, `HOMO HTTP ${r.status}: ${path.split('?')[0]}`);
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }
  assert.equal(
    (await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value'))[0].value
      .project_ref,
    REF
  );
  const previousCommercial = (
    await remote('/rest/v1/restaurant_settings?key=eq.commercial&select=value')
  )[0];
  const previousOperations = (
    await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value')
  )[0];
  const existingDishes = await remote(
    '/rest/v1/dishes?select=id,price,stock,promo_price,promo_active&order=id'
  );
  const existingBeverages = await remote('/rest/v1/beverages?select=id,price,stock&order=id');
  pass('Guardas do host, JWT e marcador confirmam exclusivamente homologação');
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
      '3010',
    ],
    {
      env: {
        ...process.env,
        NO_PROXY: [process.env.NO_PROXY, 'localhost', '127.0.0.1'].filter(Boolean).join(','),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const log = fs.createWriteStream('artifacts/etapa-c-server.log');
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let browser, auth, currentPage;
  const fixtures = { dishes: [], beverages: [], categories: [] },
    orders = new Set(),
    uploaded = new Set(),
    uploadKeys = new Map(),
    uploadResponses = [];
  async function api(path, method = 'GET', data, context = auth, headers = {}) {
    const response = await context.request.fetch(BASE + path, {
      method,
      data,
      headers,
      timeout: 45000,
    });
    let json;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { status: response.status(), json, response };
  }
  async function patch(id, body) {
    const r = await api('/api/admin/dishes/' + id, 'PATCH', body);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return r.json;
  }
  async function dish(id) {
    return (await api('/api/admin/dishes')).json.find((d) => d.id === id);
  }
  async function cancel(code) {
    assert.equal(
      (await api('/api/admin/orders/' + code, 'PATCH', { status: 'Cancelado' })).status,
      200
    );
    orders.delete(code);
  }
  async function order(body, key = randomUUID()) {
    const r = await api('/api/orders/v2', 'POST', body, auth, { 'Idempotency-Key': key });
    if (r.status === 200) orders.add(r.json.code);
    return r;
  }
  async function seed(kind, payload) {
    const r = await api('/api/admin/' + kind, 'POST', payload);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    fixtures[kind].push(r.json);
    return r.json;
  }
  async function upload(file) {
    if (!uploadKeys.has(file)) uploadKeys.set(file, randomUUID());
    const r = await auth.request.post(BASE + '/api/upload', {
      multipart: {
        bucket: 'dishes',
        deduplicate: 'true',
        uploadKey: uploadKeys.get(file),
        file: {
          name: file,
          mimeType: 'image/jpeg',
          buffer: fs.readFileSync('public/pratos/' + file),
        },
      },
    });
    assert.equal(r.status(), 200);
    const data = await r.json();
    uploaded.add(data.publicUrl);
    return data.publicUrl;
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Servidor não iniciou')), 20000);
      child.once('error', reject);
      child.once('exit', () => reject(new Error('Servidor encerrado')));
      child.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Ready in')) {
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
    auth = await browser.newContext({ serviceWorkers: 'block' });
    assert.equal(
      (
        await api('/api/auth/login', 'POST', {
          email: 'admin-homologacao@example.invalid',
          password: process.env.HOMOLOGACAO_ADMIN_PASSWORD,
        })
      ).status,
      200
    );
    const anon = await browser.newContext();
    for (const [path, method, data] of [
      ['/api/admin/commercial', 'GET'],
      ['/api/admin/commercial', 'PUT', {}],
      ['/api/admin/menu-qr', 'GET'],
      ['/api/upload', 'DELETE', { publicUrl: '/a.jpg' }],
    ])
      assert.equal((await api(path, method, data, anon)).status, 401);
    assert.equal((await api('/api/commercial', 'POST', {}, anon)).status, 405);
    const anonSettings = await fetch(
      TARGET + '/rest/v1/restaurant_settings?select=value&key=eq.commercial',
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } }
    );
    assert.ok([401, 403].includes(anonSettings.status));
    await anon.close();
    pass(
      'Login real, APIs administrativas protegidas, configurações privadas e API pública somente leitura'
    );
    const suffix = randomUUID().slice(0, 8);
    const category = await seed('categories', {
      name: `HOMOLOGAÇÃO C ${suffix}`,
      slug: `etapa-c-${suffix}`,
    });
    const beverage = await seed('beverages', {
      name: `HOMOLOGAÇÃO Bebida C ${suffix}`,
      price: 5.5,
      size: 'Teste',
      stock: 10,
    });
    const side = await seed('dishes', {
      name: `HOMOLOGAÇÃO Complemento C ${suffix}`,
      slug: `etapa-c-side-${suffix}`,
      price: 10,
      stock: 10,
      categoryId: category.id,
      extras: {
        addons: [{ id: 'required', name: 'Escolha de teste', price: 2, required: true, maxQty: 1 }],
      },
      image: '/pratos/feijao-charqueado.jpg',
    });
    const sold = await seed('dishes', {
      name: `HOMOLOGAÇÃO Esgotado C ${suffix}`,
      slug: `etapa-c-empty-${suffix}`,
      price: 20,
      stock: 0,
      categoryId: category.id,
    });
    const main = await seed('dishes', {
      name: `HOMOLOGAÇÃO Lasanha C ${suffix}`,
      slug: `etapa-c-main-${suffix}`,
      description: 'Descrição específica de homologação, sem publicação.',
      price: 59.9,
      promo_price: 49.9,
      promo_active: true,
      stock: 20,
      servings: 2,
      popular: true,
      isNew: true,
      categoryId: category.id,
      image: '/pratos/lasanha-1.jpg',
      ingredients: 'Ingredientes fictícios de teste',
      accompaniments: 'Acompanhamento fictício de teste',
      dish_notes: 'Observação somente de homologação',
      related_products: [
        { id: side.id, type: 'dish' },
        { id: beverage.id, type: 'beverage' },
        { id: sold.id, type: 'dish' },
      ],
      extras: {
        addons: [{ id: 'extra', name: 'Extra de teste', price: 2, required: false, maxQty: 2 }],
      },
    });
    assert.deepEqual(main.gallery, []);
    assert.equal(main.image_url, '/pratos/lasanha-1.jpg');
    for (const payload of [
      { gallery: Array.from({ length: 6 }, (_, i) => ({ url: `/p/${i}.jpg` })) },
      { gallery: [{ url: 'javascript:alert(1)' }] },
      { related_products: [{ id: main.id, type: 'dish' }] },
      { related_products: [{ id: randomUUID(), type: 'dish' }] },
    ])
      assert.equal((await api('/api/admin/dishes/' + main.id, 'PATCH', payload)).status, 400);
    const fake = await auth.request.post(BASE + '/api/upload', {
      multipart: {
        bucket: 'dishes',
        file: {
          name: 'fake.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('<svg onload=alert(1)>'),
        },
      },
    });
    assert.equal(fake.status(), 415);
    const tooLarge = await auth.request.post(BASE + '/api/upload', {
      multipart: {
        bucket: 'dishes',
        file: {
          name: 'large.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        },
      },
    });
    assert.equal(tooLarge.status(), 413);
    pass(
      'Prato legado, limites de 5 fotos/relacionados e uploads disfarçados ou grandes rejeitados'
    );
    const photo1 = await upload('lasanha-1.jpg'),
      photo2 = await upload('lasanha-2.jpg');
    assert.equal(
      await upload('lasanha-1.jpg'),
      photo1,
      'Reenvio de conteúdo não duplica o arquivo'
    );
    await patch(main.id, {
      gallery: [
        { url: photo1, alt: 'Principal real do acervo' },
        { url: photo2, alt: 'Segunda foto real do acervo' },
      ],
    });
    assert.equal((await dish(main.id)).image_url, photo1);
    await seed('dishes', {
      name: `HOMOLOGAÇÃO Foto compartilhada C ${suffix}`,
      slug: `etapa-c-shared-${suffix}`,
      price: 10,
      stock: 1,
      gallery: [{ url: '/pratos/feijoada-completa.jpg' }, { url: photo2 }],
    });
    assert.equal((await api('/api/upload', 'DELETE', { publicUrl: photo2 })).json.ok, false);
    const oldCover = await upload('galeto-completo.jpg');
    await patch(main.id, { image: oldCover });
    let latest = await dish(main.id);
    assert.equal(latest.gallery[0].url, oldCover);
    assert.equal(latest.gallery[1].url, photo2);
    await patch(main.id, { gallery: [{ url: oldCover }] });
    const sharedFetch = await fetch(photo2, { redirect: 'error' });
    assert.equal(sharedFetch.status, 200);
    await patch(main.id, { gallery: [{ url: oldCover }, { url: photo2 }] });
    pass(
      'Storage real: upload/download, duas fotos, capa legada preserva secundárias e exclusão protege referências compartilhadas'
    );
    let commercial = await api('/api/admin/commercial');
    assert.equal(commercial.status, 200);
    const controlled = {
      ...commercial.json.value,
      about: 'HOMOLOGAÇÃO — informações controladas de teste.',
      deliveryInfo: 'Orientação fictícia somente em homologação.',
      pickupInfo: 'Retirada de teste.',
      paymentNotice: 'Aviso de teste.',
      faq: [
        {
          id: 'c-faq',
          question: 'Pergunta de homologação C?',
          answer: 'Resposta controlada, não é informação comercial real.',
          position: 0,
          published: true,
        },
        {
          id: 'c-hidden',
          question: 'Pergunta oculta C?',
          answer: 'Oculta',
          position: 1,
          published: false,
        },
      ],
      testimonials: [
        {
          id: 'c-review',
          displayName: 'Cliente fictício C',
          text: 'Depoimento fictício exclusivo para testes, nunca em produção.',
          consent: false,
          consentNote: 'CONSENTIMENTO PRIVADO TESTE',
          published: true,
          position: 0,
        },
      ],
    };
    assert.equal(
      (
        await api('/api/admin/commercial', 'PUT', {
          value: controlled,
          revision: commercial.json.revision,
        })
      ).status,
      400
    );
    controlled.testimonials[0].consent = true;
    const saved = await api('/api/admin/commercial', 'PUT', {
      value: controlled,
      revision: commercial.json.revision,
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.ok(saved.json.value.testimonials[0].consentRecordedAt);
    assert.equal(
      (
        await api('/api/admin/commercial', 'PUT', {
          value: controlled,
          revision: commercial.json.revision,
        })
      ).status,
      409
    );
    commercial = saved;
    const content = await api('/api/commercial');
    assert.equal(content.json.testimonials.length, 1);
    assert.equal(content.json.faq.length, 1);
    assert.ok(!JSON.stringify(content.json).includes('CONSENTIMENTO PRIVADO'));
    assert.ok(!JSON.stringify(content.json).includes('consentRecordedAt'));
    const zones = (await api('/api/delivery-zones')).json;
    assert.deepEqual(
      content.json.zones.map((z) => [z.id, z.fee]).sort(),
      zones.map((z) => [z.id, Number(z.fee)]).sort()
    );
    for (const format of ['png', 'svg']) {
      const r = await auth.request.get(BASE + '/api/admin/menu-qr?format=' + format);
      assert.equal(r.status(), 200);
      assert.ok(r.headers()['content-disposition'].includes('attachment'));
      if (format === 'png') {
        const png = PNG.sync.read(await r.body());
        assert.equal(png.width, 1024);
        assert.equal(
          jsQR(new Uint8ClampedArray(png.data), png.width, png.height).data,
          'https://comedoria-da-tata.vercel.app'
        );
      }
    }
    pass(
      'Conteúdo com CAS 409, consentimento registrado no servidor, publicação manual, privacidade, taxas reais e QR PNG/SVG decodificado'
    );
    // HTML de crawlers: solicitar a resposta HTTP completa sem executar JavaScript.
    const htmlResponse = await auth.request.get(BASE + '/dishes/' + main.slug, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    });
    const html = await htmlResponse.text();
    assert.equal(htmlResponse.status(), 200);
    assert.ok(html.includes('property="og:title"'));
    assert.ok(html.includes('property="og:image"'));
    assert.ok(
      html.includes(
        'rel="canonical" href="https://comedoria-da-tata.vercel.app/dishes/' + main.slug
      )
    );
    assert.ok(html.includes(main.description));
    assert.ok(html.includes('"@type":"MenuItem"'));
    assert.ok(html.includes('"price":"49.90"'));
    assert.ok(!html.includes('aggregateRating'));
    assert.ok(
      (await (await auth.request.get(BASE + '/sitemap.xml')).text()).includes(
        '/dishes/' + main.slug
      )
    );
    assert.ok(
      (await (await auth.request.get(BASE + '/robots.txt')).text()).includes('Disallow: /')
    );
    assert.ok(
      (await auth.request.get(BASE + '/admin/login')).headers()['x-robots-tag'].includes('noindex')
    );
    pass(
      'HTML de crawler com metadata, fotografia, canonical oficial, preço efetivo e sitemap real; áreas privadas e homologação noindex'
    );
    const recs = (await api('/api/recommendations?ids=' + main.id)).json;
    assert.ok(recs.some((r) => r.id === side.id));
    assert.ok(recs.some((r) => r.id === beverage.id));
    assert.ok(!recs.some((r) => [main.id, sold.id].includes(r.id)));
    const state = await auth.storageState();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 700 },
      { width: 1440, height: 1000 },
    ]) {
      await patch(main.id, {
        gallery: [
          { url: oldCover, alt: 'Principal real do acervo' },
          { url: photo2, alt: 'Segunda foto real do acervo' },
        ],
      });
      const context = await browser.newContext({
        viewport,
        storageState: state,
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === BASE || ['blob:', 'data:'].includes(url.protocol))
          return route.continue();
        if (url.origin === TARGET && route.request().method() === 'GET') {
          const r = await fetch(url, { redirect: 'error' });
          return route.fulfill({
            status: r.status,
            headers: { 'content-type': r.headers.get('content-type') || 'image/jpeg' },
            body: Buffer.from(await r.arrayBuffer()),
          });
        }
        if (url.hostname === 'fonts.googleapis.com')
          return route.fulfill({ contentType: 'text/css', body: '' });
        return route.abort();
      });
      const page = await context.newPage();
      currentPage = page;
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('response', (response) => {
        if (
          response.ok() &&
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/upload'
        )
          uploadResponses.push(
            response
              .json()
              .then((data) => uploaded.add(data.publicUrl))
              .catch(() => {})
          );
      });
      page.on('pageerror', (e) => {
        errors.push(e.message);
        console.error('BROWSER:', e.message);
        output.runtimeErrors = [...errors];
      });
      console.log('UI: detalhe ' + viewport.width);
      // Galeria pública: teclado, controles, gesto e conteúdo essencial.
      await page.goto(BASE + '/dishes/' + main.slug);
      await page.getByRole('heading', { name: main.name, exact: true }).waitFor();
      await noOverflow(page);
      await page.getByRole('button', { name: 'Próxima foto', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('status').filter({ hasText: 'Foto 2 de 2' }).waitFor();
      await page.locator('.dish-gallery-main').evaluate((element) => {
        const start = new Event('touchstart', { bubbles: true });
        Object.defineProperty(start, 'touches', { value: [{ clientX: 200, clientY: 100 }] });
        element.dispatchEvent(start);
        const end = new Event('touchend', { bubbles: true });
        Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 280, clientY: 100 }] });
        element.dispatchEvent(end);
      });
      await page.getByRole('status').filter({ hasText: 'Foto 1 de 2' }).waitFor();
      await page.getByText('O que acompanha?', { exact: true }).click();
      assert.ok(
        await page.getByText('Acompanhamento fictício de teste', { exact: true }).isVisible()
      );
      // Nativo capturado sem compartilhar externamente; depois fallback/clipboard.
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async (value) => {
            window.__share = value;
          },
        })
      );
      await page.getByRole('button', { name: 'Compartilhar prato', exact: true }).click();
      assert.ok((await page.evaluate(() => window.__share.url)).endsWith('/dishes/' + main.slug));
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
      );
      await page.getByRole('button', { name: 'Compartilhar prato', exact: true }).click();
      await page.getByRole('button', { name: 'Copiar link', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Link do prato copiado' }).waitFor();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        'https://comedoria-da-tata.vercel.app/dishes/' + main.slug
      );
      assert.equal(await page.getByRole('link', { name: 'Compartilhar no WhatsApp' }).count(), 0);
      await page.screenshot({
        path: `artifacts/etapa-c-dish-${viewport.width}.png`,
        fullPage: true,
      });
      output.screenshots.push(`artifacts/etapa-c-dish-${viewport.width}.png`);
      console.log('UI: home ' + viewport.width);
      // Home/sacola: recomendações locais não criam pedidos nem movimentam estoque.
      const stockBefore = (await dish(main.id)).stock;
      await page.goto(BASE);
      await page.getByRole('heading', { name: 'Ofertas da Comedoria', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Mais pedidos', exact: true }).waitFor();
      await noOverflow(page);
      const offer = page.locator('.offer-card').filter({ hasText: main.name }).first();
      await offer.getByRole('button', { name: 'Adicionar', exact: true }).click();
      await page.locator('.header-cart').click();
      const recommendations = page.locator('.cart-recommendations');
      await recommendations.getByText(beverage.name, { exact: true }).waitFor();
      await recommendations
        .locator('article')
        .filter({ hasText: beverage.name })
        .getByRole('button', { name: '+ ADICIONAR', exact: true })
        .click();
      await page.waitForFunction(
        (id) => JSON.parse(localStorage.getItem('cart_v1') || '[]').some((i) => i.dish.id === id),
        beverage.id
      );
      const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('cart_v1')));
      assert.equal(cart.length, 2);
      assert.equal(Math.round(cart.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100), 5540);
      assert.equal((await dish(main.id)).stock, stockBefore);
      assert.equal(await recommendations.getByText(beverage.name, { exact: true }).count(), 0);
      assert.equal(await recommendations.getByText(sold.name, { exact: true }).count(), 0);
      await recommendations
        .locator('article')
        .filter({ hasText: side.name })
        .getByRole('button', { name: 'Escolher opções', exact: true })
        .click();
      await page.waitForURL(BASE + '/dishes/' + side.slug);
      await page.getByText('Escolha de teste', { exact: true }).waitFor({ state: 'visible' });
      assert.ok(
        (await page.evaluate(() => JSON.parse(localStorage.getItem('cart_v1')))).length === 2
      );
      // Limpar somente a sacola local deste contexto de teste.
      await page.evaluate(() => localStorage.removeItem('cart_v1'));
      await page.goto(BASE);
      await page.getByText('Pergunta de homologação C?', { exact: true }).click();
      assert.ok(
        await page
          .getByText('Resposta controlada, não é informação comercial real.', { exact: true })
          .isVisible()
      );
      assert.ok(await page.getByText('Cliente fictício C', { exact: true }).isVisible());
      assert.equal(await page.getByText('Pergunta oculta C?', { exact: true }).count(), 0);
      await page.screenshot({
        path: `artifacts/etapa-c-home-${viewport.width}.png`,
        fullPage: true,
      });
      output.screenshots.push(`artifacts/etapa-c-home-${viewport.width}.png`);
      console.log('UI: admin ' + viewport.width);
      // Administração mantém foco/retorno e campos numéricos editáveis.
      await page.goto(BASE + '/admin/dishes');
      const card = page.locator(`[data-admin-item="${main.id}"]`);
      await card.getByRole('button', { name: 'Editar', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.textContent?.startsWith('EDITANDO:')
      );
      await noOverflow(page);
      if (viewport.width === 390) {
        const input = page.getByLabel('Adicionar fotos', { exact: false });
        await input.setInputFiles([
          'public/pratos/feijoada-completa.jpg',
          'public/pratos/galeto-embalado.jpg',
          'public/pratos/lasanhas-producao.jpg',
        ]);
        assert.equal(await page.locator('.gallery-draft-row').count(), 5);
        assert.ok(await input.isDisabled());
        const rows = page.locator('.gallery-draft-row');
        await rows.nth(4).getByRole('button', { name: 'Tornar principal', exact: true }).click();
        await rows
          .first()
          .getByLabel('Descrição da foto', { exact: true })
          .fill('Principal escolhida na homologação');
        let uploads = 0;
        page.on('request', (r) => {
          if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/upload') uploads++;
        });
        const failure = (route) =>
          route.request().method() === 'PATCH'
            ? route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'HOMOLOGAÇÃO: falha de rede controlada' }),
              })
            : route.fallback();
        await context.route(BASE + '/api/admin/dishes/' + main.id, failure);
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await page
          .getByRole('alert')
          .filter({ hasText: 'HOMOLOGAÇÃO: falha de rede controlada' })
          .waitFor();
        assert.equal(uploads, 3);
        assert.equal(await rows.count(), 5);
        await context.unroute(BASE + '/api/admin/dishes/' + main.id, failure);
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await page.waitForFunction(
          (id) => document.activeElement?.getAttribute('data-admin-item') === id,
          main.id
        );
        assert.equal(uploads, 3, 'Nova tentativa não duplica uploads');
        latest = await dish(main.id);
        assert.equal(latest.gallery.length, 5);
        assert.equal(latest.gallery[0].alt, 'Principal escolhida na homologação');
        for (const photo of latest.gallery)
          if (photo.url.startsWith(TARGET)) uploaded.add(photo.url);
        await page.reload();
        await card.getByRole('button', { name: 'Editar', exact: true }).click();
        await page.waitForFunction(() =>
          document.activeElement?.textContent?.startsWith('EDITANDO:')
        );
        assert.equal(await rows.count(), 5);
        await rows.nth(4).getByRole('button', { name: 'Remover foto 5', exact: true }).click();
        await rows
          .nth(3)
          .getByLabel('Substituir', { exact: false })
          .setInputFiles({
            name: 'orientation-6.jpg',
            mimeType: 'image/jpeg',
            buffer: await sharp('public/pratos/galeto-completo.jpg')
              .withMetadata({ orientation: 6 })
              .toBuffer(),
          });
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await page.waitForFunction(
          (id) => document.activeElement?.getAttribute('data-admin-item') === id,
          main.id
        );
        latest = await dish(main.id);
        assert.equal(latest.gallery.length, 4);
        const oriented = await sharp(
          Buffer.from(await (await fetch(latest.gallery[3].url)).arrayBuffer())
        ).metadata();
        assert.equal(oriented.width, 1280);
        assert.equal(oriented.height, 859);
        assert.equal(oriented.orientation, undefined);
        for (const photo of latest.gallery)
          if (photo.url.startsWith(TARGET)) uploaded.add(photo.url);
        pass(
          'Galeria administrativa real: 5 fotos, bloqueio de sexta, principal, ordem, substituir/remover, reload e retry sem upload duplicado'
        );
      } else {
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.waitForFunction(
          (id) => document.activeElement?.getAttribute('data-admin-item') === id,
          main.id
        );
      }
      await page.goto(BASE + '/admin/settings');
      await page.getByRole('heading', { name: 'Conteúdo comercial', exact: true }).waitFor();
      await noOverflow(page);
      await page.getByRole('button', { name: 'Nova pergunta', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.textContent?.startsWith('EDITANDO:')
      );
      await page.getByLabel('Pergunta', { exact: true }).fill(`Pergunta UI ${viewport.width}?`);
      await page.getByLabel('Resposta', { exact: true }).fill('Resposta UI somente teste');
      await page.getByLabel('Ordem', { exact: true }).fill('');
      assert.equal(await page.getByLabel('Ordem', { exact: true }).inputValue(), '');
      await page.getByRole('button', { name: 'Salvar registro', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.getAttribute('data-admin-item')?.startsWith('faq-')
      );
      const faqRow = page
        .locator('[data-admin-item]')
        .filter({ has: page.getByText(`Pergunta UI ${viewport.width}?`, { exact: true }) })
        .last();
      await faqRow.getByRole('button', { name: 'Publicar', exact: true }).click();
      await faqRow.getByRole('button', { name: 'Ocultar', exact: true }).waitFor();
      await faqRow.getByRole('button', { name: 'Editar', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.textContent?.startsWith('EDITANDO:')
      );
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.getAttribute('data-admin-item')?.startsWith('faq-')
      );
      page.once('dialog', (d) => d.accept());
      await faqRow.getByRole('button', { name: 'Excluir', exact: true }).click();
      await faqRow.waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Novo depoimento', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.textContent?.startsWith('EDITANDO:')
      );
      await page.getByLabel('Nome de exibição', { exact: true }).fill('Teste UI');
      await page
        .getByLabel('Texto autorizado do depoimento', { exact: true })
        .fill('Fictício e oculto.');
      assert.ok(await page.getByLabel('Publicar no site', { exact: true }).isDisabled());
      await page.getByRole('button', { name: 'Salvar registro', exact: true }).click();
      await page.waitForFunction(() =>
        document.activeElement?.getAttribute('data-admin-item')?.startsWith('testimonials-')
      );
      await noOverflow(page);
      await page.screenshot({
        path: `artifacts/etapa-c-admin-${viewport.width}.png`,
        fullPage: true,
      });
      output.screenshots.push(`artifacts/etapa-c-admin-${viewport.width}.png`);
      assert.deepEqual(errors, []);
      await context.close();
      pass(
        `UI ${viewport.width}x${viewport.height}: galeria, gesto, teclado, compartilhar/cópia, ofertas/mais pedidos, recomendações sem estoque/pedido, FAQ/admin/foco e ausência de overflow/erros runtime`
      );
    }
    // Fluxo financeiro real restrito às fixtures: adicional, promoção, bebida e taxa.
    assert.equal((await api('/api/admin/order-operations', 'PUT', { mode: 'open' })).status, 200);
    const zone = zones.find((z) => Number(z.fee) > 0);
    assert.ok(zone);
    const customer = {
      name: 'HOMOLOGAÇÃO Etapa C',
      phone: '000',
      delivery: 'delivery',
      delivery_zone_id: zone.id,
      street: 'Fictícia',
      number: '1',
      neighborhood: 'Teste',
      payment: 'pix',
    };
    const body = {
      customer,
      expected_total_cents: mathCents(49.9 + 2 + 5.5) + mathCents(zone.fee),
      items: [
        {
          id: main.id,
          type: 'dish',
          quantity: 1,
          expected_unit_cents: 5190,
          price: 0.01,
          addons: [{ addonId: 'extra', qty: 1, price: 0.01 }],
        },
        { id: beverage.id, type: 'beverage', quantity: 1, expected_unit_cents: 550, price: 0.01 },
      ],
    };
    const key = randomUUID(),
      beforeStock = (await dish(main.id)).stock;
    const concurrent = await Promise.all([order(body, key), order(body, key)]);
    concurrent.forEach((r) => assert.equal(r.status, 200, JSON.stringify(r.json)));
    assert.equal(concurrent[0].json.id, concurrent[1].json.id);
    assert.equal(concurrent[0].json.totalCents, body.expected_total_cents);
    assert.equal((await dish(main.id)).stock, beforeStock - 1);
    const receipt = concurrent[0].json;
    await patch(main.id, { promo_active: false });
    const changed = await order(body);
    assert.equal(changed.status, 409);
    assert.equal(changed.json.code, 'PRICE_CHANGED');
    assert.equal(changed.json.quote.totalCents, body.expected_total_cents + 1000);
    assert.equal((await dish(main.id)).stock, beforeStock - 1);
    const historical = (await remote('/rest/v1/orders?id=eq.' + key + '&select=items,total'))[0];
    assert.equal(Number(historical.items[0].price), 51.9);
    assert.equal(historical.items[0].promo_active, true);
    await cancel(receipt.code);
    await cancel(receipt.code);
    assert.equal((await dish(main.id)).stock, beforeStock);
    const reconfirmed = {
      ...body,
      expected_total_cents: body.expected_total_cents + 1000,
      items: body.items.map((i, index) => ({
        ...i,
        expected_unit_cents: index === 0 ? 6190 : 550,
      })),
    };
    const accepted = await order(reconfirmed);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.json.totalCents, reconfirmed.expected_total_cents);
    await cancel(accepted.json.code);
    const pickup = await order({
      customer: { ...customer, delivery: 'pickup' },
      expected_total_cents: 550,
      items: [{ id: beverage.id, type: 'beverage', quantity: 1, expected_unit_cents: 550 }],
    });
    assert.equal(pickup.status, 200);
    assert.equal(pickup.json.fulfillment.delivery_fee, 0);
    await cancel(pickup.json.code);
    pass(
      'Financeiro V2 real: promoção+adicional+bebida+taxa exatos, manipulação ignorada, idempotência concorrente, snapshot, reconfirmação 409/200, retirada sem taxa e cancelamento sem dupla reposição'
    );
    for (const file of [
      'src/lib/orderRoute.ts',
      'src/lib/orderIdempotency.ts',
      'supabase/migrations/20261018153509_dish_promotions_manual.sql',
      'supabase/migrations/20261018163002_dish_promotions_rpc_compatibility.sql',
    ]) {
      const baseline = execFileSync('git', [
        'show',
        `86d3a7beeb026ead43481ec9dc52734a93105a13:${file}`,
      ]);
      assert.equal(
        createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
        createHash('sha256').update(baseline).digest('hex'),
        file
      );
    }
    pass('Fontes e migrations financeiras originais preservadas por SHA-256');
    output.status = 'passed';
  } finally {
    if (output.status !== 'passed' && currentPage && !currentPage.isClosed()) {
      await currentPage
        .screenshot({ path: 'artifacts/etapa-c-failure.png', fullPage: true })
        .catch(() => {});
      output.failureURL = currentPage.url();
    }
    if (auth) {
      await Promise.all(uploadResponses);
      for (const code of orders) {
        try {
          await cancel(code);
        } catch (e) {
          output.cleanupPending = true;
          console.error('CLEANUP: ' + e.message);
        }
      }
      for (const kind of ['dishes', 'beverages', 'categories'])
        for (const row of fixtures[kind]) {
          try {
            assert.equal((await api('/api/admin/' + kind + '/' + row.id, 'DELETE')).status, 200);
          } catch (e) {
            output.cleanupPending = true;
            console.error('CLEANUP: ' + e.message);
          }
        }
      for (const publicUrl of uploaded) {
        try {
          assert.equal(
            (await api('/api/upload', 'DELETE', { publicUrl })).json.ok,
            true,
            'Arquivo próprio sem referência deve permitir limpeza'
          );
        } catch (e) {
          output.cleanupPending = true;
          console.error('CLEANUP: ' + e.message);
        }
      }
    }
    try {
      const init = { headers: { Prefer: 'resolution=merge-duplicates' }, method: 'POST' };
      if (previousCommercial)
        await remote('/rest/v1/restaurant_settings?on_conflict=key', {
          ...init,
          body: JSON.stringify({ key: 'commercial', value: previousCommercial.value }),
        });
      else await remote('/rest/v1/restaurant_settings?key=eq.commercial', { method: 'DELETE' });
      if (previousOperations)
        await remote('/rest/v1/restaurant_settings?on_conflict=key', {
          ...init,
          body: JSON.stringify({ key: 'order_operations', value: previousOperations.value }),
        });
      assert.deepEqual(
        await remote('/rest/v1/dishes?select=id,price,stock,promo_price,promo_active&order=id'),
        existingDishes
      );
      assert.deepEqual(
        await remote('/rest/v1/beverages?select=id,price,stock&order=id'),
        existingBeverages
      );
      pass(
        'Limpeza: somente fixtures removidas, pedidos fictícios cancelados e preservados, conteúdo/funcionamento restaurados e catálogo anterior intacto'
      );
    } catch (e) {
      output.cleanupPending = true;
      console.error('CLEANUP: ' + e.message);
    }
    if (browser) await browser.close();
    child.kill('SIGTERM');
    log.end();
    if (output.cleanupPending) {
      output.status = 'cleanup_required';
      process.exitCode = 1;
    }
    save();
  }
}
function mathCents(value) {
  return Math.round(Number(value) * 100);
}
main().catch((error) => {
  output.status = 'failed';
  output.error = String(error.message).replace(/(?:eyJ|sb_secret_)[A-Za-z0-9_.-]+/g, '[REDACTED]');
  save();
  console.error('FAIL: ' + output.error);
  console.error(error.stack?.split('\n').slice(-4).join('\n'));
  process.exitCode = 1;
});
