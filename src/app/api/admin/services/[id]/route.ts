import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseAccessories, sumAccessories } from '@/lib/inquiryItems';

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

    // Admin removes an add-on picked by mistake (any accessory, by id).
    if (body.remove_accessory_id !== undefined) {
      const accessoryId = typeof body.remove_accessory_id === 'string' ? body.remove_accessory_id : '';
      const existing = await prisma.serviceRequest.findUnique({ where: { id }, select: { selected_accessories: true } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Service request not found' }, { status: 404 });
      }
      const before = parseAccessories(existing.selected_accessories);
      const remaining = before.filter((a) => a.id !== accessoryId);
      if (!accessoryId || remaining.length === before.length) {
        return NextResponse.json({ success: false, error: "Bu qo'shimcha so'rovda topilmadi" }, { status: 404 });
      }
      const serviceRequest = await prisma.serviceRequest.update({
        where: { id },
        data: { selected_accessories: remaining.length > 0 ? JSON.stringify(remaining) : null },
      });
      return NextResponse.json({ success: true, serviceRequest, accessories_total: sumAccessories(remaining) });
    }

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
