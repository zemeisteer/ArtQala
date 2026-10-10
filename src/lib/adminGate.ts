// Optional: hide the admin panel from devices that haven't been let in.
//
// When ADMIN_ACCESS_KEY is set, /admin (login page included) answers 404
// to everyone except
//   - a browser that once opened  /admin/login?key=<ADMIN_ACCESS_KEY>
//     (it gets the `aq_admin_gate` cookie and keeps it), and
//   - an admin who is already signed in.
// Signing in as an admin is refused without that cookie too, so the key is
// a real second lock, not only a hidden URL. Unset = the panel behaves as
// before. Uses Web Crypto so it runs in the Edge middleware and in Node.

export const ADMIN_GATE_COOKIE = 'aq_admin_gate';
export const ADMIN_GATE_MAX_AGE_S = 180 * 24 * 60 * 60;

const SECRET = process.env.NEXTAUTH_SECRET || 'artqala-fallback-secret-2026-tashkent';

export function adminGateEnabled(): boolean {
  return !!process.env.ADMIN_ACCESS_KEY;
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// The cookie holds a keyed hash of the access key, never the key itself;
// changing ADMIN_ACCESS_KEY in Vercel invalidates every device at once.
async function gateCookieValue(): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(`admin-gate:${process.env.ADMIN_ACCESS_KEY}`));
  return Array.from(new Uint8Array(signed), (b) => b.toString(16).padStart(2, '0')).join('');
}

// The cookie value to set if `supplied` is the right key, else null.
export async function gateCookieForKey(supplied: string | null): Promise<string | null> {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected || !supplied || !sameString(supplied, expected)) return null;
  return gateCookieValue();
}

export async function hasAdminGateCookie(cookie: string | undefined | null): Promise<boolean> {
  if (!adminGateEnabled()) return true;
  return !!cookie && sameString(cookie, await gateCookieValue());
}
