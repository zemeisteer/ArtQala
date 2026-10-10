import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { endAdminSession } from '@/lib/adminSessions';

export async function POST() {
  // An admin's sign-in is tracked in the database: mark it ended, so the
  // cookie that was just dropped can't be reused if someone copied it.
  try {
    const session = verifySessionToken((await cookies()).get('artqala_user')?.value);
    if (session?.sid) await endAdminSession(session.sid, 'LOGOUT');
  } catch (error) {
    console.error('Signout session cleanup error:', error);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.set('artqala_user', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return response;
}
