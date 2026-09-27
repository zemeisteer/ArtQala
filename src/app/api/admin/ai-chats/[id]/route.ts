import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Delete one AI-assistant conversation (its messages cascade).
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    await prisma.aiConversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete AI conversation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
