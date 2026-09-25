import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, resetRateLimit, getClientIp } from '@/lib/rateLimit';
import { validateEmail } from '@/lib/validation';
import { checkOtpSendAllowed, issueSignupOtp, recordOtpSend } from '@/lib/otp';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
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

    // Three layers, since a single (ip, email) key alone doesn't stop either
    // half of credential stuffing: an attacker spraying many passwords at
    // ONE account from many IPs (caught by emailKey) or spraying many
    // accounts from ONE IP/botnet node (caught by ipKey). comboKey stays as
    // the tightest, most specific throttle for a repeat offender hitting the
    // same account from the same origin.
    const comboKey = `signin:${ip}:${normalizedEmail}`;
    const ipKey = `signin-ip:${ip}`;
    const emailKey = `signin-email:${normalizedEmail}`;

    const [comboCheck, ipCheck, emailCheck] = await Promise.all([
      checkRateLimit(comboKey, 5, 15 * 60 * 1000),
      checkRateLimit(ipKey, 20, 15 * 60 * 1000),
      checkRateLimit(emailKey, 10, 15 * 60 * 1000),
    ]);
    const failedCheck = [comboCheck, ipCheck, emailCheck].find((c) => !c.allowed);

    if (failedCheck) {
      const minutesLeft = Math.ceil(failedCheck.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Juda ko'p noto'g'ri urinishlar. Xavfsizlik yuzasidan hisob ${minutesLeft} daqiqaga vaqtincha bloklandi.`,
          retryAfterSeconds: failedCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(failedCheck.retryAfterSeconds),
          },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password_hash) {
      await Promise.all([
        recordFailedAttempt(comboKey),
        recordFailedAttempt(ipKey),
        recordFailedAttempt(emailKey),
      ]);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await Promise.all([
        recordFailedAttempt(comboKey),
        recordFailedAttempt(ipKey),
        recordFailedAttempt(emailKey),
      ]);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Correct password but the email was never confirmed: send a fresh code
    // (throttled, so this can't be used to flood someone's inbox) and send
    // the user to /verify-otp instead of signing them in.
    if (!user.email_verified && user.auth_provider === 'EMAIL' && user.role !== 'ADMIN') {
      const sendCheck = await checkOtpSendAllowed(normalizedEmail);
      if (sendCheck.allowed) {
        await recordOtpSend(normalizedEmail);
        const sent = await issueSignupOtp(normalizedEmail, user.name);
        if (!sent.success) console.error('Signin OTP email failed:', sent.error);
      }
      return NextResponse.json(
        {
          success: false,
          needsVerification: true,
          email: normalizedEmail,
          error: 'Email manzilingiz hali tasdiqlanmagan. Pochtangizga yuborilgan kodni kiriting.',
        },
        { status: 403 }
      );
    }

    // Successful login: reset the per-account throttles (but not ipKey — an
    // attacker shouldn't be able to reset their IP-wide spray throttle just
    // by also owning one valid account on that IP).
    await Promise.all([resetRateLimit(comboKey), resetRateLimit(emailKey)]);

    const userSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      country: user.country,
      role: user.role,
      email_verified: user.email_verified,
      must_change_password: user.must_change_password,
    };

    const sessionToken = createSessionToken(userSession);

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      user: userSession,
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
    console.error('Signin error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during sign in' },
      { status: 500 }
    );
  }
}
