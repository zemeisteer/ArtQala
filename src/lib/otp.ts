import crypto from 'crypto';
import { prisma } from './prisma';
import { sendOtpEmail, type EmailSendResult } from './email';
import { OTP_TTL_MS } from './otpConfig';
import { checkRateLimit, recordFailedAttempt } from './rateLimit';


// Codes are stored only as an HMAC (keyed with the server secret), never in
// the clear: someone who reads the database can't use a pending code to
// verify an account or reset a password. A plain SHA-256 wouldn't do — a
// 6-digit code has only a million possibilities and would be brute-forced
// instantly; without the secret the HMAC can't be.
const OTP_SECRET = process.env.NEXTAUTH_SECRET || 'artqala-fallback-secret-2026-tashkent';

export type OtpPurpose = 'SIGNUP' | 'PASSWORD_RESET';

function hashOtpCode(email: string, purpose: OtpPurpose, code: string): string {
  return crypto.createHmac('sha256', OTP_SECRET).update(`${purpose}:${email}:${code}`).digest('hex');
}

// Creates a fresh code for `email` + `purpose`, replacing any earlier unused
// one (only the newest code in the inbox works), and returns the plain code
// for the caller to email.
export async function createOtp(email: string, purpose: OtpPurpose): Promise<string> {
  const code = crypto.randomInt(100000, 1000000).toString();
  await prisma.otpVerification.deleteMany({ where: { email, purpose } });
  await prisma.otpVerification.create({
    data: {
      email,
      code: hashOtpCode(email, purpose, code),
      purpose,
      expires_at: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return code;
}

// The matching unexpired code record, or null.
export async function findValidOtp(email: string, purpose: OtpPurpose, code: string) {
  const candidates = await prisma.otpVerification.findMany({
    where: { email, purpose, expires_at: { gte: new Date() } },
    orderBy: { created_at: 'desc' },
  });
  const expected = Buffer.from(hashOtpCode(email, purpose, code.trim()));
  return (
    candidates.find((record) => {
      const stored = Buffer.from(record.code);
      return stored.length === expected.length && crypto.timingSafeEqual(stored, expected);
    }) || null
  );
}

// Issues a fresh signup code and emails it. The caller decides what to tell
// the user if sending fails.
export async function issueSignupOtp(email: string, name?: string): Promise<EmailSendResult> {
  const code = await createOtp(email, 'SIGNUP');
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
