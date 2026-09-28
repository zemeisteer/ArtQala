'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { VISITOR_PERIODS } from './visitorPeriods';

export type VisitorRow = { key: string; count: number };

interface Props {
  days: number;
  totals: { pageViews: number; tracked: number; visitors: number; countries: number; landings: number };
  countries: VisitorRow[];
  sources: VisitorRow[];
  cities: VisitorRow[];
  pages: VisitorRow[];
  devices: VisitorRow[];
  langs: VisitorRow[];
  paintingTitles: Record<string, { en: string; ru: string; uz: string }>;
}

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐';

function BarList({ title, rows, total, emptyText }: { title: string; rows: { label: string; count: number }[]; total: number; emptyText: string }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8F7E73] mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-[#A8988E]">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 6).map((r) => (
            <li key={r.label} className="relative">
              <div
                className="absolute inset-y-0 left-0 bg-[#BA4E25]/10 rounded-[2px]"
                style={{ width: `${Math.max(2, (r.count / (rows[0]?.count || 1)) * 100)}%` }}
              />
              <div className="relative flex items-center justify-between gap-3 px-2 py-1 text-xs">
                <span className="text-[#281C18] truncate" title={r.label}>
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

export default function VisitorStatsView(props: Props) {
  const { t, lang } = useApp();
  const a = t.admin;
  const { days, totals } = props;

  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    regionNames = null;
  }
  const countryLabel = (code: string) => {
    if (!code) return `🌐  ${a.unknown}`;
    let name = code;
    try {
      name = regionNames?.of(code) || code;
    } catch {}
    return `${flag(code)}  ${name}`;
  };

  const deviceLabel: Record<string, string> = { MOBILE: a.deviceMobile, DESKTOP: a.deviceDesktop, TABLET: a.deviceTablet };
  const sourceLabel = (key: string) => (key === '__direct' ? a.sourceDirect : key === '__ai' ? a.sourceAi : key);
  const pageLabel = (path: string) => {
    const id = path.match(/^\/gallery\/([^/?#]+)$/)?.[1];
    if (!id) return path;
    const titles = props.paintingTitles[id];
    return `🖼 ${titles ? titles[lang] || titles.en : id}`;
  };

  const label = (rows: { key: string; count: number }[], fn: (key: string) => string) =>
    rows.map((r) => ({ label: fn(r.key), count: r.count }));

  return (
    <section id="visitors" className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 shadow-xs scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#F0EAE1]">
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#281C18]">{a.visitorsTitle}</h2>
          <p className="text-xs text-[#726861] mt-0.5">
            <strong className="text-[#281C18]">{totals.visitors}</strong> {a.people} ·{' '}
            <strong className="text-[#281C18]">{totals.countries}</strong> {a.countriesWord} ·{' '}
            <strong className="text-[#281C18]">{totals.pageViews}</strong> {a.pageViewsWord}
          </p>
        </div>
        <div className="flex bg-white border border-[#E7E0D8] rounded-[3px] p-0.5 text-xs font-semibold">
          {VISITOR_PERIODS.map((d) => (
            <Link
              key={d}
              href={`/admin?vdays=${d}#visitors`}
              scroll={false}
              className={`px-3 py-1.5 rounded-[2px] ${
                d === days ? 'bg-[#BA4E25] text-white' : 'text-[#6B5E55] hover:text-[#281C18]'
              }`}
            >
              {d === 1 ? a.periodToday : a.periodDays.replace('{n}', String(d))}
            </Link>
          ))}
        </div>
      </div>

      {/* items-start: each list only as tall as its own rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6 items-start">
        <BarList title={a.visitorCountries} rows={label(props.countries, countryLabel)} total={totals.tracked} emptyText={a.noDataYet} />
        <BarList title={a.visitorSources} rows={label(props.sources, sourceLabel)} total={totals.landings} emptyText={a.noDataYet} />
        <BarList title={a.visitorCities} rows={label(props.cities, (c) => c)} total={totals.tracked} emptyText={a.noDataYet} />
        <BarList title={a.visitorPages} rows={label(props.pages, pageLabel)} total={totals.pageViews} emptyText={a.noDataYet} />
        <BarList
          title={a.visitorDevices}
          rows={label(props.devices, (d) => deviceLabel[d] || a.unknown)}
          total={totals.tracked}
          emptyText={a.noDataYet}
        />
        <BarList
          title={a.visitorLanguages}
          rows={label(props.langs, (l) => (l ? l.toUpperCase() : a.unknown))}
          total={totals.tracked}
          emptyText={a.noDataYet}
        />
      </div>
    </section>
  );
}
