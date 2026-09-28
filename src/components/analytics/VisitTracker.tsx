'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitTracker() {
  const pathname = usePathname();
  const lastRecordedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) {
      return;
    }

    if (lastRecordedPath.current === pathname) {
      return;
    }

    // Where the visitor came from (Google, Instagram, ...) only matters for
    // the page they landed on; later in-site navigations have no referrer.
    const referrer = lastRecordedPath.current === null ? document.referrer : '';
    lastRecordedPath.current = pathname;

    // Send visit log asynchronously
    fetch('/api/stats/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer }),
    }).catch(() => {
      // Ignore network errors on analytics ping
    });
  }, [pathname]);

  return null;
}
