import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// The picture link previews (Telegram, WhatsApp, Facebook, X…) show for any
// page without one of its own: a static file, so serving it costs no server
// time. Paintings use their photo, stories their cover, artists their photo.
export const OG_IMAGE = {
  url: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Art Qala Gallery — Tashkent · Khiva · Uzbekistan',
};

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
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Art Qala — Gallery & Studio | Tashkent, Uzbekistan',
    description: 'Paintings that carry the soul of Uzbekistan — original artworks from Tashkent.',
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
  },
};
