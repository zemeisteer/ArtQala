import type { MetadataRoute } from 'next';

// "Add to home screen": the site installs like an app (icon, opens full
// screen, works offline with a fallback page — see public/sw.js).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Art Qala Gallery',
    short_name: 'Art Qala',
    description: 'Original paintings and crafts from Uzbekistan — gallery in Tashkent and Khiva.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF4EC',
    theme_color: '#BA4E25',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
