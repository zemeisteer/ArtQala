import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ADMIN_SESSION_LIFETIME_MS, describeDevice } from '@/lib/adminSessions';

export const dynamic = 'force-dynamic';

// Recent admin sign-ins: who, from which device, where and when.
export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const rows = await prisma.adminSession.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    });

    const now = Date.now();
    const sessions = rows.map((s) => {
      const status = s.ended_at
        ? s.end_reason === 'REVOKED'
          ? 'REVOKED'
          : 'LOGOUT'
        : now - s.created_at.getTime() > ADMIN_SESSION_LIFETIME_MS
        ? 'EXPIRED'
        : 'ACTIVE';
      return {
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        ip: s.ip,
        country: s.country,
        city: s.city,
        ...describeDevice(s.user_agent),
        created_at: s.created_at,
        last_seen_at: s.last_seen_at,
        ended_at: s.ended_at,
        status,
        current: s.id === auth.user.sid,
      };
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('List admin sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load sessions' }, { status: 500 });
  }
}

// Sign out every admin sign-in except the one making this request.
export async function DELETE() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await prisma.adminSession.updateMany({
      where: { ended_at: null, ...(auth.user.sid ? { NOT: { id: auth.user.sid } } : {}) },
      data: { ended_at: new Date(), end_reason: 'REVOKED' },
    });
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Revoke admin sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign out sessions' }, { status: 500 });
  }
}
