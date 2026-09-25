'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login yoki parol noto\'g\'ri');
        setLoading(false);
        return;
      }

      if (data.user?.role !== 'ADMIN') {
        // Sign out right away if they aren't admin
        await fetch('/api/auth/signout', { method: 'POST' });
        setError('Kirish cheklangan: faqat galereya administratorlari kira oladi.');
        setLoading(false);
        return;
      }

      await refreshUser();
      router.push('/admin');
    } catch {
      setError('Tizimga ulanishda xatolik yuz berdi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#140B07] text-[#FAF4EC] flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#BA4E25]/15 via-[#DAA932]/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Art Qala"
            width={38}
            height={38}
            className="w-9 h-9 object-contain brightness-110"
          />
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-wider text-[#FAF4EC] group-hover:text-[#DAA932] transition-colors">
              ART QALA
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#8F7E73]">
              Curator Portal
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs text-[#B5A599] hover:text-[#FAF4EC] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Saytga qaytish</span>
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md bg-[#1D100B] border border-[#382620] rounded-2xl p-8 shadow-2xl relative">
          {/* Top Badge */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-[#BA4E25]/20 border border-[#BA4E25]/40 flex items-center justify-center text-[#BA4E25] shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="font-serif text-2xl font-bold text-[#FAF4EC] tracking-wide">
              Administrator Kirishi
            </h1>
            <p className="text-xs text-[#9E8E82] mt-1.5 font-sans">
              Art Qala boshqaruv paneliga xavfsiz kirish
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-[#BA4E25]/15 border border-[#BA4E25]/30 flex items-start gap-2.5 text-xs text-[#F2A488]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#D8CDC4] mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#736358] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#281C18] border border-[#4A352D] rounded-lg text-sm text-[#FAF4EC] placeholder-[#736358] focus:outline-none focus:border-[#DAA932] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D8CDC4] mb-1.5">
                Parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#736358] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#281C18] border border-[#4A352D] rounded-lg text-sm text-[#FAF4EC] placeholder-[#736358] focus:outline-none focus:border-[#DAA932] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-[#BA4E25] to-[#A03F1B] hover:from-[#C7552A] hover:to-[#B34720] text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <span>Tizimga kirish</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 text-center text-[10px] text-[#5C4D44] relative z-10">
        © 2026 Art Qala Gallery. All rights reserved. Barcha huquqlar himoyalangan.
      </footer>
    </div>
  );
}
