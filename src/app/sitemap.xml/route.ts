import { NextResponse } from 'next/server';
import { getDishes, getCategories } from '../../lib/api';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const dishes = await getDishes().catch(() => []);
    const categories = await getCategories().catch(() => []);

    const pages = [
      '',
      'cardapio'
    ];

    let urls = pages.map(p => `${baseUrl}/${p}`);

    categories.forEach((c:any) => urls.push(`${baseUrl}/categoria/${c.slug || c.id}`));
    (dishes || []).forEach((d:any) => urls.push(`${baseUrl}/dishes/${d.slug || d.id}`));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') +
      `\n</urlset>`;

    return new NextResponse(xml, { headers: { 'content-type': 'application/xml' } });
  } catch (err) {
    console.error('sitemap error', err);
    return new NextResponse('error', { status: 500 });
  }
}
