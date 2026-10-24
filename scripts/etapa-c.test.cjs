const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const QRCode = require('qrcode');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
function compile(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      process: { env: {} },
      Date,
      URL,
      console,
      require: (n) => {
        assert.ok(n in deps, n);
        return deps[n];
      },
    }
  );
  return exports;
}
const media = compile('src/lib/dishMedia.ts'),
  commercial = compile('src/lib/commercial.ts'),
  pricing = compile('src/lib/pricing.ts');
const sharing = compile('src/lib/sharing.ts', { './commercial': commercial });
const seo = compile('src/lib/seo.ts', { './commercial': commercial, './pricing': pricing });
const rec = compile('src/lib/recommendations.ts');
const upload = compile('src/lib/imageUpload.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));
const uuid = '11111111-1111-4111-8111-111111111111';
test('galeria: 0/1/2/5 fotos, capa legada e sexta foto rejeitada sem perda', () => {
  for (const count of [0, 1, 2, 5]) {
    const photos = Array.from({ length: count }, (_, i) => ({
      url: `/pratos/photo-${i}.jpg`,
      alt: `Foto ${i}`,
    }));
    assert.equal(media.validateGallery(photos).length, count);
  }
  assert.throws(() =>
    media.validateGallery(Array.from({ length: 6 }, (_, i) => ({ url: `/p/${i}.jpg` })))
  );
  assert.deepEqual(plain(media.dishPhotos([], '/pratos/legado.jpg', 'Prato')), [
    { url: '/pratos/legado.jpg', alt: 'Prato' },
  ]);
  const rows = [
    { url: '/pratos/two.jpg', alt: 'Recheio' },
    { url: '/pratos/one.jpg', alt: 'Principal' },
  ];
  assert.equal(media.validateGallery(rows)[0].url, '/pratos/two.jpg');
  assert.equal(rows[1].alt, 'Principal');
});
test('galeria recusa URLs executáveis, duplicadas e alt excessivo', () => {
  for (const gallery of [
    [{ url: 'javascript:alert(1)' }],
    [{ url: 'data:image/svg+xml,evil' }],
    [{ url: '//outside.test/x.jpg' }],
    [{ url: '/a.jpg' }, { url: '/a.jpg' }],
    [{ url: '/a.jpg', alt: 'x'.repeat(161) }],
    {},
  ])
    assert.throws(() => media.validateGallery(gallery));
});
test('relacionados: máximo seis, UUID válido, sem autorreferência ou duplicação', () => {
  assert.equal(media.validateRelated([{ id: uuid, type: 'beverage' }], uuid).length, 1);
  for (const rows of [
    [{ id: uuid, type: 'dish' }],
    [{ id: 'x', type: 'dish' }],
    [{ id: uuid, type: 'other' }],
    Array(7).fill({ id: uuid, type: 'beverage' }),
    Array(2).fill({ id: uuid, type: 'beverage' }),
  ])
    assert.throws(() => media.validateRelated(rows, uuid));
});
const product = (id, type = 'dish', extra = {}) => ({
  id,
  type,
  name: id,
  price: 59.9,
  stock: 5,
  is_available: true,
  ...extra,
});
test('recomendação prioriza relações explícitas e depois bebidas disponíveis sem repetir carrinho', () => {
  const catalog = [
    product('main', 'dish', { related_products: [{ id: 'side', type: 'dish' }] }),
    product('side'),
    product('drink', 'beverage'),
    product('empty', 'beverage', { stock: 0 }),
    product('hidden', 'dish', { is_available: false }),
  ];
  const cart = [catalog[0]];
  const snapshot = JSON.stringify(cart);
  assert.deepEqual(plain(rec.recommendProducts(catalog, cart).map((p) => p.id)), ['side', 'drink']);
  assert.equal(JSON.stringify(cart), snapshot);
  assert.deepEqual(
    plain(rec.recommendProducts(catalog, [catalog[0], catalog[2]]).map((p) => p.id)),
    ['side']
  );
  assert.equal(rec.recommendProducts(catalog, []).length, 0);
});
test('recomendação preserva promoção e escolhas obrigatórias, sem criar novo identificador', () => {
  const item = product('extra', 'dish', {
    promo_price: 49.9,
    promo_active: true,
    addons: [{ id: 'a', name: 'Escolha', price: 2, maxQty: 1, required: true }],
  });
  const main = product('main', 'dish', { related_products: [{ id: 'extra', type: 'dish' }] });
  const found = rec.recommendProducts([main, item], [main])[0];
  assert.equal(found, item);
  assert.equal(pricing.effectivePrice(found), 49.9);
  assert.equal(found.addons[0].required, true);
});
const review = (extra = {}) => ({
  id: 'review',
  displayName: 'Cliente de teste',
  text: 'Conteúdo autorizado somente para teste.',
  position: 0,
  published: false,
  consent: false,
  consentNote: 'Privado',
  ...extra,
});
test('depoimento exige consentimento e publicação manual; público nunca recebe comprovação privada', () => {
  const hidden = commercial.validateCommercial({
    ...commercial.EMPTY_COMMERCIAL,
    testimonials: [review()],
  });
  assert.equal(commercial.publicCommercial(hidden).testimonials.length, 0);
  assert.throws(() =>
    commercial.validateCommercial({
      ...commercial.EMPTY_COMMERCIAL,
      testimonials: [review({ published: true })],
    })
  );
  const allowed = commercial.validateCommercial({
    ...commercial.EMPTY_COMMERCIAL,
    testimonials: [review({ consent: true, published: true })],
  });
  assert.ok(allowed.testimonials[0].consentRecordedAt);
  const pub = commercial.publicCommercial(allowed);
  assert.equal(pub.testimonials.length, 1);
  assert.ok(!JSON.stringify(pub).includes('Privado'));
  assert.ok(!JSON.stringify(pub).includes('consentRecordedAt'));
});
test('revogação oculta depoimento e FAQ não publicada não aparece', () => {
  const source = commercial.validateCommercial({
    ...commercial.EMPTY_COMMERCIAL,
    testimonials: [review({ consent: true, published: true })],
  });
  const revoked = commercial.validateCommercial(
    { ...source, testimonials: [review({ consent: false, published: false })] },
    source
  );
  assert.equal(commercial.publicCommercial(revoked).testimonials.length, 0);
  const faq = {
    id: 'q',
    question: 'Pergunta real de teste?',
    answer: 'Resposta controlada de teste.',
    published: false,
    position: 0,
  };
  assert.equal(
    commercial.publicCommercial(
      commercial.validateCommercial({ ...commercial.EMPTY_COMMERCIAL, faq: [faq] })
    ).faq.length,
    0
  );
  assert.throws(() =>
    commercial.validateCommercial({
      ...commercial.EMPTY_COMMERCIAL,
      faq: [{ ...faq, question: '' }],
    })
  );
});
test('conteúdo comercial tem limites e texto é dado, nunca HTML executável', () => {
  const value = commercial.validateCommercial({
    ...commercial.EMPTY_COMMERCIAL,
    about: '</script><script>alert(1)</script>',
  });
  assert.ok(value.about.includes('<script>'));
  assert.ok(!seo.jsonLd(value).includes('<script>'));
  assert.throws(() =>
    commercial.validateCommercial({ ...commercial.EMPTY_COMMERCIAL, about: 'x'.repeat(2001) })
  );
  assert.throws(() =>
    commercial.validateCommercial({
      ...commercial.EMPTY_COMMERCIAL,
      testimonials: Array(31).fill(review()),
    })
  );
});
test('compartilhamento mantém slug e URL estáveis e usa apenas texto no WhatsApp', () => {
  const data = sharing.dishShareData('Prato & família', 'prato-caseiro', 'Descrição real');
  assert.equal(data.url, commercial.PUBLIC_SITE_URL + '/dishes/prato-caseiro');
  assert.equal(
    sharing.dishShareData('Sem descrição', 'slug', null).text,
    'Sem descrição — Comedoria da Tata\n' + commercial.PUBLIC_SITE_URL + '/dishes/slug'
  );
  const url = new URL(sharing.dishWhatsappShare(data.text));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.searchParams.get('text'), data.text);
  assert.equal(sharing.dishWhatsappShare(data.text, 'homologacao'), null);
  assert.ok(
    sharing
      .dishShareData('Prato', '//external.test')
      .url.startsWith(commercial.PUBLIC_SITE_URL + '/dishes/%2F%2F')
  );
});
test('metadata e schema usam dados reais, preço efetivo e imagem; não inventam avaliações', () => {
  const dish = {
    id: 'd',
    name: 'Lasanha de teste',
    slug: 'lasanha-teste',
    description: 'Descrição específica.',
    price: 59.9,
    promo_price: 49.9,
    promo_active: true,
    image: '/pratos/real.jpg',
    stock: 0,
    isAvailable: false,
  };
  const metadata = seo.dishMetadata(dish);
  assert.equal(metadata.alternates.canonical, commercial.PUBLIC_SITE_URL + '/dishes/lasanha-teste');
  assert.equal(metadata.openGraph.description, dish.description);
  assert.ok(metadata.openGraph.images[0].url.endsWith('/pratos/real.jpg'));
  const schema = seo.dishSchema(dish);
  assert.equal(schema.offers.price, '49.90');
  assert.ok(schema.offers.availability.endsWith('OutOfStock'));
  assert.ok(!('aggregateRating' in schema));
  assert.ok(!('review' in schema));
  assert.equal(seo.seoImage(null), commercial.PUBLIC_SITE_URL + '/branding/logo-oficial.jpg');
  assert.equal(seo.escapeXml('<&"'), '&lt;&amp;&quot;');
});
test('informação local não inventa endereço completo, certificados, notas ou preço de entrega', () => {
  const data = { name: 'Comedoria da Tata', phone: '5581992743126', address: '', openingHours: [] };
  const schema = seo.restaurantSchema(data);
  assert.equal(schema.address.addressLocality, 'Chã Grande');
  assert.ok(!('streetAddress' in schema.address));
  assert.ok(!JSON.stringify(schema).includes('aggregateRating'));
  assert.ok(!('priceRange' in schema));
});
test('upload recusa arquivos disfarçados e grande; valida assinaturas permitidas', () => {
  assert.equal(
    upload.imageSignatureMatches('image/png', Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
    true
  );
  assert.equal(upload.imageSignatureMatches('image/jpeg', Uint8Array.from([255, 216, 255])), true);
  assert.equal(
    upload.imageSignatureMatches('image/jpeg', new TextEncoder().encode('<svg onload=alert(1)>')),
    false
  );
  assert.throws(() => upload.validateSourceImage({ type: 'image/svg+xml', size: 10 }));
  assert.throws(() => upload.validateSourceImage({ type: 'image/jpeg', size: 21 * 1024 * 1024 }));
});
test('QR Code PNG é legível a 256px e aponta exatamente ao cardápio, sem rastreamento', async () => {
  const png = PNG.sync.read(
    await QRCode.toBuffer(commercial.PUBLIC_SITE_URL, {
      width: 256,
      margin: 4,
      errorCorrectionLevel: 'M',
    })
  );
  const read = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(read?.data, commercial.PUBLIC_SITE_URL);
  const svg = await QRCode.toString(commercial.PUBLIC_SITE_URL, { type: 'svg', margin: 4 });
  assert.ok(svg.includes('<svg'));
  assert.ok(!svg.includes('http://api.'));
});

test('ponte Storage falha fechada antes da migration e protege referências na galeria', async () => {
  for (const missing of [true, false]) {
    let deletions = 0;
    const client = {
      from: () => ({
        select() {
          return this;
        },
        eq() {
          return this;
        },
        contains(column, value) {
          assert.equal(column, 'gallery');
          assert.equal(typeof value, 'string');
          assert.ok(JSON.parse(value)[0].url);
          this.gallery = true;
          return this;
        },
        limit() {
          return Promise.resolve(
            this.gallery
              ? missing
                ? { error: { code: '42703' }, data: null }
                : { error: null, data: [{ id: 'referenced' }] }
              : { error: null, data: [] }
          );
        },
      }),
      storage: {
        from: () => ({
          remove: async () => {
            deletions++;
            return { error: null };
          },
        }),
      },
    };
    const storage = compile('src/lib/storageAdmin.ts', { './supabaseAdmin': { default: client } });
    assert.equal(
      await storage.removeStorageFileByPublicUrlIfUnreferenced(
        'https://nkywpsftihxcuvdxeexn.supabase.co/storage/v1/object/public/dishes/test.jpg'
      ),
      false
    );
    assert.equal(deletions, 0);
  }
});
