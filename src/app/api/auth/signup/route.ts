import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { issueSignupOtp } from '@/lib/otp';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { validateEmail } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const signupKey = `signup:${ip}`;

    const rateCheck = await checkRateLimit(signupKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Juda ko'p ro'yxatdan o'tish urinishlari. Iltimos, ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }
    await recordFailedAttempt(signupKey);

    const { name, email, password, country, agreedToTerms } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Barcha maydonlar to'ldirilishi shart" },
        { status: 400 }
      );
    }

    if (!agreedToTerms) {
      return NextResponse.json(
        { success: false, error: 'Foydalanish shartlari va Maxfiylik siyosatiga rozilik bildirishingiz kerak' },
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

    // Password requirements: min 8 chars, 1 uppercase, 1 number
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Parol kamida 8 ta belgi, 1 ta katta harf va 1 ta raqamdan iborat bo'lishi shart",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // A verified account (or one from Google/Apple/staff) is taken for good.
    // An unverified email signup is someone who never entered their code —
    // let them start over instead of being locked out by "already exists".
    if (existingUser && (existingUser.email_verified || existingUser.auth_provider !== 'EMAIL')) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Per-address throttle on sending codes (shared with signin/resend), so
    // this form can't be used to flood someone else's inbox.
    const sendKey = `otp-send:${normalizedEmail}`;
    const sendCheck = await checkRateLimit(sendKey, 3, 15 * 60 * 1000);
    if (!sendCheck.allowed) {
      const minutesLeft = Math.ceil(sendCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        { success: false, error: `Juda ko'p urinish. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.` },
        { status: 429 }
      );
    }
    await recordFailedAttempt(sendKey);

    const passwordHash = await bcrypt.hash(password, 10);
    const accountData = {
      name,
      password_hash: passwordHash,
      country: country || null,
    };

    // The account stays inactive (email_verified: false — signin refuses it)
    // until the 6-digit code emailed below is confirmed at /verify-otp.
    if (existingUser) {
      await prisma.user.update({ where: { id: existingUser.id }, data: accountData });
    } else {
      await prisma.user.create({
        data: {
          ...accountData,
          email: normalizedEmail,
          role: 'USER',
          email_verified: false,
          auth_provider: 'EMAIL',
        },
      });
    }

    const sent = await issueSignupOtp(normalizedEmail, name);
    if (!sent.success) {
      console.error('Signup OTP email failed:', sent.error);
      return NextResponse.json(
        {
          success: false,
          error: "Tasdiqlash kodini yuborib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      needsVerification: true,
      email: normalizedEmail,
      message: 'Account created. Please verify with the 6-digit code sent to your email.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during signup' },
      { status: 500 }
    );
  }
}
