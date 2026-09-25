import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueSignupOtp } from '@/lib/otp';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/rateLimit';

// "Resend code" on /verify-otp. Always answers the same way whether or not
// the address has a pending account, so it can't be used to discover which
// emails are registered; the per-address and per-IP throttles keep it from
// being used to flood anyone's inbox.
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const ipKey = `otp-resend-ip:${getClientIp(request)}`;
    const sendKey = `otp-send:${normalizedEmail}`;
    const [ipCheck, sendCheck] = await Promise.all([
      checkRateLimit(ipKey, 10, 15 * 60 * 1000),
      checkRateLimit(sendKey, 3, 15 * 60 * 1000),
    ]);
    const blocked = [ipCheck, sendCheck].find((c) => !c.allowed);
    if (blocked) {
      const minutesLeft = Math.ceil(blocked.retryAfterSeconds / 60);
      return NextResponse.json(
        { success: false, error: `Juda ko'p urinish. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.` },
        { status: 429 }
      );
    }
    await Promise.all([recordFailedAttempt(ipKey), recordFailedAttempt(sendKey)]);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { name: true, email_verified: true, auth_provider: true },
    });
    if (user && !user.email_verified && user.auth_provider === 'EMAIL') {
      const sent = await issueSignupOtp(normalizedEmail, user.name);
      if (!sent.success) {
        console.error('Resend OTP email failed:', sent.error);
        return NextResponse.json(
          { success: false, error: "Kodni yuborib bo'lmadi. Birozdan so'ng qayta urinib ko'ring." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
