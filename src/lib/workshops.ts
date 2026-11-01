// Masterclasses / tours (model Workshop), bookable on /experiences; each
// booking is a WorkshopBooking, managed in Admin → Master-klasslar.
// (Bookings made before that model existed are ServiceRequests of type
// WORKSHOP_SERVICE_TYPE.)

export const WORKSHOP_SERVICE_TYPE = 'WORKSHOP';

// Bookings that hold seats in their session.
export const ACTIVE_BOOKING_STATUSES = ['NEW', 'CONFIRMED'];
export const BOOKING_STATUSES = ['NEW', 'CONFIRMED', 'DONE', 'CANCELLED'] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "10:00, 14:30 16:00" → ["10:00", "14:30", "16:00"] (sorted, unique).
export function parseTimes(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,;]+/) : [];
  const out = list
    .map((t) => String(t).trim().replace(/^(\d):/, '0$1:'))
    .filter((t) => TIME_RE.test(t));
  return Array.from(new Set(out)).sort();
}

export const isTime = (t: string) => TIME_RE.test(t);

// Day of week (0 = Sunday) of a YYYY-MM-DD date, independent of time zone.
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// When the master is free, date by date (Workshop.date_slots, JSON), on top
// of the weekly schedule (`weekdays` + `times`):
//   dates[date] = { off: true }        — away that day, no sessions
//   dates[date] = { times: [...] }     — sessions at these times that day
//                                        (also on a day the weekly schedule
//                                        doesn't run; no times = the usual ones)
//   only: true                         — bookable ONLY on the listed dates
export interface DateSlot {
  off?: boolean;
  times?: string[];
}
export interface DateSlots {
  only: boolean;
  dates: Record<string, DateSlot>;
}

export function parseDateSlots(raw: unknown): DateSlots {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      v = null;
    }
  }
  const o = (v && typeof v === 'object' ? v : {}) as { only?: unknown; dates?: unknown };
  const dates: Record<string, DateSlot> = {};
  if (o.dates && typeof o.dates === 'object') {
    for (const [d, slot] of Object.entries(o.dates as Record<string, unknown>)) {
      if (!DATE_RE.test(d) || !slot || typeof slot !== 'object') continue;
      const s = slot as { off?: unknown; times?: unknown };
      dates[d] = s.off === true ? { off: true } : { times: parseTimes(s.times) };
    }
  }
  return { only: o.only === true, dates };
}

// The session times of a workshop on a date: null = no sessions that day,
// [] = the visitor names a time (no fixed sessions).
export function timesOn(
  w: { times: string[]; weekdays: number[]; date_slots?: string | null },
  date: string
): string[] | null {
  const { only, dates } = parseDateSlots(w.date_slots);
  const slot = dates[date];
  if (slot) return slot.off ? null : slot.times?.length ? slot.times : w.times;
  if (only) return null;
  if (w.weekdays.length && !w.weekdays.includes(weekdayOf(date))) return null;
  return w.times;
}

export interface SessionState {
  time: string;
  taken: number; // people already booked
  left: number | null; // seats left; null = private session (no max_people)
  full: boolean;
}

// How full each session of a workshop is on a date. `bookings` are that
// workshop's active bookings on that date.
export function sessionStates(
  workshop: { max_people: number | null; times: string[] },
  bookings: { time: string; people: number }[]
): SessionState[] {
  const taken = new Map<string, number>();
  for (const b of bookings) taken.set(b.time, (taken.get(b.time) || 0) + b.people);
  const times = Array.from(new Set([...workshop.times, ...taken.keys()])).sort();
  return times.map((time) => {
    const t = taken.get(time) || 0;
    const left = workshop.max_people ? Math.max(0, workshop.max_people - t) : null;
    return { time, taken: t, left, full: workshop.max_people ? left === 0 : t > 0 };
  });
}

// Whether `people` more fit into a session that already has `taken`.
export function fits(maxPeople: number | null, taken: number, people: number): boolean {
  return maxPeople ? taken + people <= maxPeople : taken === 0;
}

export interface WorkshopInput {
  title_uz: string;
  title_en: string;
  title_ru: string;
  description_uz: string | null;
  description_en: string | null;
  description_ru: string | null;
  duration_minutes: number;
  price: number;
  max_people: number | null;
  location: string | null;
  image: string | null;
  is_active: boolean;
  sort: number;
  times: string[];
  weekdays: number[];
  date_slots: string | null;
}

const text = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// Admin form body → data, or an error message (Uzbek, shown in the admin).
export function parseWorkshopInput(body: Record<string, unknown>): { data: WorkshopInput } | { error: string } {
  const title_uz = text(body.title_uz, 200);
  const title_en = text(body.title_en, 200) || title_uz;
  const title_ru = text(body.title_ru, 200) || title_uz;
  if (!title_uz && !title_en) return { error: 'Nomini kiriting' };
  const price = num(body.price);
  if (!(price >= 0)) return { error: "Narxni to'g'ri kiriting" };
  const duration = Math.round(num(body.duration_minutes));
  const maxPeople = body.max_people === '' || body.max_people == null ? null : Math.round(num(body.max_people));
  return {
    data: {
      title_uz: title_uz || title_en,
      title_en,
      title_ru,
      description_uz: text(body.description_uz) || null,
      description_en: text(body.description_en) || null,
      description_ru: text(body.description_ru) || null,
      duration_minutes: duration > 0 ? duration : 120,
      price,
      max_people: maxPeople && maxPeople > 0 ? maxPeople : null,
      location: text(body.location, 300) || null,
      image: text(body.image, 1000) || null,
      is_active: body.is_active !== false,
      sort: Math.round(num(body.sort)) || 0,
      times: parseTimes(body.times),
      weekdays: Array.isArray(body.weekdays)
        ? Array.from(new Set(body.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort()
        : [],
      date_slots: (() => {
        const slots = parseDateSlots(body.date_slots ?? null);
        return slots.only || Object.keys(slots.dates).length ? JSON.stringify(slots) : null;
      })(),
    },
  };
}
