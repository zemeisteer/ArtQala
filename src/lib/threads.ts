import { prisma } from './prisma';
import { FROM_EMAIL, escapeHtml, getGalleryReplyTo, sendContactReplyEmail, sendReviewRequestEmail } from './email';
import { notifyAdmin, emailOrNull } from './adminNotify';
import { inquiryItemsInclude, inquiryLines, inquiryTitleEn, inquiryTitleUz } from './inquiryItems';
import { SITE_URL } from './siteUrl';

// Adding a message to an inquiry / service-request thread, and replying to
// a contact-form message: saving it, updating the status, emailing the
// customer (curator replies) or notifying the gallery (customer messages).
// Shared by the site's API routes (which check who the caller is first)
// and the Telegram bot (src/app/api/telegram/webhook), where a curator
// replies to a notification.

type Sender = 'ADMIN' | 'CUSTOMER';

export async function addInquiryMessage({
  id,
  sender,
  message,
  status,
}: {
  id: string;
  sender: Sender;
  message: string;
  status?: string;
}) {
  const existingInquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      painting: true,
      user: { select: { id: true, name: true, email: true } },
      items: inquiryItemsInclude,
    },
  });

  if (!existingInquiry) {
    return { ok: false as const, status: 404, error: 'Inquiry not found' };
  }

  const effectiveSender = sender;
  const isAdmin = sender === 'ADMIN';

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
    const lines = inquiryLines(existingInquiry);
    const paintingTitle = inquiryTitleUz(existingInquiry);
    // "X" kartinasi — or, for a multi-painting inquiry, 3 ta kartina ("X", "Y", "Z").
    const aboutHtml =
      lines.length > 1
        ? `<strong>${lines.length} ta kartina</strong> (${lines.map((l) => `"${escapeHtml(l.title_uz || l.title_en)}"`).join(', ')})`
        : `<strong>"${escapeHtml(lines[0]?.title_uz || lines[0]?.title_en || 'Artwork')}"</strong> kartinasi`;

    if (recipientEmail) {
      const emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #E7E0D8; background-color: #FAF4EC; color: #281C18; border-radius: 4px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala Gallery</h2>
            <p style="font-size: 11px; color: #726861; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Tashkent · Uzbekistan</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #E7E0D8; margin: 20px 0;" />
          <p style="font-size: 15px; margin-bottom: 12px;">Assalomu alaykum, ${escapeHtml(recipientName)},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #554740;">
            Art Qala galereyasi kuratori sizning ${aboutHtml} bo'yicha so'rovingizga javob qoldirdi:
          </p>
          <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 16px 20px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #281C18; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            "${escapeHtml(message.trim())}"
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
            Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
          </p>
        </div>
      `;

      if (process.env.RESEND_API_KEY) {
        try {
          const galleryReplyTo = await getGalleryReplyTo();
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              // Customer's "Reply" goes to the gallery inbox, not no-reply.
              ...(galleryReplyTo && { reply_to: galleryReplyTo }),
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

  // A customer's follow-up in the thread — let the curator know by email
  // instead of relying on someone checking the admin panel.
  if (effectiveSender === 'CUSTOMER') {
    const customerName = existingInquiry.guest_name || existingInquiry.user?.name || 'Mijoz';
    const paintingTitle = inquiryTitleUz(existingInquiry);
    await notifyAdmin({
      heading: "So'rovga yangi xabar",
      summary: `${customerName} so'rov bo'yicha yangi xabar yozdi.`,
      details: [
        ['Kartina', paintingTitle],
        ['Ism', customerName],
        ['Email', existingInquiry.guest_email || existingInquiry.user?.email],
      ],
      message: message.trim(),
      adminPath: '/admin/inquiries',
      ref: { kind: 'inquiry', id, status: updatedInquiry.status },
      subject: `Yangi xabar: ${paintingTitle || "so'rov"} — ${customerName}`,
      customerEmail: emailOrNull(existingInquiry.guest_email || existingInquiry.user?.email),
    });
  }


  return { ok: true as const, newMessage, updatedInquiry };
}

export async function addServiceRequestMessage({
  id,
  sender,
  message,
  status,
}: {
  id: string;
  sender: Sender;
  message: string;
  status?: string;
}) {
  const existingSR = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!existingSR) {
    return { ok: false as const, status: 404, error: 'Service request not found' };
  }

  const effectiveSender = sender;
  const isAdmin = sender === 'ADMIN';
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
          <p style="font-size: 15px; margin-bottom: 12px;">Assalomu alaykum, ${escapeHtml(recipientName)},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #554740;">
            Sizning <strong>${escapeHtml(serviceType)}</strong> xizmati bo'yicha so'rovingizga Art Qala kuratoridan yangi javob keldi:
          </p>
          <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 16px 20px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #281C18; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            "${escapeHtml(message.trim())}"
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 3px; display: inline-block;">
              Suhbatni ko'rish va javob yozish
            </a>
          </div>
          <hr style="border: 0; border-top: 1px solid #E7E0D8; margin: 24px 0 16px 0;" />
          <p style="font-size: 11px; color: #8F8178; text-align: center; margin: 0;">
            Art Qala Gallery & Studio · Barakhon Madrasah, Tashkent · artqala.com
          </p>
        </div>
      `;

      if (process.env.RESEND_API_KEY) {
        try {
          const galleryReplyTo = await getGalleryReplyTo();
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              // Customer's "Reply" goes to the gallery inbox, not no-reply.
              ...(galleryReplyTo && { reply_to: galleryReplyTo }),
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

  // A customer's follow-up in the thread — let the curator know by email.
  if (effectiveSender === 'CUSTOMER') {
    const customerName = existingSR.guest_name || existingSR.user?.name || 'Mijoz';
    await notifyAdmin({
      heading: "Xizmat so'roviga yangi xabar",
      summary: `${customerName} xizmat so'rovi bo'yicha yangi xabar yozdi.`,
      details: [
        ['Xizmat', existingSR.service_type],
        ['Ism', customerName],
        ['Aloqa', existingSR.guest_contact || existingSR.user?.email],
      ],
      message: message.trim(),
      adminPath: '/admin/services',
      ref: { kind: 'service', id, status: updatedSR.status },
      subject: `Yangi xabar: ${existingSR.service_type} — ${customerName}`,
      customerEmail: emailOrNull(existingSR.guest_contact) || emailOrNull(existingSR.user?.email),
    });
  }


  return { ok: true as const, newMessage, updatedSR };
}

// A curator's reply to a contact-form message: saved, marked answered, and
// emailed to the sender.
export async function replyToContactMessage(id: string, reply: string) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, status: 404, error: 'Message not found' };
  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { admin_reply: reply.trim(), status: 'ANSWERED', is_read: true },
  });
  const emailResult = await sendContactReplyEmail(existing.email, existing.name, existing.subject, reply.trim());
  if (!emailResult.success) {
    console.warn('Contact reply saved but email delivery failed:', emailResult.error);
  }
  return { ok: true as const, updated, emailSent: emailResult.success };
}

