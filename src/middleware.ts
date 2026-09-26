import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  // The fallback below is public (checked into the repo) — running production
  // with it would let anyone forge an admin session token. Fail loudly instead.
  throw new Error(
    'NEXTAUTH_SECRET is not set. Set it in your production environment before deploying (see .env.example).'
  );
}

const SECRET = process.env.NEXTAUTH_SECRET || 'artqala-fallback-secret-2026-tashkent';

// Constant-time string comparison — the Edge runtime's Web Crypto has no
// built-in timingSafeEqual, but a plain `!==` here would let an attacker
// infer a forged signature byte-by-byte from response timing (it exits at
// the first mismatch). This always walks the full length instead.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Mirrors isSessionExpired() in src/lib/auth.ts (which can't be imported
// here — it pulls in Node's crypto, and middleware runs on the Edge runtime).
const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

async function verifyToken(token: string | undefined): Promise<{ role: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(encodedPayload)
    );

    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (!timingSafeEqualStr(expectedSignature, signature)) {
      return null;
    }

    const payloadStr = atob(
      encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    );
    const data = JSON.parse(payloadStr);
    if (data.role === 'ADMIN' && (typeof data.iat !== 'number' || Date.now() - data.iat > ADMIN_SESSION_MAX_AGE_MS)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// The site now lives at the custom domain, but the original Vercel-assigned
// hostname keeps working too (Vercel never lets you turn it off) — a 200
// response there is exactly the "two live copies of the same content" setup
// that confuses both Google's ranking and its own Change-of-Address tool
// (which requires an actual redirect, not just a <link rel="canonical">).
// Redirecting permanently consolidates everything onto the real domain.
const LEGACY_VERCEL_HOST = 'art-qala.vercel.app';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const host = request.headers.get('host');
  if (host === LEGACY_VERCEL_HOST) {
    const canonicalOrigin = process.env.NEXTAUTH_URL || 'https://artqala.com';
    return NextResponse.redirect(new URL(`${pathname}${search}`, canonicalOrigin), 308);
  }

  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (isAdminApi || isAdminPage) {
    const token = request.cookies.get('artqala_user')?.value;
    const session = await verifyToken(token);

    if (!session || session.role !== 'ADMIN') {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin privileges required' },
          { status: 401 }
        );
      } else {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Pass the visitor's country (Vercel's IP geolocation) to the browser so
  // the phone-code and shipping pickers can default to it — see
  // src/lib/visitorCountry.ts. Only (re)written when it changes.
  const response = NextResponse.next();
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  if (country && /^[A-Z]{2}$/.test(country) && request.cookies.get('aq_country')?.value !== country) {
    response.cookies.set('aq_country', country, { path: '/', maxAge: 30 * 24 * 60 * 60, sameSite: 'lax' });
  }
  return response;
}

export const config = {
  // Broadened from just /admin/* so the legacy-host redirect above applies
  // site-wide (e.g. the homepage) — Next's own static assets are excluded
  // since they never need the domain check or the admin auth check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
