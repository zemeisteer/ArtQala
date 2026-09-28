import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { splitLangPath } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

const PERIODS = [
  { days: 1, label: 'Bugun' },
  { days: 7, label: '7 kun' },
  { days: 30, label: '30 kun' },
  { days: 90, label: '90 kun' },
];

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code: string) => {
  try {
    return countryNames.of(code) || code;
  } catch {
    return code;
  }
};
const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐';

// Referring hosts grouped into the names people know.
function sourceName(host: string | null): string {
  if (!host) return 'Direct / unknown';
  if (/(^|\.)google\./.test(host)) return 'Google';
  if (/instagram\.com$/.test(host)) return 'Instagram';
  if (/(facebook\.com|fb\.me)$/.test(host)) return 'Facebook';
  if (/(^|\.)(t\.me|telegram\.org|web\.telegram\.org)$/.test(host)) return 'Telegram';
  if (/(whatsapp\.com|wa\.me)$/.test(host)) return 'WhatsApp';
  if (/(youtube\.com|youtu\.be)$/.test(host)) return 'YouTube';
  if (/bing\.com$/.test(host)) return 'Bing';
  if (/yandex\./.test(host)) return 'Yandex';
  if (/tripadvisor\./.test(host)) return 'Tripadvisor';
  if (/(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google)/.test(host)) return 'AI search (ChatGPT etc.)';
  return host;
}

const DEVICE_LABEL: Record<string, string> = { MOBILE: 'Telefon', DESKTOP: 'Kompyuter', TABLET: 'Planshet' };

type Row = { label: string; count: number; sub?: string };

