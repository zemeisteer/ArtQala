import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { splitLangPath } from '@/lib/i18n/routing';

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

function BarList({ title, rows, total, limit = 6 }: { title: string; rows: Row[]; total: number; limit?: number }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8F7E73] mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-[#A8988E]">{"Hali ma'lumot yo'q"}</p>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, limit).map((r) => (
            <li key={r.label} className="relative">
              <div
                className="absolute inset-y-0 left-0 bg-[#BA4E25]/10 rounded-[2px]"
                style={{ width: `${Math.max(2, (r.count / (rows[0]?.count || 1)) * 100)}%` }}
              />
              <div className="relative flex items-center justify-between gap-3 px-2 py-1 text-xs">
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

// Dashboard section: where visitors come from and what they look at, from
// the site's own anonymous page-view log (independent of Google Analytics
// and the cookie banner, so it counts everyone). The daily visits chart is
// already on the dashboard above, so this shows only the breakdowns.
export default async function VisitorStats({ daysParam }: { daysParam?: string }) {
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

  return (
    <section id="visitors" className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#F0EAE1]">
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#281C18]">Tashrifchilar</h2>
          <p className="text-xs text-[#726861] mt-0.5">
            <strong className="text-[#281C18]">{uniqueVisitors}</strong> kishi ·{' '}
            <strong className="text-[#281C18]">{countries}</strong> davlat ·{' '}
            <strong className="text-[#281C18]">{total}</strong> sahifa ko&apos;rish
          </p>
        </div>
        <div className="flex bg-white border border-[#E7E0D8] rounded-[3px] p-0.5 text-xs font-semibold">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={`/admin?vdays=${p.days}#visitors`}
              scroll={false}
              className={`px-3 py-1.5 rounded-[2px] ${
                p.days === days ? 'bg-[#BA4E25] text-white' : 'text-[#6B5E55] hover:text-[#281C18]'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* items-start: each list only as tall as its own rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6 items-start">
        <BarList title="Davlatlar" rows={byCountry} total={tracked.length} />
        <BarList title="Qayerdan kelgan" rows={bySource} total={landing.size} />
        <BarList title="Shaharlar" rows={byCity} total={tracked.length} />
        <BarList title="Eng ko'p ko'rilgan sahifalar" rows={byPage} total={total} />
        <BarList title="Qurilma" rows={byDevice} total={tracked.length} />
        <BarList title="Til" rows={byLang} total={tracked.length} />
      </div>
    </section>
  );
}
