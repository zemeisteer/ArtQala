'use client';

import React, { useState } from 'react';
import { Gift, Send, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import PhoneInput from '@/components/PhoneInput';
import { useApp } from '@/context/AppContext';
import { ReviewHoneypot, reviewErrorText, reviewGuardFields, useReviewFormToken } from '@/components/ReviewGuard';

const AMOUNTS = [50, 100, 200, 300, 500];
const MIN = 20;

const input =
  'w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]';
const label = 'block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1';

export default function GiftCardClient() {
  const { t, lang } = useApp();
  const g = t.gift;
  const [amount, setAmount] = useState<number>(100);
  const [custom, setCustom] = useState('');
  const [f, setF] = useState({ buyer_name: '', buyer_email: '', buyer_phone: '', recipient_name: '', recipient_email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true);
  const token = useReviewFormToken(!sent);

  const value = custom ? Math.round(Number(custom)) : amount;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    if (!Number.isFinite(value) || value < MIN || value > 10000) {
      setError(g.errAmount);
      return;
    }
    if (!phoneValid) {
      setError(t.phoneInput.invalidPhone);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, amount: value, lang, ...reviewGuardFields(form, token.token) }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else {
        setError(data.code === 'amount' ? g.errAmount : data.code === 'phone' ? t.phoneInput.invalidPhone : reviewErrorText(data.code, t));
        if (data.code === 'expired') token.refresh();
      }
    } catch {
      setError(t.reviews.networkError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: g.navLabel }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <div className="max-w-2xl mb-10 space-y-2">
          <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">{g.eyebrow}</span>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">{g.title}</h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">{g.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            {sent ? (
              <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-8 space-y-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
                <h2 className="font-serif text-2xl font-semibold text-[#281C18]">{g.thanksTitle}</h2>
                <p className="text-sm text-[#554740]">{g.thanksText}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="relative bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 sm:p-8 space-y-6 shadow-xs">
                <ReviewHoneypot />
                <div>
                  <span className={label}>{g.amountLabel}</span>
                  <div className="flex flex-wrap gap-2">
                    {AMOUNTS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          setAmount(a);
                          setCustom('');
                        }}
                        className={`px-4 py-2.5 rounded-[3px] border text-sm font-semibold transition ${
                          !custom && amount === a
                            ? 'bg-[#BA4E25] border-[#BA4E25] text-white'
                            : 'bg-white border-[#E7E0D8] text-[#281C18] hover:border-[#BA4E25]'
                        }`}
                      >
                        ${a}
                      </button>
                    ))}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MIN}
                      max={10000}
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder={g.customAmount}
                      aria-label={g.customAmount}
                      className={`${input} !w-36`}
                    />
                  </div>
                  <p className="text-[11px] text-[#8F8178] mt-1">{g.minNote.replace('{min}', String(MIN))}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-serif text-lg font-semibold text-[#281C18]">{g.buyerSection}</h3>
                    <div>
                      <label className={label}>{g.yourName}</label>
                      <input required maxLength={80} value={f.buyer_name} onChange={set('buyer_name')} className={input} />
                    </div>
                    <div>
                      <label className={label}>{g.yourEmail}</label>
                      <input required type="email" maxLength={120} value={f.buyer_email} onChange={set('buyer_email')} className={input} />
                    </div>
                    <div>
                      <label className={label}>{g.yourPhone}</label>
                      <PhoneInput
                        value={f.buyer_phone}
                        onChange={(v) => setF((x) => ({ ...x, buyer_phone: v }))}
                        onValidityChange={setPhoneValid}
                        required={false}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-serif text-lg font-semibold text-[#281C18]">{g.recipientSection}</h3>
                    <div>
                      <label className={label}>{g.recipientName}</label>
                      <input required maxLength={80} value={f.recipient_name} onChange={set('recipient_name')} className={input} />
                    </div>
                    <div>
                      <label className={label}>{g.recipientEmail}</label>
                      <input type="email" maxLength={120} value={f.recipient_email} onChange={set('recipient_email')} className={input} />
                      <p className="text-[11px] text-[#8F8178] mt-1">{g.recipientEmailHint}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={label}>{g.message}</label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={f.message}
                    onChange={set('message')}
                    placeholder={g.messagePlaceholder}
                    className={`${input} resize-none`}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full sm:w-auto bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-60 text-white font-semibold text-sm px-8 py-3 rounded-[3px] transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {sending ? g.sending : g.submit}
                    {!sending && Number.isFinite(value) && value >= MIN ? ` — $${value}` : ''}
                  </span>
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* A small preview of the certificate */}
            <div className="bg-[#FFFDF9] border-[5px] border-[#DAA932] p-2 shadow-lg">
              <div className="border border-[#DAA932]/60 p-6 text-center space-y-2">
                <Gift className="w-8 h-8 text-[#BA4E25] mx-auto" />
                <div className="text-[10.5px] font-bold tracking-[3px] text-[#BA4E25] uppercase">Art Qala</div>
                <div className="font-serif text-2xl font-semibold text-[#281C18]">{g.certTitle}</div>
                <div className="font-serif text-4xl font-bold text-[#BA4E25]">
                  ${Number.isFinite(value) && value >= MIN ? value : amount}
                </div>
                {f.recipient_name && (
                  <div className="text-sm text-[#554740]">
                    {g.certFor}: <b>{f.recipient_name}</b>
                  </div>
                )}
                {f.message && <div className="text-xs italic text-[#6B5E55]">&ldquo;{f.message}&rdquo;</div>}
              </div>
            </div>

            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3">
              <h3 className="font-serif text-xl font-semibold text-[#281C18]">{g.howTitle}</h3>
              {[g.how1, g.how2, g.how3, g.how4].map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#554740]">
                  <span className="text-[#BA4E25] font-bold">{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
