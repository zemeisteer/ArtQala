import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';

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
