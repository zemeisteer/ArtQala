'use client';

import React, { useState } from 'react';
import { Clock, Users, MapPin, X, Send, CheckCircle2, Palette, CalendarDays } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import PhoneInput from '@/components/PhoneInput';
import { useApp } from '@/context/AppContext';
import { pick } from '@/lib/contentTranslations';
import { weekdayOf } from '@/lib/workshops';
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
  times: string[];
  weekdays: number[];
}

const input = 'w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]';
const label = 'block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1';

// "Mon", "Пн", "月"… — 2024-01-07 was a Sunday.
// Browsers have no Uzbek names, so those are spelled out here.
const UZ_WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const weekdayName = (d: number, lang: string) =>
  lang === 'uz'
    ? UZ_WEEKDAYS[d]
    : new Date(Date.UTC(2024, 0, 7 + d)).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { weekday: 'short', timeZone: 'UTC' });

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
          <span className="text-xs font-semibold tracking-[3px] text-[#347578] uppercase">{w.eyebrow}</span>
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
                    {(x.times.length > 0 || x.weekdays.length > 0) && (
                      <span className="flex items-center gap-1 w-full">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {x.weekdays.length ? x.weekdays.map((d) => weekdayName(d, lang)).join(', ') : w.everyDay}
                        {x.times.length > 0 && ` · ${x.times.join(', ')}`}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-serif text-2xl font-bold text-[#BA4E25]">${Math.round(x.price)}</span>{' '}
                      <span className="text-xs text-[#756962]">{w.perPerson}</span>
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

interface SessionState {
  time: string;
  taken: number;
  left: number | null;
  full: boolean;
}

function BookingModal({ workshop, onClose }: { workshop: PublicWorkshop; onClose: () => void }) {
  const { t, lang, user } = useApp();
  const w = t.workshops;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [people, setPeople] = useState(1);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [slots, setSlots] = useState<{ runsThatDay: boolean; sessions: SessionState[] } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const token = useReviewFormToken(!sent);
  const fixedTimes = workshop.times.length > 0;
  const today = new Date().toISOString().slice(0, 10);

  const loadSlots = async (d: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/availability?date=${d}`, { cache: 'no-store' });
      const data = await res.json();
      setSlots(data.success ? { runsThatDay: data.runsThatDay, sessions: data.sessions } : null);
    } catch {
      setSlots(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  const pickDate = (d: string) => {
    setDate(d);
    setTime('');
    setError(null);
    setSlots(null);
    if (d && d < today) {
      setError(w.errDate);
      return;
    }
    if (d) loadSlots(d);
  };

  const session = slots?.sessions.find((s) => s.time === time);
  const takenHere = session?.taken || 0;
  const timeFull = !!session?.full;
  // Seats this booking may take in the chosen session.
  const maxHere = workshop.max_people ? Math.max(1, workshop.max_people - takenHere) : 20;
  const shownTimes = fixedTimes ? workshop.times.map((tm) => slots?.sessions.find((s) => s.time === tm) || { time: tm, taken: 0, left: workshop.max_people, full: false }) : [];

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!date || date < today) return setError(w.errDate);
    if (slots && !slots.runsThatDay) return setError(w.notThatDay);
    if (!time) return setError(w.errTime);
    if (timeFull) return setError(w.errFull);
    if (!phoneValid) return setError(t.phoneInput.invalidPhone);
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
          people: Math.min(people, maxHere),
          name: name ?? user?.name ?? '',
          email: email ?? user?.email ?? '',
          phone,
          note,
          lang,
          ...reviewGuardFields(form, token.token),
        }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else {
        const byCode: Record<string, string> = {
          full: w.errFull,
          date: w.errDate,
          time: w.errTime,
          phone: t.phoneInput.invalidPhone,
          invalid: w.errInvalid,
        };
        setError(byCode[data.code] || reviewErrorText(data.code, t));
        if (data.code === 'full') loadSlots(date);
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
        <button onClick={onClose} aria-label={w.cancel} className="absolute top-5 right-5 text-[#756962] hover:text-[#281C18] p-1">
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-serif text-2xl font-semibold text-[#281C18] pr-8">
          {w.bookTitle.replace('{title}', pick(workshop, 'title', lang))}
        </h3>
        {sent ? (
          <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-[3px] text-sm text-[#107B38] flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{w.thanks}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 relative">
            <ReviewHoneypot />
            <div>
              <span className={label}>{w.date}</span>
              <DatePicker
                value={date}
                onChange={pickDate}
                min={today}
                isDisabled={(d) => workshop.weekdays.length > 0 && !workshop.weekdays.includes(weekdayOf(d))}
                locale={lang === 'uz' ? undefined : lang === 'en' ? 'en-GB' : lang}
                placeholder={w.chooseDate}
                todayLabel=""
              />
            </div>

            <div>
              <span className={label}>{w.chooseTime}</span>
              {!date || date < today ? (
                <p className="text-xs text-[#756962]">{w.chooseDate}</p>
              ) : loadingSlots ? (
                <p className="text-xs text-[#756962]">{w.loadingSlots}</p>
              ) : slots && !slots.runsThatDay ? (
                <p className="text-xs text-[#B91C1C]">{w.notThatDay}</p>
              ) : fixedTimes ? (
                <div className="grid grid-cols-3 gap-2">
                  {shownTimes.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={s.full}
                      onClick={() => {
                        setTime(s.time);
                        setError(null);
                        if (s.left !== null) setPeople((p) => Math.min(p, Math.max(1, s.left!)));
                      }}
                      className={`rounded-[3px] border px-2 py-2 text-center transition ${
                        s.full
                          ? 'bg-[#F3EEE8] border-[#E7E0D8] text-[#B5A599] cursor-not-allowed line-through'
                          : time === s.time
                            ? 'bg-[#BA4E25] border-[#BA4E25] text-white'
                            : 'bg-white border-[#E7E0D8] text-[#281C18] hover:border-[#BA4E25]'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{s.time}</span>
                      <span className="block text-[10.5px]">
                        {s.full ? w.full : s.left !== null ? w.seatsLeft.replace('{n}', String(s.left)) : w.free}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <TimePicker
                    value={time}
                    onChange={(v) => {
                      setTime(v);
                      setError(null);
                    }}
                  />
                  {slots && slots.sessions.some((s) => s.full) && (
                    <p className="text-[11px] text-[#756962]">
                      {w.takenTimes} {slots.sessions.filter((s) => s.full).map((s) => s.time).join(', ')}
                    </p>
                  )}
                  {timeFull && <p className="text-xs text-[#B91C1C]">{w.errFull}</p>}
                </div>
              )}
            </div>

            <div>
              <span className={label}>{w.people}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPeople((p) => Math.max(1, p - 1))} className="w-9 h-9 border border-[#E7E0D8] bg-white rounded-[3px] text-lg">
                  −
                </button>
                <span className="w-10 text-center font-semibold">{people}</span>
                <button type="button" onClick={() => setPeople((p) => Math.min(maxHere, p + 1))} className="w-9 h-9 border border-[#E7E0D8] bg-white rounded-[3px] text-lg">
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
            <div>
              <label className={label}>{w.contact}</label>
              <input required type="email" maxLength={120} value={email ?? user?.email ?? ''} onChange={(e) => setEmail(e.target.value)} className={input} />
            </div>
            <div>
              <span className={label}>{w.phone} *</span>
              <PhoneInput value={phone} onChange={setPhone} onValidityChange={setPhoneValid} />
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
                disabled={sending || timeFull}
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
