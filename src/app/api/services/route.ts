import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { getServerSession } from '@/lib/auth';
import { notifyAdmin, emailOrNull } from '@/lib/adminNotify';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitKey = `service:${ip}`;
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
    const { guest_name, guest_contact, service_type, description, selected_accessories } = body;

    if (!guest_name || !guest_contact || !service_type || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Never trust a client-supplied user_id — attach to the verified session
    // if the caller is signed in, otherwise it stays a guest request.
    const session = await getServerSession();

    // Re-fetch accessory name/price from the DB rather than trusting the
    // client — only the ids the customer checked are honored. A service
    // request has no painting size yet, so it's priced at the small/base tier.
    let accessoriesSnapshot: string | null = null;
    if (Array.isArray(selected_accessories) && selected_accessories.length > 0) {
      const ids = selected_accessories.map((a: { id: string }) => a?.id).filter(Boolean);
      const found = await prisma.accessory.findMany({
        where: { id: { in: ids }, is_active: true },
        select: { id: true, name_en: true, name_ru: true, name_uz: true, price_small: true },
      });
      const priced = found.map((a) => ({
        id: a.id,
        name_en: a.name_en,
        name_ru: a.name_ru,
        name_uz: a.name_uz,
        price: a.price_small,
      }));
      if (priced.length > 0) accessoriesSnapshot = JSON.stringify(priced);
    }

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        guest_name,
        guest_contact,
        service_type,
        description,
        user_id: session?.id || null,
        selected_accessories: accessoriesSnapshot,
        status: 'NEW',
        messages: {
          create: {
            sender: 'CUSTOMER',
            message: description.trim(),
            is_read: false,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    await notifyAdmin({
      heading: "Yangi xizmat so'rovi",
      summary: `${serviceRequest.guest_name} xizmat so'rovi yubordi.`,
      details: [
        ['Xizmat', serviceRequest.service_type],
        ['Ism', serviceRequest.guest_name],
        ['Aloqa', serviceRequest.guest_contact],
      ],
      message: serviceRequest.description ?? '',
      adminPath: '/admin/services',
      subject: `Yangi xizmat so'rovi: ${serviceRequest.service_type} — ${serviceRequest.guest_name}`,
      customerEmail: emailOrNull(serviceRequest.guest_contact) || session?.email || null,
    });

    return NextResponse.json({ success: true, serviceRequest });
  } catch (error) {
    console.error('API service request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create service request' },
      { status: 500 }
    );
  }
}
