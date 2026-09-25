import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { findValidOtp } from '@/lib/otp';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Barcha maydonlar to\'ldirilishi shart' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitKey = `reset-password:${ip}:${normalizedEmail}`;

    const rateCheck = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Juda ko'p noto'g'ri urinish. Iltimos, ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error: "Parol kamida 8 ta belgi, 1 ta katta harf va 1 ta raqamdan iborat bo'lishi shart",
        },
        { status: 400 }
      );
    }

    const record = await findValidOtp(normalizedEmail, 'PASSWORD_RESET', String(code));

    if (!record) {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: "Noto'g'ri yoki muddati o'tgan kod" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password_hash: passwordHash, must_change_password: false },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        role: true,
        email_verified: true,
        must_change_password: true,
      },
    });

    // Consume this code and any other pending reset codes for this email
    await prisma.otpVerification.deleteMany({
      where: { email: normalizedEmail, purpose: 'PASSWORD_RESET' },
    });

    const sessionToken = createSessionToken(updatedUser);
    const response = NextResponse.json({
      success: true,
      message: 'Parol muvaffaqiyatli yangilandi',
      user: updatedUser,
    });

    response.cookies.set('artqala_user', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
