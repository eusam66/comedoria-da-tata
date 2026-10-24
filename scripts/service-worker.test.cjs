const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker(fetch = async () => new Response('fresh'), cacheUnavailable = false) {
  const events = {};
  const entries = new Map();
  const removed = [];
  const context = { URL, Response, fetch, caches: {
    keys: async () => ['workbox-precache-old', 'apis', 'tata-public-v1', 'tata-public-v2', 'unrelated-app'],
    delete: async name => removed.push(name),
    open: async () => { if (cacheUnavailable) throw new Error('quota'); return ({ put: async (r, v) => entries.set(r.url, v),
      match: async r => entries.get(r.url), keys: async () => [], delete: async () => {} }); },
  }, self: { location: { origin: 'https://test.invalid' }, skipWaiting() {}, clients: { claim: async () => {} },
    addEventListener: (name, fn) => { events[name] = fn; } } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  const intercept = (path, method = 'GET', mode = 'cors', headers = new Headers()) => {
    let response;
    events.fetch({ request: { url: new URL(path, context.self.location.origin).href, method, mode, headers },
      respondWith: value => { response = value; } });
    return response;
  };
  return { events, removed, intercept, entries };
}
test('APIs, checkout, Auth, pedido, RSC e WhatsApp não são interceptados', () => {
  const w = worker();
  for (const path of ['/api/orders', '/api/store-status', '/api/delivery-zones', '/api/menu', '/api/auth/login', '/admin', '/pedido/HOM1234', '/?checkout=1', 'https://wa.me/000'])
    assert.equal(w.intercept(path), undefined, path);
  assert.equal(w.intercept('/icons/test.png', 'POST'), undefined);
  assert.equal(w.intercept('/', 'GET', 'navigate', new Headers({ RSC: '1' })), undefined);
});
test('atualização limpa caches antigos sem apagar caches de outras aplicações', async () => {
  const w = worker();
  let done;
  w.events.activate({ waitUntil: p => { done = p; } });
  await done;
  assert.deepEqual(w.removed, ['workbox-precache-old', 'apis', 'tata-public-v1', 'tata-public-v2']);
});
test('shell e assets funcionam offline após visita online; sem cache não inventa sucesso', async () => {
  let offline = false;
  const w = worker(async () => {
    if (offline) throw new Error('offline');
    const response = new Response('online');
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  });
  assert.equal(await (await w.intercept('/', 'GET', 'navigate')).text(), 'online');
  offline = true;
  assert.equal(await (await w.intercept('/', 'GET', 'navigate')).text(), 'online');
  assert.equal((await w.intercept('/icons/missing.png')).type, 'error');
});

test('falha do CacheStorage não descarta uma resposta de rede válida', async () => {
  const w = worker(async () => {
    const response = new Response('fresh');
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  }, true);
  assert.equal(await (await w.intercept('/', 'GET', 'navigate')).text(), 'fresh');
});
