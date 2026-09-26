import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { LANGS, localizePath } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

// Every public page in all three languages (English unprefixed, /ru, /uz),
// each entry listing its other-language versions so search engines connect
// them instead of treating them as duplicates.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://artqala.com';

  const entriesFor = (
    path: string,
    extra: { lastModified: Date; changeFrequency: 'weekly' | 'daily'; priority: number }
  ): MetadataRoute.Sitemap => {
    const languages = Object.fromEntries(LANGS.map((l) => [l, `${baseUrl}${localizePath(path, l)}`]));
    return LANGS.map((lang) => ({
      url: `${baseUrl}${localizePath(path, lang)}`,
      ...extra,
      alternates: { languages },
    }));
  };

  const staticPaths = ['/', '/gallery', '/artists', '/services', '/contact', '/reviews', '/privacy', '/terms'];
  const routes = staticPaths.flatMap((path) =>
    entriesFor(path, {
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: path === '/' ? 1.0 : 0.8,
    })
  );

  try {
    const paintings = await prisma.painting.findMany({
      select: { id: true, updated_at: true },
    });
    const paintingRoutes = paintings.flatMap((p) =>
      entriesFor(`/gallery/${p.id}`, {
        lastModified: p.updated_at || new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      })
    );
    return [...routes, ...paintingRoutes];
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
    return routes;
  }
}
