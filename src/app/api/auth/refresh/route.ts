import { NextResponse } from 'next/server';
import { createSessionToken, getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST — keeps a working admin signed in. Admin tokens expire 12 hours after
// they were issued (ADMIN_SESSION_MAX_AGE_MS); the admin panel calls this
// while it's open (src/app/admin/AdminShell.tsx), which re-issues the token,
// so the 12 hours count from the last activity, not from signing in. Only a
// live sign-in is renewed: one ended in Admin → Xodimlar stays ended.
export async function POST() {
  const session = await getServerSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ ok: false }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('artqala_user', createSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  return response;
}
