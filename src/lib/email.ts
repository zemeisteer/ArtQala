import { OTP_TTL_MINUTES } from './otpConfig';
import { prisma } from './prisma';

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Resend's shared onboarding@resend.dev sender can only deliver to the
// Resend account owner's own address — real customer emails need a sender
// on the verified artqala.com domain, set via RESEND_FROM_EMAIL.
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Art Qala Gallery <onboarding@resend.dev>';
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// User-supplied text (names, messages) must never be interpreted as HTML
// in an email body — e.g. a signup "name" is chosen by whoever fills in the
// form, not by the inbox owner, and would otherwise let anyone put links
// into a mail sent from our domain.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 1. Send OTP Verification Email during signup
export async function sendOtpEmail(
  to: string,
  code: string,
  recipientName?: string
): Promise<EmailSendResult> {
  const name = escapeHtml(recipientName || 'Art Lover');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your Art Qala Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gallery &amp; Studio · Tashkent, Uzbekistan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px;">
                    <h2 style="font-size: 20px; color: #281C18; margin: 0 0 14px 0;">Welcome, ${name}!</h2>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 24px 0;">
                      Thank you for creating an account with Art Qala. To verify your email address and activate your collector account, please enter the following 6-digit confirmation code:
                    </p>
                    
                    <div style="background-color: #FAF4EC; border: 1px dashed #BA4E25; border-radius: 4px; padding: 20px; text-align: center; margin: 24px 0;">
                      <span style="font-family: -apple-system, BlinkMacSystemFont, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #BA4E25;">
                        ${code}
                      </span>
                    </div>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8F8178; line-height: 1.5; margin: 0;">
                      This verification code will expire in <strong>${OTP_TTL_MINUTES} minutes</strong>. If you did not create an account on Art Qala, please ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFE8DE; margin-top: 30px; padding-top: 24px; text-align: center;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9E9086; margin: 0;">
                      Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to,
    subject: `Art Qala — Your Verification Code: ${code}`,
    html,
  });
}

// 2. Send Password Reset Code
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  recipientName?: string
): Promise<EmailSendResult> {
  const name = recipientName || 'Art Lover';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset your Art Qala password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gallery &amp; Studio · Tashkent, Uzbekistan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px;">
                    <h2 style="font-size: 20px; color: #281C18; margin: 0 0 14px 0;">Hello, ${escapeHtml(name)}</h2>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 24px 0;">
                      We received a request to reset the password for your Art Qala account. Enter the following 6-digit code to choose a new password:
                    </p>

                    <div style="background-color: #FAF4EC; border: 1px dashed #BA4E25; border-radius: 4px; padding: 20px; text-align: center; margin: 24px 0;">
                      <span style="font-family: -apple-system, BlinkMacSystemFont, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #BA4E25;">
                        ${code}
                      </span>
                    </div>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8F8178; line-height: 1.5; margin: 0;">
                      This code will expire in <strong>${OTP_TTL_MINUTES} minutes</strong>. If you did not request a password reset, you can safely ignore this email — your password will not be changed.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFE8DE; margin-top: 30px; padding-top: 24px; text-align: center;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9E9086; margin: 0;">
                      Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to,
    subject: `Art Qala — Password Reset Code: ${code}`,
    html,
  });
}

// 3. Send Curator Reply Notification (TZ 8.11a)
export async function sendCuratorReplyNotification(
  to: string,
  recipientName: string,
  subjectTitle: string,
  replyMessage: string,
  threadUrl: string
): Promise<EmailSendResult> {
  const name = recipientName || 'Valued Collector';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New reply from Art Qala curator</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gallery &amp; Studio · Tashkent, Uzbekistan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px;">
                    <h2 style="font-size: 20px; color: #281C18; margin: 0 0 14px 0;">Dear ${escapeHtml(name)},</h2>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 18px 0;">
                      Our gallery curator in Tashkent has replied to your inquiry regarding <strong>"${escapeHtml(subjectTitle)}"</strong>:
                    </p>
                    
                    <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 18px; margin: 20px 0; border-radius: 2px; font-style: italic; font-size: 14px; color: #281C18; line-height: 1.6;">
                      "${escapeHtml(replyMessage)}"
                    </div>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #554740; margin: 24px 0;">
                      You can view your complete message thread, continue the conversation, and reserve the artwork directly from your account:
                    </p>

                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${threadUrl}" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; display: inline-block;">
                        Open Message Thread &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFE8DE; margin-top: 30px; padding-top: 24px; text-align: center;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9E9086; margin: 0;">
                      Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to,
    subject: `Art Qala Gallery — Curator reply regarding "${subjectTitle}"`,
    html,
  });
}

