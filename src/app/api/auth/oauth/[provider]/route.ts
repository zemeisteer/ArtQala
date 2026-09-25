import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { safeRedirectTarget } from '@/lib/safeRedirect';

// Starting a sign-in as someone else ends whoever was signed in before —
// otherwise, if the provider round-trip fails or is abandoned (e.g. Google
// rejecting the redirect URI), the browser silently stays signed in as the
// previous account, which looks exactly like "logged in with a different
// email and still got into the admin panel".
function withoutPreviousSession(response: NextResponse) {
  response.cookies.set('artqala_user', '', { path: '/', maxAge: 0 });
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await context.params;
    const { searchParams, origin } = new URL(request.url);
    const redirectTarget = safeRedirectTarget(searchParams.get('redirect'));

    const normalizedProvider = (provider || '').toLowerCase();

    if (normalizedProvider !== 'google') {
      return NextResponse.json(
        { success: false, error: 'Unsupported OAuth provider' },
        { status: 400 }
      );
    }

    // Check if real provider credentials exist in environment
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (normalizedProvider === 'google' && googleClientId) {
      // Real Google OAuth 2.0 flow
      const redirectUri = `${origin}/api/auth/oauth/google/callback`;
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', googleClientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'consent');
      googleAuthUrl.searchParams.set('state', redirectTarget);
      return withoutPreviousSession(NextResponse.redirect(googleAuthUrl.toString()));
    }

    // Developer / Demo mode: Instant OAuth Login when credentials are not yet configured in .env.
    // Only ever active outside production, so a missing .env key can never become a live
    // no-password login backdoor once deployed.
    const isProduction: boolean = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error(`OAuth ${normalizedProvider} requested but no credentials are configured.`);
      return NextResponse.redirect(new URL('/signin?error=oauth_not_configured', request.url));
    }

    const mockUsers: Record<string, { email: string; name: string; country: string }> = {
      google: {
        email: 'alexandre.google@artqala.uz',
        name: 'Alexandre Monet',
        country: 'France',
      },
    };

    const mockData = mockUsers[normalizedProvider];

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email: mockData.email },
      update: {
        email_verified: true,
      },
      create: {
        name: mockData.name,
        email: mockData.email,
        password_hash: 'OAUTH_EXTERNAL_LOGIN',
        country: mockData.country,
        role: 'CUSTOMER',
        email_verified: true,
        must_change_password: false,
      },
    });

    const userSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      country: user.country,
      role: user.role,
      email_verified: user.email_verified,
      must_change_password: false,
    };

    const sessionToken = createSessionToken(userSession);

    const redirectUrl = new URL(redirectTarget, request.url);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set('artqala_user', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('OAuth flow error:', err);
    return NextResponse.redirect(new URL(`/signin?error=oauth_failed`, request.url));
  }
}
