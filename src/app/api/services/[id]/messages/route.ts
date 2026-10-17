import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { addServiceRequestMessage } from '@/lib/threads';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// A service request belongs to the caller if it's linked to their account,
// or the guest contact info they submitted contains the email they're
// currently signed in with — matches the lookup in /api/user/inquiries.
function ownsServiceRequest(sr: { user_id: string | null; guest_contact: string | null }, sessionUserId: string, sessionEmail: string) {
  return sr.user_id === sessionUserId || sr.guest_contact?.toLowerCase().includes(sessionEmail.toLowerCase());
}

// GET /api/services/[id]/messages
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ success: false, error: 'Service request not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && !ownsServiceRequest(serviceRequest, session.id, session.email)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, serviceRequest, messages: serviceRequest.messages });
  } catch (error) {
    console.error('Error fetching service request messages:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/services/[id]/messages
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

    // Ownership is checked here; the thread logic (emails, admin
    // notification) is shared with the Telegram bot (src/lib/threads.ts).
    const owner = await prisma.serviceRequest.findUnique({ where: { id }, select: { user_id: true, guest_contact: true } });
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Service request not found' }, { status: 404 });
    }
    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin && !ownsServiceRequest(owner, session.id, session.email)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Never trust a client-supplied sender — derive it from the verified session.
    const result = await addServiceRequestMessage({ id, sender: isAdmin ? 'ADMIN' : 'CUSTOMER', message, status });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    const { newMessage, updatedSR } = result;

    return NextResponse.json({
      success: true,
      message: newMessage,
      serviceRequest: updatedSR,
    });
  } catch (error) {
    console.error('Error posting service request message:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
