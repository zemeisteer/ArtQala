import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmail, validatePhoneOrTelegram } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { getServerSession } from '@/lib/auth';
import { getSizeBucket } from '@/lib/paintingSize';
import { accessoryIdsFrom, resolveAccessories } from '@/lib/accessoryPricing';
import { inquiryLines } from '@/lib/inquiryItems';
import { notifyAdmin } from '@/lib/adminNotify';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitKey = `inquiry:${ip}`;
    const rateCheck = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Juda ko'p so'rov yuborildi. Iltimos, ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }
    await recordFailedAttempt(rateLimitKey);

    const body = await request.json();
    const { painting_id, guest_name, guest_email, guest_phone, message, selected_accessories } = body;

    if (!painting_id || !guest_name || !guest_email || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(guest_email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    const phoneValidation = validatePhoneOrTelegram(guest_phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.error },
        { status: 400 }
      );
    }

    // Never trust a client-supplied user_id — attach to the verified session
    // if the caller is signed in, otherwise fall back to matching by email.
    const session = await getServerSession();
    let effectiveUserId = session?.id;
    if (!effectiveUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { email: guest_email.trim().toLowerCase() },
      });
      if (existingUser) {
        effectiveUserId = existingUser.id;
      }
    }

    const painting = await prisma.painting.findUnique({
      where: { id: painting_id },
      select: { size: true },
    });
    if (!painting) {
      return NextResponse.json({ success: false, error: 'Painting not found' }, { status: 404 });
    }

    // Re-fetch accessory name/price from the DB rather than trusting the
    // client — only the ids the customer checked are honored, priced for
    // this painting's actual size.
    const accessories = await resolveAccessories(
      accessoryIdsFrom(selected_accessories),
      getSizeBucket(painting.size)
    );
    const accessoriesSnapshot = accessories.length > 0 ? JSON.stringify(accessories) : null;

    const inquiry = await prisma.inquiry.create({
      data: {
        painting_id,
        guest_name: guest_name.trim(),
        guest_email: guest_email.trim().toLowerCase(),
        guest_phone: guest_phone.trim(),
        message: message.trim(),
        user_id: effectiveUserId || null,
        selected_accessories: accessoriesSnapshot,
        status: 'NEW',
        messages: {
          create: {
            sender: 'CUSTOMER',
            message: message.trim(),
            is_read: false,
          },
        },
      },
      include: {
        messages: true,
        painting: { select: { id: true, title_en: true, title_ru: true, title_uz: true, price: true, discount_price: true } },
      },
    });

    const paintingForNotice = inquiry.painting;
    const [line] = inquiryLines(inquiry);
    await notifyAdmin({
      heading: "Yangi so'rov (inquiry)",
      summary: `${inquiry.guest_name} kartina bo'yicha so'rov yubordi.`,
      details: [
        ['Kartina', paintingForNotice?.title_uz || paintingForNotice?.title_en],
        ...accessories.map((a): [string, string] => [a.name_uz, `+$${a.price}`]),
        ['Jami', `$${line.lineTotal}`],
        ['Ism', inquiry.guest_name],
        ['Email', inquiry.guest_email],
        ['Telefon', inquiry.guest_phone],
      ],
      message: inquiry.message ?? '',
      adminPath: '/admin/inquiries',
      subject: `Yangi so'rov: ${paintingForNotice?.title_uz || paintingForNotice?.title_en || 'kartina'} — ${inquiry.guest_name}`,
      customerEmail: inquiry.guest_email,
    });

    return NextResponse.json({ success: true, inquiry });
  } catch (error) {
    console.error('API inquiry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inquiry' },
      { status: 500 }
    );
  }
}
