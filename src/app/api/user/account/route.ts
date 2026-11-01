import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// DELETE — the signed-in visitor deletes their own account (privacy laws such
// as GDPR give them that right). They retype their email, plus their
// password when the account has one. The wishlist and sign-in sessions go
// with the row (onDelete: Cascade); inquiries, service requests and reviews
// stay as the gallery's records, unlinked from the account (SetNull).
// Admin accounts can't delete themselves here — that is done in Admin → Staff.
export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ success: false, code: 'unauthorized' }, { status: 401 });

  const ip = getClientIp(request);
  const key = `delete-account:${session.id}:${ip}`;
  const limit = await checkRateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, code: 'rate_limited' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, role: true, password_hash: true },
  });
  if (!user) return NextResponse.json({ success: false, code: 'unauthorized' }, { status: 401 });
  if (user.role !== 'USER') return NextResponse.json({ success: false, code: 'staff' }, { status: 403 });

  const emailOk = email === user.email.toLowerCase();
  const passwordOk = !user.password_hash || (password !== '' && (await bcrypt.compare(password, user.password_hash)));
  if (!emailOk || !passwordOk) {
    await recordFailedAttempt(key);
    return NextResponse.json({ success: false, code: emailOk ? 'wrong_password' : 'wrong_email' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.otpVerification.deleteMany({ where: { email: user.email } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  const response = NextResponse.json({ success: true });
  response.cookies.set('artqala_user', '', { httpOnly: true, maxAge: 0, path: '/' });
  return response;
}
