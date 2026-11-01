'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Loader2, Smartphone } from 'lucide-react';

// The signed-in admin's own two-step sign-in (/api/admin/2fa,
// src/lib/totp.ts): scan the QR code in an authenticator app, type the code
// it shows, and from then on every sign-in asks for that code too.
export default function TwoFactorPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string; setup: string } | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/2fa')
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  const reset = () => {
    setSetup(null);
    setDisabling(false);
    setCode('');
    setError(null);
  };

  const start = async () => {
    reset();
    setDone(null);
    setBusy(true);
    try {
      const d = await (await fetch('/api/admin/2fa', { method: 'POST' })).json();
      if (d.success) setSetup(d);
      else setError(d.error || 'Xatolik yuz berdi');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/2fa', {
        method: setup ? 'PUT' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup ? { setup: setup.setup, code } : { code }),
      });
      const d = await res.json();
      if (!d.success) {
        setError(d.error || 'Xatolik yuz berdi');
        return;
      }
      setEnabled(d.enabled);
      setDone(
        d.enabled
          ? "Yoqildi. Endi har kirishda parol bilan birga ilovadagi kod so'raladi."
          : "O'chirildi. Endi kirish uchun faqat parol yetarli."
      );
      reset();
    } finally {
      setBusy(false);
    }
  };

  const codeField = (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      required
      maxLength={7}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ''))}
      placeholder="123456"
      className="w-32 text-sm tracking-[0.3em] px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] text-[#281C18]"
    />
  );

  return (
    <section className="bg-white border border-[#E7E0D8] rounded-[4px] p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#281C18] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#347578]" />
            Ikki bosqichli kirish (sizning hisobingiz)
          </h2>
          <p className="text-xs text-[#6B5E55] mt-1 max-w-2xl leading-relaxed">
            Yoqilsa, admin panelga kirishda parol bilan birga telefoningizdagi ilova (Google Authenticator, Microsoft
            Authenticator…) ko&apos;rsatgan 6 xonali kod ham so&apos;raladi. Parolingiz o&apos;g&apos;irlansa ham, telefonsiz
            hech kim kira olmaydi. Google orqali kirish bu hisob uchun admin panelni ochmaydi.
          </p>
        </div>
        {enabled !== null && (
          <span
            className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              enabled ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]' : 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]'
            }`}
          >
            {enabled ? 'Yoqilgan' : "O'chiq"}
          </span>
        )}
      </div>

      {done && <p className="text-xs text-[#1B5E20]">{done}</p>}

      {enabled === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#BA4E25]" />
      ) : setup ? (
        <form onSubmit={submit} className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
          <div
            className="w-44 h-44 border border-[#E7E0D8] rounded-[3px] p-1 bg-white [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: setup.qr }}
          />
          <div className="space-y-3 text-xs text-[#4D3F38]">
            <p className="flex items-center gap-1.5 font-semibold text-[#281C18]">
              <Smartphone className="w-4 h-4" /> 1. Ilovada &quot;+&quot; → &quot;QR kodni skanerlash&quot;
            </p>
            <p>
              Skanerlab bo&apos;lmasa, kalitni qo&apos;lda kiriting:{' '}
              <code className="break-all bg-[#FAF4EC] px-1.5 py-0.5 rounded text-[#281C18]">{setup.secret}</code>
            </p>
            <p className="font-semibold text-[#281C18]">2. Ilova ko&apos;rsatgan kodni yozing:</p>
            <div className="flex items-center gap-2">
              {codeField}
              <button
                type="submit"
                disabled={busy || code.length < 6}
                className="text-xs font-semibold text-white bg-[#BA4E25] hover:bg-[#9C3E1B] px-3.5 py-2 rounded-[3px] disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yoqish'}
              </button>
              <button type="button" onClick={reset} className="text-xs text-[#6B5E55] underline">
                Bekor qilish
              </button>
            </div>
            {error && <p className="text-[#9B1C1C]">{error}</p>}
            <p className="text-[11px] text-[#756962]">
              Telefon yo&apos;qolsa: bazada <code>UPDATE &quot;User&quot; SET &quot;totp_secret&quot; = NULL WHERE &quot;email&quot; = &apos;…&apos;;</code>{' '}
              bilan o&apos;chiriladi.
            </p>
          </div>
        </form>
      ) : disabling ? (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#4D3F38]">O&apos;chirish uchun ilovadagi hozirgi kod:</span>
          {codeField}
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="font-semibold text-white bg-[#9B1C1C] px-3.5 py-2 rounded-[3px] disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "O'chirish"}
          </button>
          <button type="button" onClick={reset} className="text-[#6B5E55] underline">
            Bekor qilish
          </button>
          {error && <p className="basis-full text-[#9B1C1C]">{error}</p>}
        </form>
      ) : enabled ? (
        <button
          type="button"
          onClick={() => {
            reset();
            setDone(null);
            setDisabling(true);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#9B1C1C] border border-[#E9C3C3] px-3.5 py-2 rounded-[3px]"
        >
          <ShieldOff className="w-4 h-4" /> O&apos;chirish
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#BA4E25] hover:bg-[#9C3E1B] px-3.5 py-2 rounded-[3px] disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Yoqish
        </button>
      )}
    </section>
  );
}
