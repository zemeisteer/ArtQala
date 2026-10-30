import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { sendWorkshopBookingEmail } from '@/lib/email';
import { BOOKING_STATUSES } from '@/lib/workshops';

export const dynamic = 'force-dynamic';

// PATCH { status?, admin_notes? } — confirming a booking emails the customer.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const before = await prisma.workshopBooking.findUnique({ where: { id }, include: { workshop: true } });
  if (!before) return NextResponse.json({ success: false, error: 'Topilmadi' }, { status: 404 });
  const status = (BOOKING_STATUSES as readonly string[]).includes(body.status) ? (body.status as string) : undefined;
  const booking = await prisma.workshopBooking.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(typeof body.admin_notes === 'string' && { admin_notes: body.admin_notes.slice(0, 1000) }),
    },
  });
  let emailed = false;
  if (status === 'CONFIRMED' && before.status !== 'CONFIRMED') {
    const r = await sendWorkshopBookingEmail({
      to: booking.email,
      name: booking.name,
      workshop: before.workshop.title_en,
      date: booking.date,
      time: booking.time,
      people: booking.people,
      total: before.workshop.price * booking.people,
      confirmed: true,
    }).catch(() => ({ success: false }));
    emailed = r.success;
  }
  return NextResponse.json({ success: true, booking, emailed });
}
