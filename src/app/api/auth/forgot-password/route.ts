import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { validateEmail } from '@/lib/validation';
import { checkOtpSendAllowed, createOtp, recordOtpSend } from '@/lib/otp';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimitKey = `forgot-password:${ip}`;

    const rateCheck = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Juda ko'p urinish. Iltimos, ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }
    await recordFailedAttempt(rateLimitKey);

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email talab qilinadi' },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Same 5-codes-per-hour cap as signup codes. Checked before looking the
    // account up, so the answer is identical whether or not it exists.
    const sendCheck = await checkOtpSendAllowed(normalizedEmail);
    if (!sendCheck.allowed) {
      return NextResponse.json({ success: false, error: sendCheck.error }, { status: 429 });
    }
    await recordOtpSend(normalizedEmail);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always respond with success regardless of whether the account exists —
    // this prevents attackers from using this endpoint to discover registered emails.
    // Skip accounts with no password (Google-only sign-in has nothing to reset).
    if (user && user.password_hash) {
      // Unguessable (crypto.randomInt), stored only as an HMAC, and replaces
      // any earlier pending reset code — see createOtp().
      const otpCode = await createOtp(normalizedEmail, 'PASSWORD_RESET');

      const emailResult = await sendPasswordResetEmail(normalizedEmail, otpCode, user.name);
      if (!emailResult.success) {
        console.warn('Could not dispatch password reset email, code saved in DB:', emailResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tasdiqlash kodi yuborildi.",
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
