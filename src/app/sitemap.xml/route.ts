import { siteUrl, escapeXml } from '@/lib/seo';
import { NextResponse } from 'next/server';
import { getDishes } from '../../lib/api';

export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=86400';

export async function GET() {
  try {
    const baseUrl = siteUrl();
    const dishes = await getDishes({ includeUnavailable: true }).catch(() => []);
    const urls = [baseUrl.replace(/\/$/, '')];
    (dishes || []).forEach((d: any) =>
      urls.push(`${baseUrl}/dishes/${encodeURIComponent(d.slug)}`)
    );

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n') +
      `\n</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'content-type': 'application/xml',
        'cache-control': CACHE_CONTROL,
      },
    });
  } catch (err) {
    console.error('sitemap error', err);
    return new NextResponse('error', { status: 500, headers: { 'cache-control': CACHE_CONTROL } });
  }
}
