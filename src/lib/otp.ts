import crypto from 'crypto';
import { prisma } from './prisma';
import { sendOtpEmail, type EmailSendResult } from './email';
import { OTP_TTL_MS } from './otpConfig';
import { checkRateLimit, recordFailedAttempt } from './rateLimit';


// Issues a fresh 6-digit signup code for `email` (replacing any earlier,
// still-unused one, so only the newest code in the inbox works) and emails
// it. The caller decides what to tell the user if sending fails.
export async function issueSignupOtp(email: string, name?: string): Promise<EmailSendResult> {
  const code = crypto.randomInt(100000, 1000000).toString();

  await prisma.otpVerification.deleteMany({ where: { email, purpose: 'SIGNUP' } });
  await prisma.otpVerification.create({
    data: {
      email,
      code,
      purpose: 'SIGNUP',
      expires_at: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return sendOtpEmail(email, code, name);
}

// At most OTP_SEND_LIMIT codes per address per hour, counted across signup,
// signin-of-unverified-account and "resend" — enough for a typo or a slow
// inbox, but it keeps the form from being used to flood someone's mailbox.
// The hour starts at the first code sent, so after the 5th the address is
// blocked until that hour runs out.
export const OTP_SEND_LIMIT = 5;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;

const sendKey = (email: string) => `otp-send:${email}`;

export async function checkOtpSendAllowed(
  email: string
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const check = await checkRateLimit(sendKey(email), OTP_SEND_LIMIT, OTP_SEND_WINDOW_MS);
  if (check.allowed) return { allowed: true };
  const minutes = Math.ceil(check.retryAfterSeconds / 60);
  const wait = minutes >= 60 ? `${Math.ceil(minutes / 60)} soatdan` : `${minutes} daqiqadan`;
  return {
    allowed: false,
    error: `Kod ${OTP_SEND_LIMIT} marta yuborildi — limit tugadi. ${wait} so'ng qayta urinib ko'ring.`,
  };
}

export async function recordOtpSend(email: string): Promise<void> {
  await recordFailedAttempt(sendKey(email), OTP_SEND_WINDOW_MS);
}
