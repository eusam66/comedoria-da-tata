// Renderiza o componente real isoladamente; aborta qualquer requisição externa.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { chromium } = require('playwright');

function compile(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env: {} }, require: name => dependencies[name] || require(name) });
  return exports;
}
async function main() {
  fs.mkdirSync('artifacts', { recursive: true });
  const whatsapp = compile('src/lib/whatsapp.ts');
  const Confirmation = compile('src/components/OrderConfirmation.tsx', { '@/lib/whatsapp': whatsapp }).default;
  const order = { id: 'isolated', code: 'HOM1234', totalCents: 2590, subtotalCents: 2590,
    customer: { name: 'HOMOLOGAÇÃO João', phone: '000', delivery: 'pickup', payment: 'pix' },
    fulfillment: { type: 'pickup', delivery_fee: 0 }, items: [{ name: 'HOMOLOGAÇÃO Prato', quantity: 1, price: 25.9 }] };
  const html = renderToStaticMarkup(React.createElement(Confirmation, { order }));
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext();
    const requests = [];
    await context.route('**/*', route => { requests.push({ url: route.request().url(), method: route.request().method() }); return route.abort(); });
    const page = await context.newPage();
    await page.setContent(html);
    const link = page.getByRole('link', { name: 'ABRIR WHATSAPP', exact: true });
    const href = await link.getAttribute('href');
    assert.equal(new URL(href).searchParams.get('text'), whatsapp.buildOrderMessage(order));
    assert.equal(await link.getAttribute('target'), '_blank');
    for (let i = 0; i < 2; i++) {
      const popupPromise = page.waitForEvent('popup');
      await link.click();
      const popup = await popupPromise;
      await popup.waitForLoadState().catch(() => {});
      await popup.close();
    }
    assert.equal(requests.length, 2);
    assert.ok(requests.every(r => r.method === 'GET' && r.url.startsWith('https://wa.me/')));
    assert.equal(await page.getByRole('button', { name: 'COPIAR MENSAGEM', exact: true }).count(), 1);
    const result = { manualClicks: 2, externalRequestsAborted: requests.length, orderPosts: 0, messageRoundTrip: true, confirmationRemainsVisible: true };
    fs.writeFileSync('artifacts/manual-whatsapp-link.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
