import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { notifyAdmin } from '@/lib/adminNotify';
import { checkRateLimit, getClientIp, recordFailedAttempt } from '@/lib/rateLimit';
import { HONEYPOT_FIELD, checkFormToken, hasLink } from '@/lib/reviewGuard';
import { WORKSHOP_SERVICE_TYPE } from '@/lib/workshops';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/workshops/book — a masterclass booking request. Stored as a
// ServiceRequest (type WORKSHOP), so it shows in Admin → Service Requests
// with the same Telegram buttons and reply thread.
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
  const phone = str(body.phone, 40);
  const note = str(body.note, 1000);
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return fail('invalid');
  if (time && !/^\d{2}:\d{2}$/.test(time)) return fail('invalid');
  if (!(people >= 1 && people <= (workshop.max_people || 50))) return fail('invalid');
  if (!name || !EMAIL_RE.test(email)) return fail('invalid');
  if (hasLink(note)) return fail('links');

  const rateKey = `workshop:${getClientIp(request)}`;
  if (!(await checkRateLimit(rateKey, 5, 60 * 60 * 1000)).allowed) return fail('rate_limited', 429);
  await recordFailedAttempt(rateKey, 60 * 60 * 1000);

  const total = workshop.price * people;
  const description = [
    `Master-klass: ${workshop.title_uz}`,
    `Sana: ${date}${time ? `, ${time}` : ''}`,
    `Kishilar: ${people}`,
    `Narx: $${workshop.price} × ${people} = $${total}`,
    ...(note ? ['', note] : []),
  ].join('\n');

  try {
    const session = await getServerSession();
    const req = await prisma.serviceRequest.create({
      data: {
        guest_name: name,
        guest_contact: phone ? `${email} · ${phone}` : email,
        service_type: WORKSHOP_SERVICE_TYPE,
        description,
        user_id: session?.id || null,
        status: 'NEW',
        messages: { create: { sender: 'CUSTOMER', message: description, is_read: false } },
      },
    });
    await notifyAdmin({
      heading: 'Master-klassga yozilish',
      summary: `${name} "${workshop.title_uz}" ga yozilmoqchi: ${date}${time ? ` ${time}` : ''}, ${people} kishi.`,
      details: [
        ['Master-klass', workshop.title_uz],
        ['Sana', `${date}${time ? `, ${time}` : ''}`],
        ['Kishilar', String(people)],
        ['Jami', `$${total}`],
        ['Ism', name],
        ['Aloqa', phone ? `${email} · ${phone}` : email],
      ],
      message: note,
      adminPath: '/admin/services',
      ref: { kind: 'service', id: req.id, status: req.status },
      subject: `Master-klass: ${workshop.title_uz} — ${name}, ${date}`,
      customerEmail: email,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workshop booking failed:', error);
    return fail('server', 500);
  }
}
