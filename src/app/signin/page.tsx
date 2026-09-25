'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { validateEmail } from '@/lib/validation';

export default function SignInPage() {
  const router = useRouter();
  const { refreshUser, t } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthErrorCode, setOauthErrorCode] = useState<string | null>(null);

  useEffect(() => {
    setOauthErrorCode(new URLSearchParams(window.location.search).get('error'));
  }, []);

  // Translated at render time (not inside the effect) so it stays correct
  // even if the saved language finishes loading after this effect already ran.
  const oauthErrorMessage =
    oauthErrorCode === 'oauth_cancelled'
      ? t.auth.oauthCancelled
      : oauthErrorCode === 'oauth_not_configured'
      ? t.auth.oauthNotConfigured
      : oauthErrorCode === 'oauth_failed'
      ? t.auth.oauthFailed
      : null;

  const displayError = error || oauthErrorMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error || t.auth.invalidEmail);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.needsVerification) {
        router.push(`/verify-otp?email=${encodeURIComponent(data.email || email)}`);
        return;
      }
      if (!data.success) {
        setError(data.error || t.auth.signInFailed);
        return;
      }

      await refreshUser();
      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/account');
      }
    } catch (err) {
      setError(t.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 sm:py-20 px-6 flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-md bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-8 sm:p-10 shadow-md">
        {/* Brand header */}
        <div className="text-center space-y-2 mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="Art Qala"
              width={140}
              height={46}
              className="h-10 w-auto mx-auto object-contain"
            />
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[#281C18]">
            {t.auth.signInTitle}
          </h1>
          <p className="text-xs text-[#726861]">
            {t.auth.signInSubtitle}
          </p>
        </div>

        {displayError && (
          <div className="mb-6 p-3.5 bg-[#FFEBEE] border border-[#FFCDD2] rounded-[3px] text-xs text-[#C62828] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.emailLabel}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E7E0D8] rounded-[3px] text-sm text-[#281C18] focus:outline-none focus:border-[#BA4E25]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                {t.auth.passwordLabel}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#BA4E25] hover:underline"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E7E0D8] rounded-[3px] text-sm text-[#281C18] focus:outline-none focus:border-[#BA4E25]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? t.auth.signingIn : t.auth.signInBtn}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E7E0D8]" />
          </div>
          <span className="relative bg-[#FDFBF9] px-3 text-[11px] text-[#9E9086] uppercase font-semibold">
            {t.auth.orContinueWith}
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/api/auth/oauth/google"
            className="flex items-center justify-center gap-2 py-2.5 px-3 border border-[#E7E0D8] bg-white rounded-[3px] text-xs font-semibold text-[#4D3F38] hover:bg-[#F9F6F0] transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google</span>
          </a>

          <a
            href="/api/auth/oauth/apple"
            className="flex items-center justify-center gap-2 py-2.5 px-3 border border-[#E7E0D8] bg-white rounded-[3px] text-xs font-semibold text-[#4D3F38] hover:bg-[#F9F6F0] transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.79 1.43-.59.68-1.1 1.83-.96 2.95 1.07.08 2.1-.46 2.76-1.28z" />
            </svg>
            <span>Apple</span>
          </a>
        </div>

        {/* Switch to sign up */}
        <p className="text-center text-xs text-[#726861] mt-8">
          {t.auth.noAccountYet}{' '}
          <Link
            href="/signup"
            className="font-bold text-[#BA4E25] hover:underline"
          >
            {t.auth.createAccount}
          </Link>
        </p>
      </div>
    </div>
  );
}
