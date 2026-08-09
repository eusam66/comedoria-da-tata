import { NextResponse } from 'next/server';
import { getDishes } from '../../lib/api';

const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=86400';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const dishes = await getDishes().catch(() => []);
    const urls = [baseUrl.replace(/\/$/, '')];
    (dishes || []).forEach((d: any) => urls.push(`${baseUrl}/dishes/${d.slug || d.id}`));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
      `\n</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'content-type': 'application/xml',
        'cache-control': CACHE_CONTROL
      }
    });
  } catch (err) {
    console.error('sitemap error', err);
    return new NextResponse('error', { status: 500, headers: { 'cache-control': CACHE_CONTROL } });
  }
}
