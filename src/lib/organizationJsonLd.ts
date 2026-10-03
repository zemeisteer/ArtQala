import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/siteUrl';
import { parseSocialLinks, normalizeSocialUrl, parseLocations } from '@/lib/settingsUtils';

// The gallery's schema.org ArtGallery block, rendered on every public page.
export async function getOrganizationJsonLd() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const locations = parseLocations(settings?.locations, settings?.address, settings?.location_map);
    const primaryLocation = locations[0] || { address: 'Barakhon Madrasah, Tashkent, Uzbekistan', url: '' };
    return {
      '@context': 'https://schema.org',
      '@type': 'ArtGallery',
      name: 'Art Qala',
      description:
        'Art Qala is a premier art gallery in Tashkent, Uzbekistan, showcasing original paintings of historical monuments, portraits, and traditional crafts, alongside custom murals and ceramics.',
      url: SITE_URL,
      image: `${SITE_URL}/logo.png`,
      telephone: settings?.phone || '+998 66 233 44 55',
      email: settings?.email || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: primaryLocation.address,
        addressLocality: 'Tashkent',
        addressCountry: 'UZ',
      },
      ...(primaryLocation.url ? { hasMap: primaryLocation.url } : {}),
      sameAs: parseSocialLinks(settings?.social_links, settings?.telegram, settings?.instagram).map((l) =>
        normalizeSocialUrl(l.url)
      ),
    };
  } catch {
    return null;
  }
}
