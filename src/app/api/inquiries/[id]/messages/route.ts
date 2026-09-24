import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { FROM_EMAIL } from '@/lib/email';

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

    const existingInquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        painting: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingInquiry) {
      return NextResponse.json({ success: false, error: 'Inquiry not found' }, { status: 404 });
    }

    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin && !ownsInquiry(existingInquiry, session.id, session.email)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Never trust a client-supplied sender — derive it from the verified session.
    const effectiveSender = isAdmin ? 'ADMIN' : 'CUSTOMER';

    // Determine new status — only an admin may set an explicit status override.
    const statusOverride = isAdmin ? status : undefined;
    let newStatus = statusOverride || existingInquiry.status;
    if (!statusOverride) {
      if (effectiveSender === 'ADMIN') {
        newStatus = 'ANSWERED';
      } else if (existingInquiry.status === 'ANSWERED' || existingInquiry.status === 'COMPLETED') {
        newStatus = 'IN_PROGRESS';
      }
    }

    // Create the message and update inquiry in transaction
    const [newMessage, updatedInquiry] = await prisma.$transaction([
      prisma.inquiryMessage.create({
        data: {
          inquiry_id: id,
          sender: effectiveSender,
          message: message.trim(),
          is_read: false,
        },
      }),
      prisma.inquiry.update({
        where: { id },
        data: {
          status: newStatus,
          admin_reply: effectiveSender === 'ADMIN' ? message.trim() : existingInquiry.admin_reply,
        },
      }),
    ]);

    // If ADMIN sent the message, dispatch Resend email notification to the customer
    if (effectiveSender === 'ADMIN') {
      const recipientEmail = existingInquiry.guest_email || existingInquiry.user?.email;
      const recipientName = existingInquiry.guest_name || existingInquiry.user?.name || 'Valued Art Lover';
      const paintingTitle = existingInquiry.painting?.title_en || 'Artwork';

      if (recipientEmail) {
        const emailHtml = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #E7E0D8; background-color: #FAF4EC; color: #281C18; border-radius: 4px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala Gallery</h2>
              <p style="font-size: 11px; color: #726861; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Tashkent · Uzbekistan</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #E7E0D8; margin: 20px 0;" />
            <p style="font-size: 15px; margin-bottom: 12px;">Assalomu alaykum, ${recipientName},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #554740;">
              Art Qala galereyasi kuratori sizning <strong>"${paintingTitle}"</strong> kartinasi bo'yicha so'rovingizga javob qoldirdi:
            </p>
            <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 16px 20px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #281C18; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              "${message.trim()}"
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 3px; display: inline-block;">
                Suhbatni ko'rish va javob yozish
              </a>
            </div>
            <p style="font-size: 12px; color: #726861; line-height: 1.5;">
              Siz o'z shaxsiy kabinetingiz orqali kurator bilan chat tarzida to'g'ridan-to'g'ri yozishishda davom etishingiz mumkin.
            </p>
            <hr style="border: 0; border-top: 1px solid #E7E0D8; margin: 24px 0 16px 0;" />
            <p style="font-size: 11px; color: #8F8178; text-align: center; margin: 0;">
              Art Qala Gallery · Barakhon Madrasah, Tashkent · info@artqala.com
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
                subject: `Art Qala — Sizning so'rovingizga javob keldi ("${paintingTitle}")`,
                html: emailHtml,
              }),
            });
            console.log(`[Resend] Reply email successfully sent to ${recipientEmail}`);
          } catch (mailErr) {
            console.error('[Resend Error]', mailErr);
          }
        } else {
          console.log(`[Resend Mock - No RESEND_API_KEY configured] Notification sent to ${recipientEmail}: "${message.trim()}"`);
        }
      }
    }

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
