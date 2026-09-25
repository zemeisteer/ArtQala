'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, Globe, AlertCircle, Check, X, ShieldCheck } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import FilterSelect from '@/components/FilterSelect';
import { validateEmail, isValidEmail } from '@/lib/validation';
import { useApp } from '@/context/AppContext';

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useApp();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('Uzbekistan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Email validation criteria
  const isEmailValid = isValidEmail(email);

  // Password real-time criteria (TZ Section 8.8)
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error || t.auth.invalidEmailSignup);
      return;
    }

    if (!isPasswordValid) {
      if (!hasMinLength || !hasUppercase || !hasNumber) {
        setError(t.auth.passwordRequirementsError);
        return;
      }
      if (!passwordsMatch) {
        setError(t.auth.passwordsMismatchError);
        return;
      }
    }

    if (!agreedToTerms) {
      setError(t.auth.mustAgreeToTerms);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, country, email, password, agreedToTerms }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || t.auth.signupFailed);
        setLoading(false);
        return;
      }

      // The account is activated once the emailed 6-digit code is confirmed.
      router.push(`/verify-otp?email=${encodeURIComponent(data.email || email)}`);
    } catch {
      setError(t.auth.networkError);
      setLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-16 px-6 flex items-center justify-center min-h-[85vh]">
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
            {t.auth.signUpTitle}
          </h1>
          <p className="text-xs text-[#726861]">
            {t.auth.signUpSubtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-[#FFEBEE] border border-[#FFCDD2] rounded-[3px] text-xs text-[#C62828] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.fullNameLabel} *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.auth.fullNamePlaceholder}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E7E0D8] rounded-[3px] text-sm text-[#281C18] focus:outline-none focus:border-[#BA4E25]"
              />
            </div>
          </div>

          {/* Full Country Select (TZ Section 8.7) */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.countryLabel} *
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <FilterSelect
                value={country}
                onChange={setCountry}
                searchable
                buttonClassName="!pl-9 !rounded-[3px] !py-2.5 !text-sm"
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                {t.auth.emailLabel} *
              </label>
              {email.length > 0 && (
                <span
                  className={`text-[10px] font-medium flex items-center gap-1 ${
                    isEmailValid ? 'text-green-600' : 'text-[#BA4E25]'
                  }`}
                >
                  {isEmailValid ? (
                    <>
                      <Check className="w-3 h-3" /> {t.auth.emailValid}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> {t.auth.emailInvalid}
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className={`w-full pl-9 pr-9 py-2.5 bg-white border rounded-[3px] text-sm text-[#281C18] focus:outline-none transition-colors ${
                  email.length > 0 && !isEmailValid
                    ? 'border-[#BA4E25] focus:border-[#BA4E25]'
                    : email.length > 0 && isEmailValid
                    ? 'border-green-600 focus:border-green-600'
                    : 'border-[#E7E0D8] focus:border-[#BA4E25]'
                }`}
              />
              {email.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isEmailValid ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-[#BA4E25]" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password (TZ Section 8.8) */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.passwordLabel} *
            </label>
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

          {/* Confirm Password (TZ Section 8.8) */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.passwordConfirmLabel} *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-[3px] text-sm text-[#281C18] focus:outline-none ${
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#E7E0D8] focus:border-[#BA4E25]'
                }`}
              />
            </div>
          </div>

          {/* Real-time Password Requirements Card */}
          <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[3px] p-3 space-y-1.5 text-[11px]">
            <div className="font-semibold text-[#6B5E55] mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#BA4E25]" />
              <span>{t.auth.passwordRequirementsTitle}</span>
            </div>

            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-green-700 font-medium' : 'text-[#8F7E73]'}`}>
              {hasMinLength ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#D2C5BA] shrink-0" />}
              <span>{t.auth.reqMinLength}</span>
            </div>

            <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-green-700 font-medium' : 'text-[#8F7E73]'}`}>
              {hasUppercase ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#D2C5BA] shrink-0" />}
              <span>{t.auth.reqUppercase}</span>
            </div>

            <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-green-700 font-medium' : 'text-[#8F7E73]'}`}>
              {hasNumber ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#D2C5BA] shrink-0" />}
              <span>{t.auth.reqNumber}</span>
            </div>

            {confirmPassword.length > 0 && (
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                <span>{passwordsMatch ? t.auth.passwordsMatch : t.auth.passwordsNoMatch}</span>
              </div>
            )}
          </div>

          {/* Terms & Privacy agreement */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-[#BA4E25]"
            />
            <span className="text-xs text-[#554740] leading-relaxed">
              {t.auth.agreeToTermsPrefix}{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-[#BA4E25] hover:underline">
                {t.footer.terms}
              </Link>{' '}
              {t.auth.agreeToTermsAnd}{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-[#BA4E25] hover:underline">
                {t.footer.privacy}
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || (password.length > 0 && !isPasswordValid) || !agreedToTerms}
            className="w-full mt-2 py-3 px-4 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold uppercase tracking-wider rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? t.auth.creatingAccount : t.auth.signUpBtn}</span>
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

        <div className="mt-6 pt-5 border-t border-[#E7E0D8] text-center">
          <p className="text-xs text-[#726861]">
            {t.auth.alreadyHaveAccount}{' '}
            <Link href="/signin" className="font-semibold text-[#BA4E25] hover:underline">
              {t.auth.signInLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