function tally(values: (string | null)[], labelOf: (v: string | null) => string): Row[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = labelOf(v);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function BarList({ title, rows, total, limit = 10 }: { title: string; rows: Row[]; total: number; limit?: number }) {
  return (
    <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8F7E73] mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-[#A8988E]">{"Hali ma'lumot yo'q"}</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, limit).map((r) => (
            <li key={r.label} className="relative">
              <div
                className="absolute inset-y-0 left-0 bg-[#BA4E25]/10 rounded-[2px]"
                style={{ width: `${Math.max(2, (r.count / (rows[0]?.count || 1)) * 100)}%` }}
              />
              <div className="relative flex items-center justify-between gap-3 px-2 py-1.5 text-xs">
                <span className="text-[#281C18] truncate" title={r.sub || r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold text-[#554740]">
                  {r.count}
                  <span className="ml-1.5 font-normal text-[#A8988E]">{Math.round((r.count / (total || 1)) * 100)}%</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Where visitors come from and what they look at, from the site's own
// anonymous page-view log (independent of Google Analytics and the cookie
// banner, so it counts everyone).
export default async function AdminVisitorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = PERIODS.some((p) => String(p.days) === daysParam) ? Number(daysParam) : 30;

  const since = new Date();
  if (days === 1) since.setHours(0, 0, 0, 0);
  else since.setDate(since.getDate() - days);

  const visits = await prisma.siteVisit.findMany({
    where: { created_at: { gte: since } },
    select: { path: true, country: true, city: true, referrer: true, device: true, lang: true, visitor: true, created_at: true },
    orderBy: { created_at: 'asc' },
    take: 200_000,
  });

  const total = visits.length;
  const tracked = visits.filter((v) => v.visitor);
  const uniqueVisitors = new Set(tracked.map((v) => v.visitor)).size;
  const countries = new Set(tracked.map((v) => v.country).filter(Boolean)).size;

  // Painting pages show their title instead of an id.
  const paintingIds = [
    ...new Set(
      visits
        .map((v) => splitLangPath(v.path).path.match(/^\/gallery\/([^/?#]+)$/)?.[1])
        .filter((id): id is string => !!id)
    ),
  ];
  const paintings = paintingIds.length
    ? await prisma.painting.findMany({ where: { id: { in: paintingIds } }, select: { id: true, title_en: true } })
    : [];
  const titleById = new Map(paintings.map((p) => [p.id, p.title_en]));
  const pageLabel = (raw: string | null) => {
    const path = splitLangPath(raw || '/').path;
    const id = path.match(/^\/gallery\/([^/?#]+)$/)?.[1];
    if (id) return `🖼 ${titleById.get(id) || id}`;
    return path;
  };

  const byCountry = tally(tracked.map((v) => v.country), (c) => (c ? `${flag(c)}  ${countryName(c)}` : '🌐  Unknown'));
  const byCity = tally(
    tracked.filter((v) => v.city).map((v) => `${v.city}${v.country ? `, ${v.country}` : ''}`),
    (c) => c || ''
  );
  const byPage = tally(visits.map((v) => v.path), pageLabel);
  // Only the landing page carries the referrer, so count each visitor once
  // by their first page view (rows are in time order).
  const landing = new Map<string, string | null>();
  for (const v of tracked) if (!landing.has(v.visitor!)) landing.set(v.visitor!, v.referrer);
  const bySource = tally([...landing.values()], sourceName);
  const byDevice = tally(tracked.map((v) => v.device), (d) => (d ? DEVICE_LABEL[d] || d : 'Unknown'));
  const byLang = tally(tracked.map((v) => v.lang), (l) => (l ? l.toUpperCase() : 'Unknown'));

  // Views per day (or per hour for "today").
  const buckets = new Map<string, number>();
  const bucketKey = (d: Date) =>
    days === 1 ? `${String(d.getHours()).padStart(2, '0')}:00` : d.toISOString().slice(5, 10);
  if (days === 1) {
    for (let h = 0; h <= new Date().getHours(); h++) buckets.set(`${String(h).padStart(2, '0')}:00`, 0);
  } else {
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) buckets.set(bucketKey(d), 0);
  }
  for (const v of visits) {
    const k = bucketKey(new Date(v.created_at));
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const series = [...buckets.entries()];
  const peak = Math.max(1, ...series.map(([, n]) => n));

  const stats = [
    { label: "Sahifa ko'rishlar", value: total },
    { label: 'Tashrif buyuruvchilar', value: uniqueVisitors },
    { label: 'Davlatlar', value: countries },
    { label: "Bir kishiga sahifa", value: uniqueVisitors ? (tracked.length / uniqueVisitors).toFixed(1) : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">Visitors</h2>
          <p className="text-xs text-[#726861] mt-0.5">
            Saytga kimlar, qayerdan va qanday kirgani — anonim, cookie va IP saqlanmaydi
          </p>
        </div>
        <div className="flex bg-white border border-[#E7E0D8] rounded-[3px] p-0.5 text-xs font-semibold">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/admin/visitors?days=${p.days}`}
              className={`px-3 py-1.5 rounded-[2px] ${
                p.days === days ? 'bg-[#BA4E25] text-white' : 'text-[#6B5E55] hover:text-[#281C18]'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5">
            <p className="text-[11px] uppercase tracking-wider text-[#8F7E73] font-semibold">{s.label}</p>
            <p className="font-serif text-3xl font-semibold text-[#281C18] mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8F7E73] mb-4">
          {days === 1 ? "Soatlar bo'yicha" : "Kunlar bo'yicha"}
        </h3>
        <div className="flex items-end gap-[3px] h-40">
          {series.map(([label, n]) => (
            <div key={label} className="flex-1 h-full flex flex-col justify-end group relative min-w-0">
              <div
                className="bg-[#BA4E25]/70 group-hover:bg-[#BA4E25] rounded-t-[2px] transition-colors"
                style={{ height: `${(n / peak) * 100}%`, minHeight: n ? 2 : 0 }}
              />
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap text-[10px] bg-[#281C18] text-white px-1.5 py-0.5 rounded">
                {label}: {n}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#A8988E] mt-1.5">
          <span>{series[0]?.[0]}</span>
          <span>{series[series.length - 1]?.[0]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarList title="Davlatlar" rows={byCountry} total={tracked.length} limit={15} />
        <BarList title="Qayerdan kelgan (manba)" rows={bySource} total={landing.size} />
        <BarList title="Eng ko'p ko'rilgan sahifalar" rows={byPage} total={total} limit={15} />
        <BarList title="Shaharlar" rows={byCity} total={tracked.length} limit={15} />
        <BarList title="Qurilma" rows={byDevice} total={tracked.length} />
        <BarList title="Til" rows={byLang} total={tracked.length} />
      </div>

      {total > tracked.length && (
        <p className="text-[11px] text-[#A8988E]">
          {total - tracked.length} ta eski yozuvda faqat sahifa manzili bor (davlat/manba kuzatilishidan oldin).
        </p>
      )}
    </div>
  );
}
