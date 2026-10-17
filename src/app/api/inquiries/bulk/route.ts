import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmail, validatePhoneOrTelegram } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { getServerSession } from '@/lib/auth';
import { getSizeBucket, largestSizeBucket } from '@/lib/paintingSize';
import { applyDiscountRules, getActiveDiscountRules } from '@/lib/discounts';
import { accessoryIdsFrom, paintingAccessoryTargets, resolveAccessories } from '@/lib/accessoryPricing';
import { inquiryItemsInclude, inquiryLines, inquiryTotal } from '@/lib/inquiryItems';
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
    const { guest_name, guest_email, guest_phone, message } = body;

    // New clients send items: [{painting_id, accessory_ids}] — accessories
    // chosen per painting. Older cached clients send painting_ids plus one
    // shared selected_accessories list for the whole batch.
    const requested: { painting_id: string; accessory_ids: string[] }[] = Array.isArray(body.items)
      ? body.items
          .filter((it: unknown) => typeof (it as { painting_id?: unknown })?.painting_id === 'string')
          .map((it: { painting_id: string; accessory_ids?: unknown }) => ({
            painting_id: it.painting_id,
            accessory_ids: accessoryIdsFrom(it.accessory_ids),
          }))
      : Array.isArray(body.painting_ids)
      ? body.painting_ids
          .filter((id: unknown): id is string => typeof id === 'string')
          .map((id: string) => ({ painting_id: id, accessory_ids: [] }))
      : [];
    const sharedAccessoryIds = Array.isArray(body.items) ? [] : accessoryIdsFrom(body.selected_accessories);

    // De-duplicate, keeping the customer's order.
    const seen = new Set<string>();
    const wanted = requested.filter((r) => (seen.has(r.painting_id) ? false : (seen.add(r.painting_id), true)));

    if (wanted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one painting is required' },
        { status: 400 }
      );
    }

    if (wanted.length > MAX_ITEMS) {
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

    const [found, rules] = await Promise.all([
      prisma.painting.findMany({
        where: { id: { in: wanted.map((w) => w.painting_id) } },
        select: {
          id: true,
          size: true,
          title_en: true,
          title_ru: true,
          title_uz: true,
          price: true,
          discount_price: true,
          discount_starts_at: true,
          discount_ends_at: true,
          artist_id: true,
          category_id: true,
          category: { select: { slug: true, parent_id: true, parent: { select: { slug: true } } } },
        },
      }),
      getActiveDiscountRules(),
    ]);
    // The price the visitor actually saw (own discount or matching rule).
    const byId = new Map(applyDiscountRules(found, rules).map((p) => [p.id, p]));
    const lines = wanted.filter((w) => byId.has(w.painting_id));

    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid paintings found' },
        { status: 400 }
      );
    }

    // Accessories per painting, priced for THAT painting's size. Shared
    // (legacy) add-ons are priced for the largest painting in the batch —
    // undercharging a big canvas is worse than overcharging a small one.
    const items = await Promise.all(
      lines.map(async (line, index) => {
        const p = byId.get(line.painting_id)!;
        const accessories = await resolveAccessories(
          line.accessory_ids,
          getSizeBucket(p.size),
          paintingAccessoryTargets(p.category)
        );
        return {
          painting_id: p.id,
          title_en: p.title_en,
          title_ru: p.title_ru,
          title_uz: p.title_uz,
          price: p.discount_price || p.price,
          selected_accessories: accessories.length > 0 ? JSON.stringify(accessories) : null,
          position: index,
          accessories,
        };
      })
    );
    // Shared add-ons must fit at least one painting in the batch.
    const shared = await resolveAccessories(
      sharedAccessoryIds,
      largestSizeBucket(items.map((it) => byId.get(it.painting_id)!.size)),
      Array.from(new Set(items.flatMap((it) => paintingAccessoryTargets(byId.get(it.painting_id)!.category))))
    );

    const trimmedMessage = message.trim();
    const first = items[0];
    // A single painting is stored exactly like a regular single inquiry.
    const isGrouped = items.length > 1;
    const singleAccessories = [...first.accessories, ...shared];

    const inquiry = await prisma.inquiry.create({
      data: {
        painting_id: first.painting_id,
        guest_name: guest_name.trim(),
        guest_email: normalizedEmail,
        guest_phone: guest_phone.trim(),
        message: trimmedMessage,
        user_id: effectiveUserId || null,
        selected_accessories: isGrouped
          ? shared.length > 0
            ? JSON.stringify(shared)
            : null
          : singleAccessories.length > 0
          ? JSON.stringify(singleAccessories)
          : null,
        status: 'NEW',
        messages: {
          create: {
            sender: 'CUSTOMER',
            message: trimmedMessage,
            is_read: false,
          },
        },
        ...(isGrouped && {
          items: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            create: items.map(({ accessories, ...item }) => item),
          },
        }),
      },
      include: {
        painting: { select: { id: true, title_en: true, title_ru: true, title_uz: true, price: true, discount_price: true } },
        items: inquiryItemsInclude,
      },
    });

    const total = inquiryTotal(inquiry);
    const lineRows: [string, string][] = inquiryLines(inquiry).map((l, i) => [
      `${i + 1}. ${l.title_uz || l.title_en}`,
      [`$${l.price}`, ...l.accessories.map((a) => `${a.name_uz} +$${a.price}`)].join(' · ') +
        (l.accessories.length > 0 ? ` = $${l.lineTotal}` : ''),
    ]);
    const sharedRow: [string, string][] = isGrouped && shared.length > 0
      ? [["Umumiy qo'shimchalar", shared.map((a) => `${a.name_uz} +$${a.price}`).join(' · ')]]
      : [];

    await notifyAdmin({
      heading: isGrouped ? "Yangi so'rov (bir nechta kartina)" : "Yangi so'rov (inquiry)",
      summary: isGrouped
        ? `${guest_name.trim()} ${items.length} ta kartina bo'yicha bitta so'rov yubordi.`
        : `${guest_name.trim()} kartina bo'yicha so'rov yubordi.`,
      details: [
        ...lineRows,
        ...sharedRow,
        ['Jami', `$${total}`],
        ['Ism', guest_name.trim()],
        ['Email', normalizedEmail],
        ['Telefon', guest_phone.trim()],
      ],
      message: trimmedMessage,
      adminPath: '/admin/inquiries',
      ref: { kind: 'inquiry', id: inquiry.id, status: 'NEW' },
      subject: `Yangi so'rov: ${isGrouped ? `${items.length} ta kartina` : first.title_uz || first.title_en} — ${guest_name.trim()}`,
      customerEmail: normalizedEmail,
    });

    return NextResponse.json({ success: true, id: inquiry.id, count: items.length, total });
  } catch (error) {
    console.error('Bulk inquiry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inquiries' },
      { status: 500 }
    );
  }
}
