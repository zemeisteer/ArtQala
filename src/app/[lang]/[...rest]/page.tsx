import { notFound } from 'next/navigation';

// Any public URL that matches no page. The middleware routes every unknown
// path under a language (/foo -> /en/foo), so this catch-all turns it into
// the site's own 404 (app/[lang]/not-found.tsx) inside the normal layout —
// header, footer and the right <html lang> — instead of Next's bare 404.
export default function UnknownPage() {
  notFound();
}
