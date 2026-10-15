import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { getServerSession } from '@/lib/auth';
import { validateEmail, validatePhoneOrTelegram } from '@/lib/validation';
import { notifyAdmin, emailOrNull } from '@/lib/adminNotify';
import { accessoryIdsFrom, resolveAccessories } from '@/lib/accessoryPricing';

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
    const { guest_name, guest_email, guest_phone, service_type, description, selected_accessories } = body;

    if (!guest_name || !guest_email || !guest_phone || !service_type || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(guest_email);
    if (!emailValidation.isValid) {
      return NextResponse.json({ success: false, error: emailValidation.error }, { status: 400 });
    }
    const phoneValidation = validatePhoneOrTelegram(guest_phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ success: false, error: phoneValidation.error }, { status: 400 });
    }
    // Stored in the single guest_contact column as "email · phone" — the
    // admin panel shows it as-is, and extractEmail() (src/lib/adminNotify.ts)
    // pulls the address back out for reply emails.
    const guest_contact = `${String(guest_email).trim().toLowerCase()} · ${String(guest_phone).trim()}`;

    // Never trust a client-supplied user_id — attach to the verified session
    // if the caller is signed in, otherwise it stays a guest request.
    const session = await getServerSession();

    // Re-fetch accessory name/price from the DB rather than trusting the
    // client — only the ids the customer checked are honored. A service
    // request has no painting size yet, so it's priced at the small/base tier.
    // Only accessories configured for this service type (or for everything).
    const priced = await resolveAccessories(accessoryIdsFrom(selected_accessories), null, [String(service_type)]);
    const accessoriesSnapshot = priced.length > 0 ? JSON.stringify(priced) : null;

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
