'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Flag, Phone, Mail, MessageCircle, Users, Clock, Loader2 } from 'lucide-react';

interface Booking {
  id: string;
  workshop_id: string;
  date: string;
  time: string;
  people: number;
  name: string;
  email: string;
  phone: string;
  note: string | null;
  status: string;
  created_at: string;
  workshop: { title_uz: string; max_people: number | null; price: number };
}

const STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'Yangi', cls: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' },
  CONFIRMED: { label: 'Tasdiqlangan', cls: 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]' },
  DONE: { label: "O'tkazildi", cls: 'bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]' },
  CANCELLED: { label: 'Bekor qilingan', cls: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]' },
};
const ACTIVE = ['NEW', 'CONFIRMED'];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function dayTitle(date: string, today: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const label = `${d.getUTCDate()}-${UZ_MONTHS[d.getUTCMonth()]}, ${UZ_DAYS[d.getUTCDay()]}`;
  const diff = Math.round((d.getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400000);
  return diff === 0 ? `Bugun · ${label}` : diff === 1 ? `Ertaga · ${label}` : label;
}

const digits = (phone: string) => phone.replace(/\(WhatsApp\)/i, '').replace(/[^\d+]/g, '');

type Filter = 'upcoming' | 'past' | 'cancelled' | 'all';

// Admin → Master-klasslar → Bronlar: bookings grouped by day and session
// (workshop + time), with how full each session is.
export default function WorkshopBookings({ initial, openId }: { initial: Booking[]; openId: string | null }) {
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!openId) return;
    const el = document.getElementById(`booking-${openId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [openId]);

  const shown = useMemo(() => {
    const f = list.filter((b) =>
      filter === 'upcoming'
        ? b.date >= today && b.status !== 'CANCELLED'
        : filter === 'past'
          ? b.date < today && b.status !== 'CANCELLED'
          : filter === 'cancelled'
            ? b.status === 'CANCELLED'
            : true
    );
    return filter === 'past' ? [...f].reverse() : f;
  }, [list, filter, today]);

  // day → session key → bookings
  const days = useMemo(() => {
    const map = new Map<string, Map<string, Booking[]>>();
    for (const b of shown) {
      if (!map.has(b.date)) map.set(b.date, new Map());
      const key = `${b.time}|${b.workshop_id}`;
      const day = map.get(b.date)!;
      if (!day.has(key)) day.set(key, []);
      day.get(key)!.push(b);
    }
    return [...map.entries()];
  }, [shown]);

  const counts = {
    upcoming: list.filter((b) => b.date >= today && b.status !== 'CANCELLED').length,
    past: list.filter((b) => b.date < today && b.status !== 'CANCELLED').length,
    cancelled: list.filter((b) => b.status === 'CANCELLED').length,
    all: list.length,
  };

  const setStatus = async (b: Booking, status: string, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(b.id);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/workshops/bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setList((l) => l.map((x) => (x.id === b.id ? { ...x, status } : x)));
        setNote({
          ok: true,
          text: status === 'CONFIRMED' ? (data.emailed ? `Tasdiqlandi — ${b.email} ga xabar yuborildi.` : 'Tasdiqlandi.') : 'Saqlandi.',
        });
      } else setNote({ ok: false, text: data.error || 'Xatolik' });
    } catch {
      setNote({ ok: false, text: "Serverga bog'lanib bo'lmadi" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Master-klass bronlari</h1>
        <p className="text-sm text-[#6B5E55] mt-1 max-w-3xl">
          Saytdan kelgan bronlar kun va seans bo&apos;yicha. Har bir seansda nechta joy band ekani ko&apos;rinadi — joy tugasa,
          saytda o&apos;sha vaqt &laquo;Band&raquo; bo&apos;lib qoladi. <b>Tasdiqlash</b> ni bossangiz, mijozga emailda
          tasdiq boradi. Bekor qilingan bron joyni bo&apos;shatadi.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['upcoming', 'Kelayotgan'],
            ['past', "O'tgan"],
            ['cancelled', 'Bekor qilingan'],
            ['all', 'Hammasi'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              filter === k ? 'bg-[#281C18] text-white border-[#281C18]' : 'bg-white text-[#554740] border-[#E7E0D8]'
            }`}
          >
            {label} ({counts[k]})
          </button>
        ))}
      </div>

      {note && <p className={`text-sm ${note.ok ? 'text-[#16A34A]' : 'text-[#B91C1C]'}`}>{note.text}</p>}

      {days.length === 0 ? (
        <div className="bg-white border border-[#E7E0D8] rounded-[4px] p-10 text-center text-sm text-[#8F8178]">
          Bu yerda hozircha bron yo&apos;q.
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(([date, sessions]) => (
            <section key={date} className="space-y-3">
              <h2 className="font-serif text-xl font-semibold text-[#281C18] border-b border-[#E7E0D8] pb-1.5">
                {dayTitle(date, today)}
              </h2>
              {[...sessions.entries()].map(([key, bookings]) => {
                const w = bookings[0].workshop;
                const taken = bookings.filter((b) => ACTIVE.includes(b.status)).reduce((s, b) => s + b.people, 0);
                const max = w.max_people;
                const pct = max ? Math.min(100, Math.round((taken / max) * 100)) : taken > 0 ? 100 : 0;
                return (
                  <div key={key} className="bg-white border border-[#E7E0D8] rounded-[4px] overflow-hidden">
                    <div className="px-4 py-3 bg-[#FAF4EC] border-b border-[#EFE8DE] flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="flex items-center gap-1.5 font-semibold text-[#281C18]">
                        <Clock className="w-4 h-4 text-[#BA4E25]" /> {bookings[0].time}
                      </span>
                      <span className="font-serif text-lg text-[#281C18]">{w.title_uz}</span>
                      <span className="ml-auto flex items-center gap-2 text-xs text-[#554740]">
                        <Users className="w-4 h-4" />
                        {max ? `${taken} / ${max} joy band` : taken > 0 ? 'Shaxsiy seans — band' : "Bo'sh"}
                        <span className="w-24 h-1.5 bg-[#EFE8DE] rounded-full overflow-hidden">
                          <span
                            className={`block h-full ${pct >= 100 ? 'bg-[#B91C1C]' : pct >= 70 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </span>
                    </div>
                    <div className="divide-y divide-[#F0EAE1]">
                      {bookings.map((b) => {
                        const st = STATUS[b.status] || STATUS.NEW;
                        const tel = digits(b.phone);
                        const isBusy = busy === b.id;
                        return (
                          <div
                            key={b.id}
                            id={`booking-${b.id}`}
                            className={`px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 ${openId === b.id ? 'bg-[#FFF7ED]' : ''}`}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-[#281C18]">{b.name}</span>
                                <span className="text-xs text-[#554740] bg-[#F5EFE7] rounded-full px-2 py-0.5">
                                  {b.people} kishi · ${Math.round(w.price * b.people)}
                                </span>
                                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                <a href={`https://wa.me/${tel.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#16A34A] hover:underline">
                                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                </a>
                                <a href={`tel:${tel}`} className="flex items-center gap-1 text-[#554740] hover:underline">
                                  <Phone className="w-3.5 h-3.5" /> {b.phone.replace(/\s*\(WhatsApp\)/i, '')}
                                </a>
                                <a href={`mailto:${b.email}`} className="flex items-center gap-1 text-[#BA4E25] hover:underline">
                                  <Mail className="w-3.5 h-3.5" /> {b.email}
                                </a>
                              </div>
                              {b.note && <p className="text-xs italic text-[#4D3F38]">&ldquo;{b.note}&rdquo;</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                              {isBusy && <Loader2 className="w-4 h-4 animate-spin text-[#8F8178] self-center" />}
                              {b.status === 'NEW' && (
                                <button
                                  onClick={() => setStatus(b, 'CONFIRMED')}
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold px-3 py-1.5 rounded-[3px] disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Tasdiqlash
                                </button>
                              )}
                              {(b.status === 'NEW' || b.status === 'CONFIRMED') && b.date <= today && (
                                <button
                                  onClick={() => setStatus(b, 'DONE')}
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-semibold px-3 py-1.5 rounded-[3px] disabled:opacity-50"
                                >
                                  <Flag className="w-3.5 h-3.5" /> O&apos;tkazildi
                                </button>
                              )}
                              {b.status !== 'CANCELLED' && b.status !== 'DONE' && (
                                <button
                                  onClick={() => setStatus(b, 'CANCELLED', `${b.name} ning broni bekor qilinsinmi? Joy bo'shaydi.`)}
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#8F7E73] hover:text-[#B91C1C] px-2"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Bekor qilish
                                </button>
                              )}
                              {b.status === 'CANCELLED' && (
                                <button
                                  onClick={() => setStatus(b, 'NEW')}
                                  disabled={isBusy}
                                  className="text-xs font-semibold text-[#554740] hover:underline px-2"
                                >
                                  Qayta tiklash
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
