import crypto from 'crypto';

// Two-step sign-in for admins: the 6-digit codes of Google Authenticator,
// Microsoft Authenticator, 1Password… (TOTP, RFC 6238: HMAC-SHA1, 30 s
// steps). Dependency-free. The shared secret is stored in User.totp_secret
// encrypted (AES-256-GCM, key derived from NEXTAUTH_SECRET), so a copy of
// the database alone can't produce codes.
//
// Locked out (phone lost)? Clear it in the database:
//   UPDATE "User" SET "totp_secret" = NULL WHERE "email" = '…';

const STEP_S = 30;
const DIGITS = 6;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const KEY = crypto
  .createHash('sha256')
  .update(`totp-v1:${process.env.NEXTAUTH_SECRET || 'artqala-fallback-secret-2026-tashkent'}`)
  .digest();

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function codeAt(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const n = (h.readUInt32BE(off) & 0x7fffffff) % 10 ** DIGITS;
  return String(n).padStart(DIGITS, '0');
}

// Accepts the current code and the ones just before/after it (phone clocks
// drift a little).
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const c = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const counter = Math.floor(now / 1000 / STEP_S);
  return [-1, 0, 1].some((d) =>
    crypto.timingSafeEqual(Buffer.from(codeAt(secret, counter + d)), Buffer.from(c))
  );
}

export function totpUri(secret: string, email: string): string {
  const label = encodeURIComponent(`Art Qala:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('Art Qala')}&digits=${DIGITS}&period=${STEP_S}`;
}

export function sealSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `v1.${Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url')}`;
}

export function openSecret(sealed: string | null | undefined): string | null {
  if (!sealed?.startsWith('v1.')) return null;
  try {
    const raw = Buffer.from(sealed.slice(3), 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// While an admin is turning 2FA on, the new secret travels to the browser and
// back sealed together with their id and a 10-minute expiry — nothing is
// saved until they prove their app shows the right code.
export function sealSetup(userId: string, secret: string): string {
  return sealSecret(JSON.stringify({ u: userId, s: secret, e: Date.now() + 10 * 60 * 1000 }));
}

export function openSetup(token: string, userId: string): string | null {
  try {
    const p = JSON.parse(openSecret(token) || 'null');
    return p && p.u === userId && p.e > Date.now() && typeof p.s === 'string' ? p.s : null;
  } catch {
    return null;
  }
}
