import crypto from 'crypto';
import { prisma } from './prisma';
import { sendOtpEmail, type EmailSendResult } from './email';

export const SIGNUP_OTP_TTL_MS = 15 * 60 * 1000;

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
      expires_at: new Date(Date.now() + SIGNUP_OTP_TTL_MS),
    },
  });

  return sendOtpEmail(email, code, name);
}
