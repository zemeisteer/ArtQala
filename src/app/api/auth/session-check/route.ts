import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Asked by src/middleware.ts before it serves an admin page: is this
// cookie's admin sign-in still live? (The middleware runs on the Edge
// runtime and can't query the database itself.)
export async function GET() {
  try {
    const session = await getServerSession();
    return NextResponse.json({ ok: session?.role === 'ADMIN' });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ ok: false });
  }
}
