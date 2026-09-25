import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmail, validatePhoneOrTelegram } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { getServerSession } from '@/lib/auth';
import { largestSizeBucket, priceForSize } from '@/lib/paintingSize';
import { notifyAdmin } from '@/lib/adminNotify';

const MAX_ITEMS = 20;

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
    const { painting_ids, guest_name, guest_email, guest_phone, message, selected_accessories } = body;

    if (!Array.isArray(painting_ids) || painting_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one painting is required' },
        { status: 400 }
      );
    }

    if (painting_ids.length > MAX_ITEMS) {
      return NextResponse.json(
        { success: false, error: `You can inquire about up to ${MAX_ITEMS} paintings at once` },
        { status: 400 }
      );
    }

    if (!guest_name || !guest_email || !message) {
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

    const normalizedEmail = guest_email.trim().toLowerCase();

    // Never trust a client-supplied user_id — attach to the verified session
    // if the caller is signed in, otherwise fall back to matching by email.
    const session = await getServerSession();
    let effectiveUserId = session?.id;
    if (!effectiveUserId) {
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) effectiveUserId = existingUser.id;
    }

    const validPaintings = await prisma.painting.findMany({
      where: { id: { in: painting_ids } },
      select: { id: true, size: true, title_en: true, title_uz: true },
    });
    const validIds = validPaintings.map((p) => p.id);

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid paintings found' },
        { status: 400 }
      );
    }

    // Re-fetch accessory name/price from the DB rather than trusting the
    // client — only the ids the customer checked are honored. Priced for the
    // largest painting in the batch (matches the client's WishlistInquiryModal).
    let accessoriesSnapshot: string | null = null;
    if (Array.isArray(selected_accessories) && selected_accessories.length > 0) {
      const sizeBucket = largestSizeBucket(validPaintings.map((p) => p.size));
      const accessoryIds = selected_accessories.map((a: { id: string }) => a?.id).filter(Boolean);
      const found = await prisma.accessory.findMany({
        where: { id: { in: accessoryIds }, is_active: true },
        select: { id: true, name_en: true, name_ru: true, name_uz: true, price_small: true, price_medium: true, price_large: true },
      });
      const priced = found.map((a) => ({
        id: a.id,
        name_en: a.name_en,
        name_ru: a.name_ru,
        name_uz: a.name_uz,
        price: priceForSize(a, sizeBucket),
      }));
      if (priced.length > 0) accessoriesSnapshot = JSON.stringify(priced);
    }

    const trimmedMessage = message.trim();
    const inquiries = await prisma.$transaction(
      validIds.map((paintingId) =>
        prisma.inquiry.create({
          data: {
            painting_id: paintingId,
            guest_name: guest_name.trim(),
            guest_email: normalizedEmail,
            guest_phone: guest_phone.trim(),
            message: trimmedMessage,
            user_id: effectiveUserId || null,
            selected_accessories: accessoriesSnapshot,
            status: 'NEW',
            messages: {
              create: {
                sender: 'CUSTOMER',
                message: trimmedMessage,
                is_read: false,
              },
            },
          },
        })
      )
    );

    await notifyAdmin({
      heading: "Yangi so'rov (bir nechta kartina)",
      summary: `${guest_name.trim()} ${inquiries.length} ta kartina bo'yicha so'rov yubordi.`,
      details: [
        ['Kartinalar', validPaintings.map((p) => p.title_uz || p.title_en).join(', ')],
        ['Ism', guest_name.trim()],
        ['Email', normalizedEmail],
        ['Telefon', guest_phone.trim()],
      ],
      message: trimmedMessage,
      adminPath: '/admin/inquiries',
      subject: `Yangi so'rov: ${inquiries.length} ta kartina — ${guest_name.trim()}`,
      customerEmail: normalizedEmail,
    });

    return NextResponse.json({ success: true, count: inquiries.length });
  } catch (error) {
    console.error('Bulk inquiry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inquiries' },
      { status: 500 }
    );
  }
}
