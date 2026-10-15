import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { inquiryItemsInclude, withInquiryTotals } from '@/lib/inquiryItems';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch inquiries by user_id OR guest_email (case-insensitive)
    const rawInquiries = await prisma.inquiry.findMany({
      where: {
        OR: [
          { user_id: session.id },
          { guest_email: { equals: session.email, mode: 'insensitive' } },
        ],
      },
      include: {
        painting: {
          select: {
            id: true,
            title_en: true,
            title_ru: true,
            title_uz: true,
            price: true,
            discount_price: true,
            images: true,
            artist: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
        },
        items: inquiryItemsInclude,
      },
      orderBy: { created_at: 'desc' },
    });

    // Fetch service requests
    const rawServiceRequests = await prisma.serviceRequest.findMany({
      where: {
        OR: [
          { user_id: session.id },
          { guest_contact: { contains: session.email, mode: 'insensitive' } },
        ],
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Ensure fallback if inquiry has legacy message but 0 messages
    const inquiries = rawInquiries.map((inq) => {
      let thread = inq.messages;
      if (thread.length === 0 && inq.message) {
        thread = [
          {
            id: `legacy-${inq.id}`,
            inquiry_id: inq.id,
            sender: 'CUSTOMER',
            message: inq.message,
            is_read: true,
            created_at: inq.created_at,
          } as any,
        ];
        if (inq.admin_reply) {
          thread.push({
            id: `legacy-reply-${inq.id}`,
            inquiry_id: inq.id,
            sender: 'ADMIN',
            message: inq.admin_reply,
            is_read: true,
            created_at: inq.updated_at,
          } as any);
        }
      }

      const unreadCount = thread.filter((m) => m.sender === 'ADMIN' && !m.is_read).length;

      return {
        ...withInquiryTotals(inq),
        messages: thread,
        unreadCount,
      };
    });

    const serviceRequests = rawServiceRequests.map((sr) => {
      let thread = sr.messages;
      if (thread.length === 0 && sr.description) {
        thread = [
          {
            id: `legacy-${sr.id}`,
            service_request_id: sr.id,
            sender: 'CUSTOMER',
            message: sr.description,
            is_read: true,
            created_at: sr.created_at,
          } as any,
        ];
        if (sr.admin_notes) {
          thread.push({
            id: `legacy-reply-${sr.id}`,
            service_request_id: sr.id,
            sender: 'ADMIN',
            message: sr.admin_notes,
            is_read: true,
            created_at: sr.updated_at,
          } as any);
        }
      }

      const unreadCount = thread.filter((m) => m.sender === 'ADMIN' && !m.is_read).length;

      return {
        ...sr,
        messages: thread,
        unreadCount,
      };
    });

    const totalUnreadCount =
      inquiries.reduce((sum, i) => sum + i.unreadCount, 0) +
      serviceRequests.reduce((sum, s) => sum + s.unreadCount, 0);

    return NextResponse.json({
      success: true,
      inquiries,
      serviceRequests,
      totalUnreadCount,
    });
  } catch (error) {
    console.error('Fetch user inquiries error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
