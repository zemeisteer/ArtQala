import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { addInquiryMessage } from '@/lib/threads';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// An inquiry belongs to the caller if it's linked to their account, or was
// submitted as a guest under the email they're currently signed in with —
// matches the lookup in /api/user/inquiries.
function ownsInquiry(inquiry: { user_id: string | null; guest_email: string | null }, sessionUserId: string, sessionEmail: string) {
  return inquiry.user_id === sessionUserId || inquiry.guest_email?.toLowerCase() === sessionEmail.toLowerCase();
}

// GET /api/inquiries/[id]/messages
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        painting: {
          select: {
            id: true,
            title_en: true,
            title_ru: true,
            title_uz: true,
            price: true,
            images: true,
            artist: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && !ownsInquiry(inquiry, session.id, session.email)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, inquiry, messages: inquiry.messages });
  } catch (error) {
    console.error('Error fetching inquiry messages:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/inquiries/[id]/messages
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { message, status } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
    }

    // Ownership is checked here; the thread logic itself (status, emails,
    // admin notification) is shared with the Telegram bot (src/lib/threads.ts).
    const owner = await prisma.inquiry.findUnique({ where: { id }, select: { user_id: true, guest_email: true } });
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }
    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin && !ownsInquiry(owner, session.id, session.email)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Never trust a client-supplied sender — derive it from the verified session.
    const result = await addInquiryMessage({ id, sender: isAdmin ? 'ADMIN' : 'CUSTOMER', message, status });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    const { newMessage, updatedInquiry } = result;

    return NextResponse.json({
      success: true,
      message: newMessage,
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error('Error posting inquiry message:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
