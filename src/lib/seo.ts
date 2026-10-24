import { PUBLIC_SITE_URL, type PublicCommerce } from './commercial';
import { effectivePrice } from './pricing';
import type { Dish } from './api';
// URL oficial estável também em previews; homologação usa noindex.
export function siteUrl() {
  return PUBLIC_SITE_URL;
}
export function canonicalDishUrl(slug: string) {
  return `${siteUrl()}/dishes/${encodeURIComponent(slug)}`;
}
export function seoImage(image?: string | null) {
  try {
    const u = new URL(image || '/branding/logo-oficial.jpg', siteUrl());
    if (['http:', 'https:'].includes(u.protocol)) return u.href;
  } catch {
    /* URL inválida: usar a identidade visual. */
  }
  return `${siteUrl()}/branding/logo-oficial.jpg`;
}
export function dishMetadata(dish: Dish) {
  const title = `${dish.name} — Comedoria da Tata`;
  const description =
    dish.description?.trim().slice(0, 220) ||
    `${dish.name} no cardápio da Comedoria da Tata, em Chã Grande, Pernambuco.`;
  const url = canonicalDishUrl(dish.slug);
  const image = seoImage(dish.image);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article' as const,
      url,
      images: [{ url: image, alt: dish.name }],
    },
    twitter: { card: 'summary_large_image' as const, title, description, images: [image] },
  };
}
export function restaurantSchema(data: PublicCommerce) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: data.name,
    url: siteUrl(),
    image: seoImage(),
    telephone: data.phone,
    servesCuisine: ['Brasileira', 'Nordestina'],
    hasMenu: `${siteUrl()}/#cardapio`,
    address: {
      '@type': 'PostalAddress',
      ...(data.address ? { streetAddress: data.address } : {}),
      addressLocality: 'Chã Grande',
      addressRegion: 'PE',
      addressCountry: 'BR',
    },
    openingHoursSpecification: data.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${h.day[0].toUpperCase() + h.day.slice(1)}`,
      opens: h.open,
      closes: h.close,
    })),
  };
}
export function dishSchema(dish: Dish) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: dish.name,
    ...(dish.description ? { description: dish.description } : {}),
    url: canonicalDishUrl(dish.slug),
    image: seoImage(dish.image),
    ...(dish.categoryName ? { inMenuSection: dish.categoryName } : {}),
    offers: {
      '@type': 'Offer',
      price: effectivePrice(dish).toFixed(2),
      priceCurrency: 'BRL',
      availability:
        dish.isAvailable !== false && Number(dish.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonicalDishUrl(dish.slug),
    },
  };
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
export function escapeXml(value: string) {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!)
  );
}
