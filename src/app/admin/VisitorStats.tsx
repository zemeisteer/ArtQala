import React from 'react';
import { prisma } from '@/lib/prisma';
import { splitLangPath } from '@/lib/i18n/routing';
import VisitorStatsView, { type VisitorRow } from './VisitorStatsView';
import { VISITOR_PERIODS } from './visitorPeriods';

// Referring hosts grouped into the names people know. '__direct' and '__ai'
// are translated in the view.
function sourceKey(host: string | null): string {
  if (!host) return '__direct';
  if (/(^|\.)google\./.test(host)) return 'Google';
  if (/instagram\.com$/.test(host)) return 'Instagram';
  if (/(facebook\.com|fb\.me)$/.test(host)) return 'Facebook';
  if (/(^|\.)(t\.me|telegram\.org|web\.telegram\.org)$/.test(host)) return 'Telegram';
  if (/(whatsapp\.com|wa\.me)$/.test(host)) return 'WhatsApp';
  if (/(youtube\.com|youtu\.be)$/.test(host)) return 'YouTube';
  if (/bing\.com$/.test(host)) return 'Bing';
  if (/yandex\./.test(host)) return 'Yandex';
  if (/tripadvisor\./.test(host)) return 'Tripadvisor';
  if (/(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google)/.test(host)) return '__ai';
  return host;
}

function tally(values: (string | null)[]): VisitorRow[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v ?? '', (map.get(v ?? '') || 0) + 1);
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

// Dashboard section: where visitors come from and what they look at, from
// the site's own anonymous page-view log (independent of Google Analytics
// and the cookie banner, so it counts everyone). Gathers the numbers here on
// the server; VisitorStatsView renders them in the admin's chosen language.
export default async function VisitorStats({ daysParam }: { daysParam?: string }) {
  const days = VISITOR_PERIODS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const since = new Date();
  if (days === 1) since.setHours(0, 0, 0, 0);
  else since.setDate(since.getDate() - days);

  const visits = await prisma.siteVisit.findMany({
    where: { created_at: { gte: since } },
    select: { path: true, country: true, city: true, referrer: true, device: true, lang: true, visitor: true },
    orderBy: { created_at: 'asc' },
    take: 200_000,
  });

  const tracked = visits.filter((v) => v.visitor);
  const pathOf = (raw: string) => splitLangPath(raw || '/').path;

  // Painting pages show their title instead of an id.
  const paintingIds = [
    ...new Set(
      visits.map((v) => pathOf(v.path).match(/^\/gallery\/([^/?#]+)$/)?.[1]).filter((id): id is string => !!id)
    ),
  ];
  const paintings = paintingIds.length
    ? await prisma.painting.findMany({
        where: { id: { in: paintingIds } },
        select: { id: true, title_en: true, title_ru: true, title_uz: true },
      })
    : [];

  // Only the landing page carries the referrer, so count each visitor once
  // by their first page view (rows are in time order).
  const landing = new Map<string, string | null>();
  for (const v of tracked) if (!landing.has(v.visitor!)) landing.set(v.visitor!, v.referrer);

  return (
    <VisitorStatsView
      days={days}
      totals={{
        pageViews: visits.length,
        tracked: tracked.length,
        visitors: new Set(tracked.map((v) => v.visitor)).size,
        countries: new Set(tracked.map((v) => v.country).filter(Boolean)).size,
        landings: landing.size,
      }}
      countries={tally(tracked.map((v) => v.country))}
      sources={tally([...landing.values()].map(sourceKey))}
      cities={tally(tracked.filter((v) => v.city).map((v) => `${v.city}${v.country ? `, ${v.country}` : ''}`))}
      pages={tally(visits.map((v) => pathOf(v.path)))}
      devices={tally(tracked.map((v) => v.device))}
      langs={tally(tracked.map((v) => v.lang))}
      paintingTitles={Object.fromEntries(paintings.map((p) => [p.id, { en: p.title_en, ru: p.title_ru, uz: p.title_uz }]))}
    />
  );
}
