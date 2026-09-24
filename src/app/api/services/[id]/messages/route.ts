import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { FROM_EMAIL } from '@/lib/email';

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

    const existingSR = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingSR) {
      return NextResponse.json({ success: false, error: 'Service request not found' }, { status: 404 });
    }

    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin && !ownsServiceRequest(existingSR, session.id, session.email)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Never trust a client-supplied sender — derive it from the verified session.
    const effectiveSender = isAdmin ? 'ADMIN' : 'CUSTOMER';
    const newStatus = (isAdmin && status) || existingSR.status;

    const [newMessage, updatedSR] = await prisma.$transaction([
      prisma.serviceRequestMessage.create({
        data: {
          service_request_id: id,
          sender: effectiveSender,
          message: message.trim(),
          is_read: false,
        },
      }),
      prisma.serviceRequest.update({
        where: { id },
        data: {
          status: newStatus,
          admin_notes: effectiveSender === 'ADMIN' ? message.trim() : existingSR.admin_notes,
        },
      }),
    ]);

    // If ADMIN sent message and recipient has email
    if (effectiveSender === 'ADMIN') {
      let recipientEmail = existingSR.user?.email;
      if (!recipientEmail && existingSR.guest_contact && existingSR.guest_contact.includes('@')) {
        const match = existingSR.guest_contact.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (match) recipientEmail = match[0];
      }

      const recipientName = existingSR.guest_name || 'Valued Customer';
      const serviceType = existingSR.service_type;

      if (recipientEmail) {
        const emailHtml = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #E7E0D8; background-color: #FAF4EC; color: #281C18; border-radius: 4px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala Gallery</h2>
              <p style="font-size: 11px; color: #726861; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Studio & Commissions · Tashkent</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #E7E0D8; margin: 20px 0;" />
            <p style="font-size: 15px; margin-bottom: 12px;">Assalomu alaykum, ${recipientName},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #554740;">
              Sizning <strong>${serviceType}</strong> xizmati bo'yicha so'rovingizga Art Qala kuratoridan yangi javob keldi:
            </p>
            <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 16px 20px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #281C18; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              "${message.trim()}"
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 3px; display: inline-block;">
                Suhbatni ko'rish va javob yozish
              </a>
            </div>
            <hr style="border: 0; border-top: 1px solid #E7E0D8; margin: 24px 0 16px 0;" />
            <p style="font-size: 11px; color: #8F8178; text-align: center; margin: 0;">
              Art Qala Gallery & Studio · Barakhon Madrasah, Tashkent · info@artqala.com
            </p>
          </div>
        `;

        if (process.env.RESEND_API_KEY) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [recipientEmail],
                subject: `Art Qala — Sizning xizmat so'rovingizga javob keldi (${serviceType})`,
                html: emailHtml,
              }),
            });
            console.log(`[Resend] Service reply email sent to ${recipientEmail}`);
          } catch (mailErr) {
            console.error('[Resend Error]', mailErr);
          }
        } else {
          console.log(`[Resend Mock - No RESEND_API_KEY configured] Service notification simulated for ${recipientEmail}: "${message.trim()}"`);
        }
      }
    }

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
