import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/admin/',
        // private pages, in every language (/ru/..., /uz/...)
        ...['', '/ru', '/uz'].flatMap((prefix) => [`${prefix}/account`, `${prefix}/verify-otp`]),
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