export const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'ANSWERED', 'COMPLETED'] as const;
export const SERVICE_STATUSES = ['NEW', 'IN_PROGRESS', 'COMPLETED'] as const;

// The sale just went through (an inquiry became COMPLETED): thank the buyer
// and ask for a review. Used by Admin → Inquiries and the Telegram buttons.
export async function sendReviewRequestForInquiry(inquiry: {
  painting_id: string;
  guest_email: string | null;
  guest_name: string | null;
  user?: { name: string; email: string } | null;
  painting?: { title_en?: string | null } | null;
  items?: Parameters<typeof inquiryTitleEn>[0]['items'];
}) {
  const buyerEmail = inquiry.guest_email || inquiry.user?.email;
  if (!buyerEmail) return;
  await sendReviewRequestEmail({
    to: buyerEmail,
    recipientName: inquiry.guest_name || inquiry.user?.name || '',
    paintingTitle: inquiryTitleEn(inquiry as Parameters<typeof inquiryTitleEn>[0]),
    paintingUrl: `${SITE_URL}/gallery/${inquiry.painting_id}#reviews`,
    signupUrl: `${SITE_URL}/signup`,
  }).catch((err) => console.error('Failed to send review request email:', err));
}

// Status change from the Telegram buttons — same side effects as the admin
// panel (COMPLETED stamps completed_at and asks the buyer for a review).
export async function setInquiryStatus(id: string, status: string) {
  if (!(INQUIRY_STATUSES as readonly string[]).includes(status)) return { ok: false as const, error: 'Bad status' };
  const existing = await prisma.inquiry.findUnique({
    where: { id },
    include: { painting: true, user: { select: { name: true, email: true } }, items: inquiryItemsInclude },
  });
  if (!existing) return { ok: false as const, error: 'Inquiry not found' };
  const justCompleted = existing.status !== 'COMPLETED' && status === 'COMPLETED';
  await prisma.inquiry.update({
    where: { id },
    data: { status, ...(justCompleted && { completed_at: new Date(), review_reminder_sent_at: null }) },
  });
  if (justCompleted) await sendReviewRequestForInquiry(existing);
  return { ok: true as const };
}

export async function setServiceRequestStatus(id: string, status: string) {
  if (!(SERVICE_STATUSES as readonly string[]).includes(status)) return { ok: false as const, error: 'Bad status' };
  const updated = await prisma.serviceRequest.updateMany({ where: { id }, data: { status } });
  return updated.count > 0 ? { ok: true as const } : { ok: false as const, error: 'Service request not found' };
}
