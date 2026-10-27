'use client';

import React, { useState } from 'react';
import { Clock, Users, MapPin, X, Send, CheckCircle2, Palette } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import { useApp } from '@/context/AppContext';
import { pick } from '@/lib/contentTranslations';
import { ReviewHoneypot, reviewErrorText, reviewGuardFields, useReviewFormToken } from '@/components/ReviewGuard';

export interface PublicWorkshop {
  id: string;
  title_uz: string;
  title_en: string;
  title_ru: string;
  description_uz: string | null;
  description_en: string | null;
  description_ru: string | null;
  translations: string | null;
  duration_minutes: number;
  price: number;
  max_people: number | null;
  location: string | null;
  image: string | null;
}

const input = 'w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]';
const label = 'block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1';

export default function ExperiencesClient({ workshops }: { workshops: PublicWorkshop[] }) {
  const { t, lang } = useApp();
  const w = t.workshops;
  const [booking, setBooking] = useState<PublicWorkshop | null>(null);

  const duration = (m: number) =>
    m % 60 === 0 ? w.hours.replace('{n}', String(m / 60)) : m > 60 ? w.hours.replace('{n}', (m / 60).toFixed(1)) : w.minutes.replace('{n}', String(m));

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: w.navLabel }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <div className="max-w-2xl mb-10 space-y-2">
          <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">{w.eyebrow}</span>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">{w.title}</h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">{w.subtitle}</p>
        </div>

        {workshops.length === 0 ? (
          <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-10 text-center text-sm text-[#6B5E55]">{w.empty}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((x) => (
              <div key={x.id} className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] overflow-hidden flex flex-col shadow-xs">
                {x.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={x.image} alt={pick(x, 'title', lang)} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-[#F0E6DA] flex items-center justify-center">
                    <Palette className="w-10 h-10 text-[#BA4E25]/50" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1 gap-3">
                  <h2 className="font-serif text-xl font-semibold text-[#281C18]">{pick(x, 'title', lang)}</h2>
                  {pick(x, 'description', lang) && (
                    <p className="text-sm text-[#554740] leading-relaxed whitespace-pre-line">{pick(x, 'description', lang)}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B5E55]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {duration(x.duration_minutes)}
                    </span>
                    {x.max_people && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {w.upTo.replace('{n}', String(x.max_people))}
                      </span>
                    )}
                    {x.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {x.location}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-serif text-2xl font-bold text-[#BA4E25]">${Math.round(x.price)}</span>{' '}
                      <span className="text-xs text-[#8F8178]">{w.perPerson}</span>
                    </div>
                    <button
                      onClick={() => setBooking(x)}
                      className="bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold px-5 py-2.5 rounded-[3px] shadow-xs"
                    >
                      {w.book}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {booking && <BookingModal workshop={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

function BookingModal({ workshop, onClose }: { workshop: PublicWorkshop; onClose: () => void }) {
  const { t, lang, user } = useApp();
  const w = t.workshops;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [people, setPeople] = useState(2);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const token = useReviewFormToken(!sent);
  const max = workshop.max_people || 20;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!date) {
      setError(w.errInvalid);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/workshops/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshop_id: workshop.id,
          date,
          time,
          people,
          name: name ?? user?.name ?? '',
          email: email ?? user?.email ?? '',
          phone,
          note,
          ...reviewGuardFields(form, token.token),
        }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else {
        setError(data.code === 'invalid' ? w.errInvalid : reviewErrorText(data.code, t));
        if (data.code === 'expired') token.refresh();
      }
    } catch {
      setError(t.reviews.networkError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#281C18]/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
        <button onClick={onClose} aria-label={w.cancel} className="absolute top-5 right-5 text-[#8F8178] hover:text-[#281C18] p-1">
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-serif text-2xl font-semibold text-[#281C18] pr-8">
          {w.bookTitle.replace('{title}', pick(workshop, 'title', lang))}
        </h3>
        {sent ? (
          <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-[3px] text-sm text-[#16A34A] flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{w.thanks}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5 relative">
            <ReviewHoneypot />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={label}>{w.date}</span>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <span className={label}>{w.time}</span>
                <TimePicker value={time} onChange={setTime} />
              </div>
            </div>
            <div>
              <span className={label}>{w.people}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPeople((p) => Math.max(1, p - 1))} className="w-9 h-9 border border-[#E7E0D8] bg-white rounded-[3px] text-lg">
                  −
                </button>
                <span className="w-10 text-center font-semibold">{people}</span>
                <button type="button" onClick={() => setPeople((p) => Math.min(max, p + 1))} className="w-9 h-9 border border-[#E7E0D8] bg-white rounded-[3px] text-lg">
                  +
                </button>
                <span className="ml-auto text-sm text-[#554740]">
                  {w.total}: <b className="text-[#BA4E25]">${Math.round(workshop.price * people)}</b>
                </span>
              </div>
            </div>
            <div>
              <label className={label}>{w.name}</label>
              <input required maxLength={80} value={name ?? user?.name ?? ''} onChange={(e) => setName(e.target.value)} className={input} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>{w.contact}</label>
                <input required type="email" maxLength={120} value={email ?? user?.email ?? ''} onChange={(e) => setEmail(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>{w.phone}</label>
                <input type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
              </div>
            </div>
            <div>
              <label className={label}>{w.note}</label>
              <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={`${input} resize-none`} />
            </div>
            {error && <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">{error}</div>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs text-[#726861] hover:text-[#281C18]">
                {w.cancel}
              </button>
              <button
                type="submit"
                disabled={sending}
                className="bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-60 text-white font-semibold text-xs px-6 py-2.5 rounded-[3px] flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> {sending ? w.sending : w.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
