'use client';

import React, { useState } from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { KeyRound, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { validateEmail } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useApp();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || t.auth.unexpectedError);
        return;
      }

      router.push(`/reset-password?email=${encodeURIComponent(email.toLowerCase().trim())}`);
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
          <div className="w-12 h-12 rounded-full bg-[#429599]/10 text-[#429599] flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#281C18]">
            {t.auth.forgotPasswordTitle}
          </h1>
          <p className="text-xs text-[#726861]">{t.auth.forgotPasswordSubtitle}</p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            <span>{loading ? t.auth.sendingCode : t.auth.sendCodeBtn}</span>
          </button>
        </form>

        <p className="text-center text-xs text-[#726861] mt-8">
          <Link href="/signin" className="font-bold text-[#BA4E25] hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.auth.backToSignIn}</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
