import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ACTIVE_BOOKING_STATUSES, sessionStates, weekdayOf } from '@/lib/workshops';

export const dynamic = 'force-dynamic';

// GET ?date=YYYY-MM-DD — which sessions of this workshop are still free that
// day (the booking form greys out full ones).
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const date = new URL(request.url).searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ success: false }, { status: 400 });
  const workshop = await prisma.workshop.findFirst({
    where: { id, is_active: true },
    select: { max_people: true, times: true, weekdays: true },
  });
  if (!workshop) return NextResponse.json({ success: false }, { status: 404 });
  const bookings = await prisma.workshopBooking.findMany({
    where: { workshop_id: id, date, status: { in: ACTIVE_BOOKING_STATUSES } },
    select: { time: true, people: true },
  });
  return NextResponse.json(
    {
      success: true,
      runsThatDay: workshop.weekdays.length === 0 || workshop.weekdays.includes(weekdayOf(date)),
      sessions: sessionStates(workshop, bookings),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
