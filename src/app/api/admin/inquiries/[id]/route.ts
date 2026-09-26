import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { sendCuratorReplyNotification, sendReviewRequestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const body = await request.json();

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

    // Auto-link user_id if missing
    let effectiveUserId = existingInquiry.user_id;
    if (!effectiveUserId && existingInquiry.guest_email) {
      const u = await prisma.user.findUnique({
        where: { email: existingInquiry.guest_email.toLowerCase() },
      });
      if (u) effectiveUserId = u.id;
    }

    const newStatus = body.status || (body.admin_reply ? 'ANSWERED' : existingInquiry.status);
    const justCompleted = existingInquiry.status !== 'COMPLETED' && newStatus === 'COMPLETED';

    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        status: newStatus,
        ...(justCompleted && { completed_at: new Date(), review_reminder_sent_at: null }),
        admin_reply: body.admin_reply !== undefined ? body.admin_reply : existingInquiry.admin_reply,
        user_id: effectiveUserId,
        final_price:
          body.final_price !== undefined
            ? body.final_price === null || body.final_price === ''
              ? null
              : parseFloat(body.final_price)
            : existingInquiry.final_price,
      },
      include: {
        painting: true,
      },
    });

    // Also record message in inquiryMessage thread if new admin_reply is sent
    if (body.admin_reply && body.admin_reply.trim()) {
      await prisma.inquiryMessage.create({
        data: {
          inquiry_id: id,
          sender: 'ADMIN',
          message: body.admin_reply.trim(),
          is_read: false,
        },
      });

      // Send email notification to customer (TZ 8.11a)
      const recipientEmail = existingInquiry.guest_email || existingInquiry.user?.email;
      if (recipientEmail) {
        const recipientName = existingInquiry.guest_name || existingInquiry.user?.name || 'Valued Collector';
        const paintingTitle = existingInquiry.painting?.title_en || 'Artwork';
        const threadUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account`;

        // Awaited: a Vercel function can be frozen right after responding,
        // dropping an email that was still being sent.
        await sendCuratorReplyNotification(
          recipientEmail,
          recipientName,
          paintingTitle,
          body.admin_reply,
          threadUrl
        ).catch((err) => console.error('Failed to send curator reply email:', err));
      }
    }

    // The sale just went through (status changed *to* COMPLETED, e.g. the
    // painting was marked sold from this inquiry): thank the buyer and ask
    // for a review. Only on that transition, so re-saving never re-sends.
    if (justCompleted) {
      const buyerEmail = existingInquiry.guest_email || existingInquiry.user?.email;
      if (buyerEmail) {
        const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        await sendReviewRequestEmail({
          to: buyerEmail,
          recipientName: existingInquiry.guest_name || existingInquiry.user?.name || '',
          paintingTitle: existingInquiry.painting?.title_en || 'your artwork',
          paintingUrl: `${siteUrl}/gallery/${existingInquiry.painting_id}#reviews`,
          signupUrl: `${siteUrl}/signup`,
        }).catch((err) => console.error('Failed to send review request email:', err));
      }
    }

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error) {
    console.error('Update inquiry error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update inquiry' }, { status: 500 });
  }
}

// Permanently removes the inquiry and its message thread (the messages
// cascade in the schema) — e.g. spam or test submissions.
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    await prisma.inquiry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
