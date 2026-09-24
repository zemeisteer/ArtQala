import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { validateEmail } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { sendContactAcknowledgmentEmail, sendContactAdminNotification } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimitKey = `contact:${ip}`;
    const rateCheck = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Juda ko'p xabar yuborildi. Iltimos, ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }
    await recordFailedAttempt(rateLimitKey);

    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || null,
        message: message.trim(),
      },
    });

    // Fire-and-forget: let the customer know it went through, and let the
    // gallery's own inbox know a message is waiting — previously the only
    // way to find out was to remember to check /admin/messages.
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    const adminEmail = settings?.email || 'info@artqala.com';
    sendContactAcknowledgmentEmail(contactMessage.email, contactMessage.name).catch((err) =>
      console.error('Failed to send contact acknowledgment email:', err)
    );
    sendContactAdminNotification(
      adminEmail,
      contactMessage.name,
      contactMessage.email,
      contactMessage.subject,
      contactMessage.message
    ).catch((err) => console.error('Failed to send contact admin notification email:', err));

    return NextResponse.json({ success: true, message: contactMessage });
  } catch (error) {
    console.error('Contact message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await prisma.contactMessage.findMany({
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages.' },
      { status: 500 }
    );
  }
}
