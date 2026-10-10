import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdminSessionActive, startAdminSession } from '@/lib/adminSessions';
import { ADMIN_GATE_COOKIE, hasAdminGateCookie } from '@/lib/adminGate';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  country?: string | null;
  role: string;
  email_verified: boolean;
  must_change_password?: boolean;
  // ADMIN only: the AdminSession row this sign-in belongs to (see
  // src/lib/adminSessions.ts). An admin token without a live one is invalid.
  sid?: string;
}

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  // The fallback below is public (checked into the repo) — running production
  // with it would let anyone forge an admin session token. Fail loudly instead.
  throw new Error(
    'NEXTAUTH_SECRET is not set. Set it in your production environment before deploying (see .env.example).'
  );
}

const SECRET = process.env.NEXTAUTH_SECRET || 'artqala-fallback-secret-2026-tashkent';

// Create a cryptographically signed session token: base64(payload) + "." + hmac_sha256(payload, secret)
export function createSessionToken(user: UserSession): string {
  const payloadStr = JSON.stringify({
    ...user,
    iat: Date.now(),
  });
  const encodedPayload = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

// How long a signed session stays valid, checked against the token's own
// `iat` (the cookie's maxAge alone is only a browser hint — a copied token
// would otherwise work forever). Admin sessions are deliberately short.
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const USER_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isSessionExpired(data: { role?: string; iat?: number }): boolean {
  const maxAge = data.role === 'ADMIN' ? ADMIN_SESSION_MAX_AGE_MS : USER_SESSION_MAX_AGE_MS;
  return typeof data.iat !== 'number' || Date.now() - data.iat > maxAge;
}

// Verify signature and extract session payload
export function verifySessionToken(token: string | undefined | null): UserSession | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;

  // Verify HMAC signature. Compared with a constant-time check (not `!==`)
  // so a forged token's per-byte correctness can't be inferred from response
  // timing — a straightforward string comparison exits at the first
  // mismatched byte, which is exactly the kind of side channel that makes
  // signatures forgeable byte-by-byte over enough requests.
  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null; // Tampered token!
  }

  try {
    const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const data = JSON.parse(payloadStr);
    if (isSessionExpired(data)) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      country: data.country,
      role: data.role,
      email_verified: data.email_verified,
      must_change_password: !!data.must_change_password,
      ...(typeof data.sid === 'string' ? { sid: data.sid } : {}),
    };
  } catch {
    return null;
  }
}

// Read current user session on server. For an ADMIN the signed cookie
// alone isn't enough: its sign-in must still be live in the database, so
// logging out or being signed out by another admin takes effect at once
// (a copied cookie stops working too).
export async function getServerSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('artqala_user')?.value;
  const session = verifySessionToken(token);
  if (session?.role === 'ADMIN' && !(await isAdminSessionActive(session.sid, session.id))) {
    return null;
  }
  return session;
}

// The session payload to sign for a user who has just authenticated: an
// ADMIN gets a new tracked sign-in (sid); everyone else is unchanged.
export async function withAdminSession<T extends { id: string; role: string }>(
  request: Request,
  user: T
): Promise<T & { sid?: string }> {
  if (user.role !== 'ADMIN') return user;

  // Hidden admin panel (src/lib/adminGate.ts): whichever way an admin
  // authenticates — password, Google, a password reset — no admin sign-in
  // is started on a device that wasn't let in with the secret link. Without
  // a `sid` the resulting cookie is not a working admin session.
  const gateCookie = (request.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_GATE_COOKIE}=`))
    ?.slice(ADMIN_GATE_COOKIE.length + 1);
  if (!(await hasAdminGateCookie(gateCookie))) return user;

  return { ...user, sid: await startAdminSession(request, user.id) };
}

// Protect API routes: Ensures requester is authenticated and has role === 'ADMIN'
export async function requireAdmin(): Promise<
  { user: UserSession; errorResponse?: never } | { user?: never; errorResponse: NextResponse }
> {
  const user = await getServerSession();

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (user.role !== 'ADMIN') {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden: Admin privileges required' },
        { status: 403 }
      ),
    };
  }

  return { user };
}
