import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';
import { generateTotpSecret, openSecret, openSetup, sealSecret, sealSetup, totpUri, verifyTotp } from '@/lib/totp';

export const dynamic = 'force-dynamic';

// The signed-in admin's own two-step sign-in (src/lib/totp.ts).
// GET    → { enabled }
// POST   → start turning it on: QR code + the secret to type by hand, and a
//          sealed `setup` token (nothing is saved yet)
// PUT    { setup, code } → turn on, once the app shows the right code
// DELETE { code } → turn off (needs a current code)

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const row = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { totp_secret: true } });
  return NextResponse.json({ success: true, enabled: Boolean(row?.totp_secret) });
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const secret = generateTotpSecret();
  const uri = totpUri(secret, auth.user.email);
  const qr = await QRCode.toString(uri, { type: 'svg', margin: 1 });
  return NextResponse.json({ success: true, secret, qr, setup: sealSetup(auth.user.id, secret) });
}

async function codeLimit(userId: string) {
  const key = `totp-admin:${userId}`;
  return { key, ...(await checkRateLimit(key, 6, 15 * 60 * 1000)) };
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const limit = await codeLimit(auth.user.id);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const secret = typeof body.setup === 'string' ? openSetup(body.setup, auth.user.id) : null;
  if (!secret) return NextResponse.json({ success: false, error: "Sozlash muddati tugadi. Boshidan boshlang." }, { status: 400 });
  if (!verifyTotp(secret, String(body.code || ''))) {
    await recordFailedAttempt(limit.key);
    return NextResponse.json({ success: false, error: "Kod noto'g'ri. Ilovadagi hozirgi kodni kiriting." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: auth.user.id }, data: { totp_secret: sealSecret(secret) } });
  return NextResponse.json({ success: true, enabled: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const limit = await codeLimit(auth.user.id);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const row = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { totp_secret: true } });
  const secret = openSecret(row?.totp_secret);
  if (!secret) return NextResponse.json({ success: true, enabled: false });
  if (!verifyTotp(secret, String(body.code || ''))) {
    await recordFailedAttempt(limit.key);
    return NextResponse.json({ success: false, error: "Kod noto'g'ri. Ilovadagi hozirgi kodni kiriting." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: auth.user.id }, data: { totp_secret: null } });
  return NextResponse.json({ success: true, enabled: false });
}
