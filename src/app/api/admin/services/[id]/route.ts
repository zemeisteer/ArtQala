import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: body.status,
        admin_notes: body.admin_notes,
        final_price:
          body.final_price !== undefined
            ? body.final_price === null || body.final_price === ''
              ? null
              : parseFloat(body.final_price)
            : undefined,
      },
    });

    return NextResponse.json({ success: true, serviceRequest: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update service request' }, { status: 500 });
  }
}

// Permanently removes the service request and its message thread (the messages
// cascade in the schema) — e.g. spam or test submissions.
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    await prisma.serviceRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete service request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
