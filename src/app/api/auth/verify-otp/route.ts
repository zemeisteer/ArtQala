import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';
import { findValidOtp } from '@/lib/otp';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(request);
    const rateLimitKey = `verify-otp:${ip}:${normalizedEmail}`;

    const rateCheck = await checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Try again in ${minutesLeft} minutes.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const record = await findValidOtp(normalizedEmail, 'SIGNUP', String(code));

    if (!record) {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Activate user
    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { email_verified: true },
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

    // Clean up OTP record
    await prisma.otpVerification.delete({
      where: { id: record.id },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Email successfully verified!',
      user: updatedUser,
    });

    // Set signed session cookie (matches signin/oauth) so the user is actually logged in
    const sessionToken = createSessionToken(updatedUser);
    response.cookies.set('artqala_user', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