// 4. Acknowledge a contact-form submission — sent immediately on submit, so
// the customer knows their message actually went through and roughly when
// to expect a real reply, before a curator ever looks at it.
export async function sendContactAcknowledgmentEmail(
  to: string,
  recipientName: string
): Promise<EmailSendResult> {
  const name = recipientName || 'Valued Visitor';

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>We received your message</title></head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gallery &amp; Studio · Tashkent, Uzbekistan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px;">
                    <h2 style="font-size: 20px; color: #281C18; margin: 0 0 14px 0;">Thank you, ${escapeHtml(name)}!</h2>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 18px 0;">
                      We've received your message and a member of our curatorial team will get back to you within <strong>1-2 business days</strong>.
                    </p>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8F8178; line-height: 1.5; margin: 0;">
                      This is an automatic confirmation — no need to reply to this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFE8DE; margin-top: 30px; padding-top: 24px; text-align: center;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9E9086; margin: 0;">
                      Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to,
    subject: 'Art Qala — We received your message',
    html,
  });
}

// 5. Notify the gallery's own inbox that a new contact-form message arrived
// — previously nothing told the admin a message existed except manually
// checking /admin/messages.
export async function sendContactAdminNotification(
  adminEmail: string,
  senderName: string,
  senderEmail: string,
  subject: string | null,
  message: string
): Promise<EmailSendResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>New contact message</title></head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala Admin</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">New Contact Message</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 14px 0;">
                      <strong>${escapeHtml(senderName)}</strong> (${escapeHtml(senderEmail)}) sent a message via the contact form:
                    </p>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8F8178; margin: 0 0 4px 0;">
                      Subject: <strong style="color: #281C18;">${subject ? escapeHtml(subject) : '(no subject)'}</strong>
                    </p>
                    <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 16px 18px; margin: 16px 0; font-size: 14px; color: #281C18; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${SITE_URL}/admin/messages" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; display: inline-block;">
                        Open Admin Panel &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to: adminEmail,
    subject: `New contact message from ${senderName}`,
    html,
    replyTo: senderEmail,
  });
}

// 6. Deliver the curator's reply to a contact-form message — replaces a
// `mailto:` link, which only works if the admin's browser/OS happens to
// have a default mail client configured (unreliable for anyone using
// webmail, and silently does nothing otherwise).
export async function sendContactReplyEmail(
  to: string,
  recipientName: string,
  originalSubject: string | null,
  replyMessage: string
): Promise<EmailSendResult> {
  const name = recipientName || 'Valued Visitor';
  const subjectLine = originalSubject || 'your message';

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Reply from Art Qala</title></head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gallery &amp; Studio · Tashkent, Uzbekistan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px;">
                    <h2 style="font-size: 20px; color: #281C18; margin: 0 0 14px 0;">Dear ${escapeHtml(name)},</h2>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 18px 0;">
                      Our gallery curator has replied to ${originalSubject ? `your message about <strong>"${escapeHtml(subjectLine)}"</strong>` : 'your message'}:
                    </p>
                    <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 18px; margin: 20px 0; border-radius: 2px; font-style: italic; font-size: 14px; color: #281C18; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(replyMessage)}</div>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8F8178; line-height: 1.5; margin: 20px 0 0 0;">
                      You can reply directly to this email if you have further questions.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFE8DE; margin-top: 30px; padding-top: 24px; text-align: center;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9E9086; margin: 0;">
                      Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to,
    subject: `Re: ${subjectLine} — Art Qala Gallery`,
    html,
  });
}

// Internal Resend API dispatcher
// 6b. After a sale: thank the buyer and ask for a review. Reviews are only
// accepted from signed-in customers whose account email matches an inquiry
// for that painting, so the mail says which email to sign in with.
export async function sendReviewRequestEmail(params: {
  to: string;
  recipientName: string;
  paintingTitle: string;
  paintingUrl: string;
  signupUrl: string;
}): Promise<EmailSendResult> {
  const name = escapeHtml(params.recipientName || 'Valued Collector');
  const title = escapeHtml(params.paintingTitle);
  const email = escapeHtml(params.to);

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>How do you like your new artwork?</title></head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gallery &amp; Studio · Tashkent, Uzbekistan</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <h2 style="font-family: 'Georgia', serif; font-size: 20px; color: #281C18; margin: 0 0 14px 0;">Thank you, ${name}!</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 14px 0;">
                      We're delighted that <strong>&ldquo;${title}&rdquo;</strong> is now part of your collection.
                      Would you share a few words about the piece and your experience with the gallery?
                      It helps other collectors — and means a lot to the artist.
                    </p>
                    <div style="text-align: center; margin: 26px 0;">
                      <a href="${params.paintingUrl}" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 3px; font-size: 13px; font-weight: 600; display: inline-block;">
                        Leave a review &rarr;
                      </a>
                    </div>
                    <p style="font-size: 13px; line-height: 1.6; color: #8F8178; margin: 0;">
                      To leave a review, sign in with <strong>${email}</strong> — the email you used for your inquiry.
                      No account yet? <a href="${params.signupUrl}" style="color: #BA4E25;">Create one with this email</a> in under a minute.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #EFE8DE; margin-top: 30px; padding-top: 24px; text-align: center;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #9E9086; margin: 0;">
                      Art Qala Gallery · Barakhon Madrasah, Tashkent · artqala.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to: params.to,
    subject: `Art Qala — How do you like "${params.paintingTitle}"?`,
    html,
  });
}

