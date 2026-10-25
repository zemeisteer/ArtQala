import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { LANGS, localizePath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';

// Rebuilt at most once a day, or at once on a catalogue edit (it used to
// query the database on every single crawler request).
export const revalidate = 86400;

// Every public page in all three languages (English unprefixed, /ru, /uz),
// each entry listing its other-language versions so search engines connect
// them instead of treating them as duplicates.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  const entriesFor = (
    path: string,
    extra: { lastModified: Date; changeFrequency: 'weekly' | 'daily'; priority: number }
  ): MetadataRoute.Sitemap => {
    const languages = {
      ...Object.fromEntries(LANGS.map((l) => [l, `${baseUrl}${localizePath(path, l)}`])),
      // Same fallback the pages' own hreflang tags declare (English).
      'x-default': `${baseUrl}${localizePath(path, 'en')}`,
    };
    return LANGS.map((lang) => ({
      url: `${baseUrl}${localizePath(path, lang)}`,
      ...extra,
      alternates: { languages },
    }));
  };

  const staticPaths = ['/', '/gallery', '/artists', '/services', '/delivery', '/contact', '/reviews', '/privacy', '/terms'];
  const staticRoutes = (lastModified: Date) =>
    staticPaths.flatMap((path) =>
      entriesFor(path, {
        lastModified,
        changeFrequency: 'weekly',
        priority: path === '/' ? 1.0 : 0.8,
      })
    );

  try {
    const [paintings, artists] = await Promise.all([
      prisma.painting.findMany({ select: { id: true, updated_at: true } }),
      prisma.artist.findMany({ select: { id: true, updated_at: true } }),
    ]);
    // "Last modified" of the listing pages = the newest change in the
    // catalogue, so the date only moves when something really changed
    // (a date that is always "now" teaches crawlers to ignore it).
    const newest = paintings.reduce((max, p) => (p.updated_at > max ? p.updated_at : max), new Date(0));
    const routes = staticRoutes(paintings.length > 0 ? newest : new Date());
    const paintingRoutes = paintings.flatMap((p) =>
      entriesFor(`/gallery/${p.id}`, {
        lastModified: p.updated_at || new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      })
    );
    const artistRoutes = artists.flatMap((a) =>
      entriesFor(`/artists/${a.id}`, {
        lastModified: a.updated_at || new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    );
    return [...routes, ...paintingRoutes, ...artistRoutes];
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
    return staticRoutes(new Date());
  }
}
