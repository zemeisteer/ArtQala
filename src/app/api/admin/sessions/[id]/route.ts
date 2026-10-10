import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { endAdminSession } from '@/lib/adminSessions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Sign one admin sign-in out. It stops working on its very next request.
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    await endAdminSession(id, 'REVOKED');
    return NextResponse.json({ success: true, self: id === auth.user.sid });
  } catch (error) {
    console.error('Revoke admin session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign out session' }, { status: 500 });
  }
}