// 7. Notify the gallery's inbox about a new inquiry, service request or a
// customer's follow-up message — until now these only showed up in the
// admin panel. When the customer left an email address, it becomes the
// Reply-To, so pressing "Reply" in the inbox writes straight to them.
export async function sendAdminActivityNotification(params: {
  adminEmail: string;
  heading: string;
  summary: string;
  details: [string, string | null | undefined][];
  message: string;
  adminPath: string;
  subject: string;
  customerEmail?: string | null;
}): Promise<EmailSendResult> {
  const rows = params.details
    .filter(([, value]) => value && String(value).trim())
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 3px 12px 3px 0; color: #8F8178; font-size: 13px; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td><td style="padding: 3px 0; color: #281C18; font-size: 13px;">${escapeHtml(String(value))}</td></tr>`
    )
    .join('');
  const replyHint = params.customerEmail
    ? '<p style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 12px; color: #8F8178; margin: 0;">Bu xatga &laquo;Reply&raquo; (javob berish) bossangiz, javobingiz to&#39;g&#39;ridan-to&#39;g&#39;ri mijozga boradi.</p>'
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>${escapeHtml(params.heading)}</title></head>
      <body style="margin: 0; padding: 0; background-color: #FAF4EC; font-family: 'Georgia', serif; color: #281C18;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF4EC; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background-color: #FDFBF9; border: 1px solid #E7E0D8; border-radius: 4px; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                <tr>
                  <td style="border-bottom: 1px solid #EFE8DE; padding-bottom: 20px;">
                    <h1 style="color: #BA4E25; margin: 0; font-size: 26px; letter-spacing: 1px;">Art Qala Admin</h1>
                    <p style="margin: 4px 0 0 0; color: #726861; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">${escapeHtml(params.heading)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <p style="font-size: 14px; line-height: 1.6; color: #554740; margin: 0 0 14px 0;">${escapeHtml(params.summary)}</p>
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 8px 0;">${rows}</table>
                    <div style="background-color: #FFFFFF; border-left: 4px solid #BA4E25; padding: 16px 18px; margin: 16px 0; font-size: 14px; color: #281C18; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(params.message)}</div>
                    <div style="text-align: center; margin: 28px 0 20px 0;">
                      <a href="${SITE_URL}${params.adminPath}" style="background-color: #BA4E25; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 3px; font-size: 13px; font-weight: 600; display: inline-block;">
                        Admin panelda ochish &rarr;
                      </a>
                    </div>
                    ${replyHint}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    to: params.adminEmail,
    subject: params.subject,
    html,
    replyTo: params.customerEmail || undefined,
  });
}

// The gallery's real inbox (Admin → Settings → Email). Mail goes out from
// FROM_EMAIL, which may be a no-reply address, so customer-facing mail sets
// this as Reply-To — a customer pressing "Reply" reaches the gallery instead
// of a mailbox nobody reads. Null when Settings has no email.
export async function getGalleryReplyTo(): Promise<string | null> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { email: true },
    });
    return settings?.email?.trim() || null;
  } catch {
    return null;
  }
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  // Where the recipient's "Reply" goes — on admin notifications this is the
  // customer, so the curator can answer straight from their inbox.
  replyTo?: string;
}): Promise<EmailSendResult> {
  if (!RESEND_API_KEY) {
    console.warn(
      `[Email Mock - No RESEND_API_KEY configured] Would send email to ${params.to} with subject "${params.subject}"`
    );
    return { success: true, id: 'mock-id' };
  }

  // Explicit Reply-To (admin notifications → the customer) wins; everything
  // else — mail to customers — replies to the gallery's own inbox.
  const replyTo = params.replyTo || (await getGalleryReplyTo());

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(replyTo && { reply_to: replyTo }),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Resend Error]', data);
      return { success: false, error: data.message || 'Resend delivery failed' };
    }

    console.log(`[Resend Email Sent] Successfully sent email to ${params.to}, id: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend Exception]', err);
    return { success: false, error: err.message || 'Network error sending email' };
  }
}
