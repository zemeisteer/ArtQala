import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LANG_COOKIE, splitLangPath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/siteUrl';
import {
  ADMIN_GATE_COOKIE,
  ADMIN_GATE_MAX_AGE_S,
  adminGateEnabled,
  gateCookieForKey,
  hasAdminGateCookie,
} from '@/lib/adminGate';

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

// The Edge runtime can't query the database, so ask our own API (which
// can), forwarding the visitor's cookie. Only a clear "no" blocks the page:
// if the check itself can't be completed (timeout, an error response) the
// already-verified signature stands, so a hiccup can't lock every admin
// out — and the admin API routes still enforce the live check on their own.
async function isAdminSessionLive(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(new URL('/api/auth/session-check', request.url), {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return true;
    return (await res.json()).ok !== false;
  } catch {
    return true;
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
    const canonicalOrigin = SITE_URL;
    return NextResponse.redirect(new URL(`${pathname}${search}`, canonicalOrigin), 308);
  }

  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // Hidden admin panel (only when ADMIN_ACCESS_KEY is set — see
  // src/lib/adminGate.ts): a device that hasn't been let in with the secret
  // link, and isn't signed in as an admin, gets the site's ordinary 404 for
  // anything under /admin, the login page included.
  if (adminGateEnabled() && pathname.startsWith('/admin')) {
    const gateCookie = await gateCookieForKey(request.nextUrl.searchParams.get('key'));
    if (gateCookie) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.set(ADMIN_GATE_COOKIE, gateCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_GATE_MAX_AGE_S,
        path: '/',
      });
      return response;
    }

    const admin = await verifyToken(request.cookies.get('artqala_user')?.value);
    const letIn =
      admin?.role === 'ADMIN' || (await hasAdminGateCookie(request.cookies.get(ADMIN_GATE_COOKIE)?.value));
    if (!letIn) {
      return NextResponse.rewrite(new URL('/en/page-not-found', request.url), { status: 404 });
    }
  }

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

    // A valid signature isn't the whole story for an admin: the sign-in
    // must still be live in the database (not logged out, not signed out by
    // another admin — see src/lib/adminSessions.ts). Admin API routes check
    // that themselves through getServerSession(); admin pages render on the
    // server straight from the database, so they are checked here.
    if (isAdminPage && !(await isAdminSessionLive(request))) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = routePublicPage(request) || NextResponse.next();

  // Pass the visitor's country (Vercel's IP geolocation) to the browser so
  // the phone-code and shipping pickers can default to it — see
  // src/lib/visitorCountry.ts. Only (re)written when it changes.
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  if (country && /^[A-Z]{2}$/.test(country) && request.cookies.get('aq_country')?.value !== country) {
    response.cookies.set('aq_country', country, { path: '/', maxAge: 30 * 24 * 60 * 60, sameSite: 'lax' });
  }
  return response;
}

// Public pages are served from app/[lang]/... (see src/lib/i18n/routing.ts):
//   /ru/..., /uz/...  → served as-is
//   /en/...           → 308 to the unprefixed URL (English has no prefix)
//   /...              → rewritten to /en/... — or, for a browser whose
//                       visitor picked Russian/Uzbek (artqala_lang cookie),
//                       redirected to that language's URL
// Everything else (API, admin, Next internals, files) is left alone.
function routePublicPage(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  const isPublicPage =
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/monitoring') && // Sentry's error-report tunnel
    !/\.[a-z0-9]+$/i.test(pathname) && // files: robots.txt, sitemap.xml, images, ...
    !/^\/(opengraph-image|twitter-image|icon|apple-icon)(\/|$)/.test(pathname);
  if (!isPublicPage) return null;

  const firstSegment = pathname.split('/')[1];
  if (firstSegment === 'ru' || firstSegment === 'uz') return null;

  if (firstSegment === 'en') {
    const { path } = splitLangPath(pathname);
    return NextResponse.redirect(new URL(`${path}${search}`, request.url), 308);
  }

  const preferred = request.cookies.get(LANG_COOKIE)?.value;
  if (preferred === 'ru' || preferred === 'uz') {
    const target = pathname === '/' ? `/${preferred}` : `/${preferred}${pathname}`;
    return NextResponse.redirect(new URL(`${target}${search}`, request.url), 307);
  }

  const rewritten = request.nextUrl.clone();
  rewritten.pathname = pathname === '/' ? '/en' : `/en${pathname}`;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Broadened from just /admin/* so the legacy-host redirect above applies
  // site-wide (e.g. the homepage) — Next's own static assets are excluded
  // since they never need the domain check or the admin auth check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
