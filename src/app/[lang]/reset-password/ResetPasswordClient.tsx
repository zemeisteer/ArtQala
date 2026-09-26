'use client';

import React, { useState } from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, Lock, AlertCircle, Check, X, ArrowLeft } from 'lucide-react';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, t } = useApp();

  const emailParam = searchParams.get('email') || '';

  const [email] = useState(emailParam);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError(t.auth.passwordRequirementsError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || t.auth.unexpectedError);
        return;
      }

      setSuccessMessage(t.auth.resetSuccess);
      await refreshUser();
      setTimeout(() => {
        router.push('/account');
      }, 1200);
    } catch {
      setError(t.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 sm:py-20 px-6 flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-md bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-8 sm:p-10 shadow-md">
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
            {t.auth.checkEmailTitle}
          </h1>
          <p className="text-xs text-[#726861]">
            {t.auth.checkEmailDesc.split('{email}')[0]}
            <strong className="text-[#281C18]">{email || t.auth.yourEmailFallback}</strong>
            {t.auth.checkEmailDesc.split('{email}')[1]}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-[#FFEBEE] border border-[#FFCDD2] rounded-[3px] text-xs text-[#C62828] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3.5 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[3px] text-xs text-[#1B5E20] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5 text-center">
              {t.auth.codeLabel}
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center text-2xl font-bold tracking-[6px] py-3 bg-white border border-[#E7E0D8] rounded-[3px] text-[#281C18] focus:outline-none focus:border-[#BA4E25]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.newPasswordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E7E0D8] rounded-[3px] text-sm text-[#281C18] focus:outline-none focus:border-[#BA4E25]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.auth.passwordConfirmLabel}
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

          <button
            type="submit"
            disabled={loading || code.length < 6 || !isPasswordValid}
            className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>{loading ? t.auth.resetting : t.auth.resetBtn}</span>
          </button>
        </form>

        <p className="text-center text-xs text-[#726861] mt-6">
          <Link href="/signin" className="font-bold text-[#BA4E25] hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.auth.backToSignIn}</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
