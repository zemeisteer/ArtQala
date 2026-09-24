import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';

  // Static pages
  const routes = [
    '',
    '/gallery',
    '/artists',
    '/services',
    '/contact',
    '/reviews',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Dynamic painting detail pages
  try {
    const paintings = await prisma.painting.findMany({
      select: { id: true, updated_at: true },
    });

    const paintingRoutes = paintings.map((p) => ({
      url: `${baseUrl}/gallery/${p.id}`,
      lastModified: p.updated_at || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    return [...routes, ...paintingRoutes];
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
    return routes;
  }
}
