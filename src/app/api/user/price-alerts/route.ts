import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// The signed-in user's "email me when a saved piece gets cheaper" setting.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { price_alerts: true } });
  return NextResponse.json({ success: true, enabled: user?.price_alerts ?? false });
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ success: false, error: 'enabled (boolean) is required' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: session.id }, data: { price_alerts: body.enabled } });
  return NextResponse.json({ success: true, enabled: body.enabled });
}
