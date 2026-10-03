import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// Site-wide default metadata, shared by the two root layouts (the public
// site under app/[lang] and the admin panel). Pages override what they need.
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Art Qala — Gallery & Studio | Tashkent, Uzbekistan',
    template: '%s | Art Qala Gallery',
  },
  description:
    'Art Qala is a premier art gallery in Tashkent, Uzbekistan, showcasing original paintings of historical monuments, portraits, and traditional crafts, alongside custom murals and ceramics.',
  alternates: {
    canonical: '/',
  },
  keywords: [
    'Tashkent art gallery',
    'Uzbekistan paintings',
    'Tashkent art',
    'Barakhon Madrasah gallery',
    'Ikat ceramics',
    'Custom murals Tashkent',
    'Original Central Asian art',
  ],
  authors: [{ name: 'Art Qala Gallery' }],
  creator: 'Art Qala',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: 'Art Qala — Gallery & Studio | Tashkent, Uzbekistan',
    description:
      'Paintings that carry the soul of Uzbekistan — historical monuments, portraits and everyday craft, alongside custom murals and ceramics.',
    siteName: 'Art Qala Gallery',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Art Qala — Gallery & Studio | Tashkent, Uzbekistan',
    description: 'Paintings that carry the soul of Uzbekistan — original artworks from Tashkent.',
  },
  robots: {
    index: true,
    follow: true,
  },
};
