'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Last-resort error screen when the root layout itself fails — reports the
// error to Sentry and offers a reload. Kept dependency-free (no context,
// no translations) since the app shell may be what broke.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Georgia, serif', background: '#FAF4EC', color: '#281C18' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#6E6057', margin: '0 0 20px' }}>
              Please try again. If it keeps happening, contact the gallery.
            </p>
            <button
              onClick={() => reset()}
              style={{ background: '#BA4E25', color: '#fff', border: 0, padding: '10px 22px', borderRadius: 3, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
