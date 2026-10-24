import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      process.env.NEXT_PUBLIC_APP_ENV === 'homologacao'
        ? { userAgent: '*', disallow: '/' }
        : { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/pedido/'] },
    sitemap: siteUrl() + '/sitemap.xml',
    host: siteUrl(),
  };
}
