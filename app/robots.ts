import type { MetadataRoute } from 'next';
import { getPublicEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/checkout/'] },
    sitemap: `${NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
    host: NEXT_PUBLIC_SITE_URL,
  };
}
