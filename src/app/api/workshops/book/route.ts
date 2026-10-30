import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmin } from '@/lib/adminNotify';
import { sendWorkshopBookingEmail } from '@/lib/email';
import { checkRateLimit, getClientIp, recordFailedAttempt } from '@/lib/rateLimit';
import { HONEYPOT_FIELD, checkFormToken, hasLink } from '@/lib/reviewGuard';
import { validatePhoneOrTelegram } from '@/lib/validation';
import { ACTIVE_BOOKING_STATUSES, fits, isTime, weekdayOf } from '@/lib/workshops';
import { isLang } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/workshops/book — a masterclass booking (WorkshopBooking). The
// session's seats are checked and taken in one serializable transaction, so
// two people booking the last seats at the same moment can't both get them.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const fail = (code: string, status = 400) => NextResponse.json({ success: false, code }, { status });

  if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD].trim()) return NextResponse.json({ success: true });
  const token = checkFormToken(body.form_token);
  if (token !== 'ok') return fail(token === 'too-fast' ? 'too_fast' : 'expired');

  const workshop = await prisma.workshop.findFirst({ where: { id: str(body.workshop_id, 60), is_active: true } });
  if (!workshop) return fail('invalid', 404);

  const date = str(body.date, 10);
  const time = str(body.time, 5);
  const people = Math.round(Number(body.people));
  const name = str(body.name, 80);
  const email = str(body.email, 120).toLowerCase();
  const phone = str(body.phone, 60);
  const note = str(body.note, 1000);
  const lang = isLang(body.lang) ? body.lang : 'en';
  const today = new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return fail('date');
  if (workshop.weekdays.length && !workshop.weekdays.includes(weekdayOf(date))) return fail('date');
  if (!isTime(time) || (workshop.times.length && !workshop.times.includes(time))) return fail('time');
  if (!(people >= 1 && people <= (workshop.max_people || 50))) return fail('invalid');
  if (!name || !EMAIL_RE.test(email)) return fail('invalid');
  if (!validatePhoneOrTelegram(phone).isValid) return fail('phone');
  if (hasLink(note)) return fail('links');

  const rateKey = `workshop:${getClientIp(request)}`;
  if (!(await checkRateLimit(rateKey, 5, 60 * 60 * 1000)).allowed) return fail('rate_limited', 429);

  let booking;
  try {
    booking = await prisma.$transaction(
      async (tx) => {
        const taken = await tx.workshopBooking.aggregate({
          where: { workshop_id: workshop.id, date, time, status: { in: ACTIVE_BOOKING_STATUSES } },
          _sum: { people: true },
        });
        if (!fits(workshop.max_people, taken._sum.people || 0, people)) return null;
        return tx.workshopBooking.create({
          data: { workshop_id: workshop.id, date, time, people, name, email, phone, note: note || null, lang },
        });
      },
      { isolationLevel: 'Serializable' }
    );
  } catch (error) {
    // A concurrent booking for the same session won the race.
    if ((error as { code?: string })?.code === 'P2034') return fail('full', 409);
    console.error('Workshop booking failed:', error);
    return fail('server', 500);
  }
  if (!booking) return fail('full', 409);
  await recordFailedAttempt(rateKey, 60 * 60 * 1000);

  const total = workshop.price * people;
  await Promise.all([
    sendWorkshopBookingEmail({
      to: email,
      name,
      workshop: workshop.title_en,
      date,
      time,
      people,
      total,
      confirmed: false,
    }).catch((error) => console.error('Booking email failed:', error)),
    notifyAdmin({
      heading: 'Master-klassga yangi bron',
      summary: `${name} "${workshop.title_uz}" ga yozildi: ${date}, ${time}, ${people} kishi. Tasdiqlash uchun admin paneldagi Master-klasslar → Bronlar bo'limini oching.`,
      details: [
        ['Master-klass', workshop.title_uz],
        ['Sana va vaqt', `${date}, ${time}`],
        ['Kishilar', String(people)],
        ['Jami', `$${total}`],
        ['Ism', name],
        ['Email', email],
        ['Telefon', phone],
      ],
      message: note,
      adminPath: `/admin/workshops?open=${booking.id}`,
      subject: `Master-klass bron: ${workshop.title_uz} — ${date} ${time}, ${people} kishi`,
      customerEmail: email,
    }),
  ]);
  return NextResponse.json({ success: true });
}
