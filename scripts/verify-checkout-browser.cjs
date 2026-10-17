// Testes de interface com respostas controladas. Não aprovam a integração HTTP/DB.
// Toda navegação externa é abortada para impedir abertura real de WhatsApp.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function main() {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const results = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    const posts = [];
    const external = [];
    const errors = [];
    page.on('pageerror', e => errors.push({message:e.message, stack:e.stack}));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://localhost:3000') { external.push(url.hostname); if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' }); return route.abort(); }
      const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/store-status') return json({ isOpen: true, label: 'HOMOLOGAÇÃO aberto', temporarilyClosed: false, timezone: 'America/Recife' });
      if (url.pathname === '/api/menu') return json([{ id: '22222222-2222-4222-8222-222222222222', name: 'HOMOLOGAÇÃO Prato', cat: 'Teste', desc: 'Fictício', price: 25.90, image: '/branding/logo-oficial.jpg', stock: 10, available: true }]);
      if (['/api/banners', '/api/beverages'].includes(url.pathname)) return json([]);
      if (url.pathname === '/api/delivery-zones') return json([{ id: '11111111-1111-4111-8111-111111111111', name: 'HOMOLOGAÇÃO Zona A', fee: 8.5 }]);
      if (url.pathname === '/api/orders') {
        posts.push({ key: request.headers()['idempotency-key'], body: request.postData() });
        if (posts.length === 1) return route.abort('failed');
        const payload = JSON.parse(request.postData());
        return json({ id: posts[0].key, code: 'HOM1234', totalCents: 3440, subtotalCents: 2590, customer: payload.customer,
          items: [{ quantity: 1, name: 'HOMOLOGAÇÃO Prato', price: 25.9, notes: 'Sem cebola' }],
          fulfillment: { type: 'delivery', delivery_zone_id: '11111111-1111-4111-8111-111111111111', delivery_zone_name: 'HOMOLOGAÇÃO Zona A', delivery_fee: 8.5, subtotal: 25.9 } });
      }
      return route.continue();
    });
    await page.goto('http://localhost:3000');
    await page.locator('article').filter({ hasText: 'HOMOLOGAÇÃO Prato' }).locator('.add-button').click();
    await page.locator('.header-cart').click();
    await page.getByRole('dialog', { name: 'Sua sacola' }).screenshot({ path: `artifacts/cart-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Continuar para entrega' }).click();
    await page.getByRole('textbox', { name: 'Nome completo' }).fill('HOMOLOGAÇÃO João');
    await page.getByRole('textbox', { name: 'Telefone', exact: true }).fill('00000000000');
    await page.getByRole('textbox', { name: 'Rua / avenida' }).fill('Rua Fictícia');
    await page.getByRole('textbox', { name: 'Número', exact: true }).fill('1');
    await page.getByRole('textbox', { name: 'Bairro', exact: true }).fill('Teste');
    await page.getByRole('combobox').selectOption('11111111-1111-4111-8111-111111111111');
    assert.match(await page.locator('.checkout-total').innerText(), /34,40/);
    await page.getByRole('radio', { name: 'Retirada', exact: true }).check();
    assert.match(await page.locator('.checkout-total').innerText(), /25,90/);
    await page.getByRole('radio', { name: 'Entrega', exact: true }).check();
    await page.getByRole('combobox').selectOption('11111111-1111-4111-8111-111111111111');
    await page.screenshot({ path: `artifacts/checkout-${viewport.width}.png`, fullPage: false });
    await page.locator('.checkout-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    await page.getByRole('alert').filter({ hasText: 'mesma tentativa' }).waitFor();
    assert.equal(posts.length, 1);
    await page.getByRole('button', { name: 'Consultar / tentar novamente', exact: true }).click();
    await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
    assert.equal(posts.length, 2);
    assert.deepEqual(posts[0], posts[1]);
    assert.match(await page.getByRole('textbox', { name: 'Mensagem do pedido' }).inputValue(), /HOM1234[\s\S]*34,40/);
    assert.equal(await page.getByRole('link', { name: 'ABRIR WHATSAPP', exact: true }).count(), 0);
    await page.getByText('WhatsApp indisponível neste ambiente.').waitFor();
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
    await page.getByRole('button', { name: 'COPIAR MENSAGEM', exact: true }).click();
    await page.getByText('Não foi possível copiar automaticamente.', { exact: false }).waitFor();
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedMessage = text; } } }));
    await page.getByRole('button', { name: 'COPIAR MENSAGEM', exact: true }).click();
    assert.match(await page.evaluate(() => window.copiedMessage), /HOM1234/);
    await page.screenshot({ path: `artifacts/confirmation-${viewport.width}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Voltar ao cardápio', exact: true }).click();
    await page.getByRole('button', { name: 'Ver pedido registrado #HOM1234', exact: true }).click();
    await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
    assert.equal(posts.length, 2);
    await page.reload();
    await page.getByRole('heading', { name: 'Pedido registrado', exact: true }).waitFor();
    assert.equal(posts.length, 2);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cart_v1')).length), 0);
    assert.equal(external.some(host => /wa\.me|whatsapp/.test(host)), false);
    assert.deepEqual(errors, []);
    results.push({ viewport, posts: posts.length, sameKeyAndBody: true, reloadNoPost: true, homologacaoWhatsappBlocked: true, clipboardSuccessAndFailure: true, blockedExternalHosts: [...new Set(external)], pageErrors: errors });
    await context.close();
  }
  await browser.close();
  fs.writeFileSync('artifacts/browser-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
