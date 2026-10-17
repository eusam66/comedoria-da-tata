const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    // Sem mocks de API: servidor local está ligado somente à homologação.
    await page.goto('http://localhost:3000/manifest.json');
    const activated = await page.evaluate(async () => {
      const old = await caches.open('apis');
      await old.put('/api/store-status', new Response('{"isOpen":true}'));
      await caches.open('workbox-precache-old');
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
      const worker = registration.installing || registration.waiting || registration.active;
      if (worker.state !== 'activated') await new Promise(resolve => worker.addEventListener('statechange', () => { if (worker.state === 'activated') resolve(); }));
      return registration.scope;
    });
    await page.goto('http://localhost:3000/');
    const cachesAfter = await page.evaluate(() => caches.keys());
    assert.ok(!cachesAfter.includes('apis'));
    assert.ok(!cachesAfter.includes('workbox-precache-old'));
    const online = await page.evaluate(async () => {
      const response = await fetch('/icons/icon-192.png');
      return response.status;
    });
    assert.equal(online, 200);
    await context.setOffline(true);
    const offline = await page.evaluate(async () => {
      const asset = await fetch('/icons/icon-192.png').then(r => r.status).catch(() => 0);
      const api = await fetch('/api/store-status').then(r => r.status).catch(() => 0);
      return { asset, api };
    });
    assert.equal(offline.asset, 200);
    assert.equal(offline.api, 0);
    const response = await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('.site-header').waitFor();
    assert.equal(await page.locator('.header-status').getByText('Fechado', { exact: true }).count(), 1);
    const result = { registrationScope: activated, legacyCacheRemoved: true, offlineAssetStatus: offline.asset, offlineApiUnavailable: true, offlineShellStatus: response.status(), offlineOrdersBlocked: true };
    fs.writeFileSync('artifacts/pwa-browser-results.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
