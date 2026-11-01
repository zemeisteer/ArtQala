import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SETTINGS_TAG } from '@/lib/publicCache';

export const dynamic = 'force-dynamic';

// UZS per 1 unit of each currency.
type Uzs = { usd: number; eur: number; rub: number; krw: number; jpy: number; cny: number };
// Used only when cbu.uz is down and nothing better is stored.
const FALLBACK_UZS = { krw: 9.3, jpy: 84, cny: 1780 };

// Rates = units of each currency per 1 USD, with the Settings safety margin
// added to every non-USD currency (rounding up happens in formatPrice).
const body = (source: string, r: Uzs, marginPct: number) => {
  const k = 1 + Math.max(0, Math.min(marginPct, 30)) / 100;
  const per = (uzs: number) => +((r.usd / uzs) * k).toFixed(6);
  return {
    source,
    margin: marginPct,
    rates: {
      USD: 1,
      UZS: +(r.usd * k).toFixed(2),
      EUR: per(r.eur),
      RUB: per(r.rub),
      KRW: per(r.krw),
      JPY: per(r.jpy),
      CNY: per(r.cny),
    },
    raw_uzs: { USD: r.usd, EUR: r.eur, RUB: r.rub, KRW: r.krw, JPY: r.jpy, CNY: r.cny },
  };
};

// Every public page view asks for exchange rates. Worked out at most once
// an hour on the server (and again as soon as Settings change) instead of on
// every request — reading, and writing, the database each time kept the
// free Neon database awake all day.
const computeRates = unstable_cache(
  async () => {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const stored: Uzs = {
      usd: settings?.rate_usd || 12850,
      eur: settings?.rate_eur || 13900,
      rub: settings?.rate_rub || 140,
      ...FALLBACK_UZS,
    };
    const margin = settings?.fx_margin ?? 3;

    // Manual rates set in Admin → Settings win (KRW/JPY/CNY still from cbu.uz below when reachable).
    const manual = !!settings?.manual_rates;

    // Official Central Bank of Uzbekistan (cbu.uz) rates, fast timeout.
    try {
      const cbuRes = await fetch('https://cbu.uz/oz/arkhiv-kursov-valyut/json/', {
        signal: AbortSignal.timeout(1500),
      });
      if (cbuRes.ok) {
        const cbuData = (await cbuRes.json()) as { Ccy: string; Rate: string; Nominal?: string }[];
        const live: Uzs = { ...stored };
        // Some currencies are quoted per 10/100 units ("Nominal").
        const perUnit = (item: { Rate: string; Nominal?: string }) => parseFloat(item.Rate) / (parseFloat(item.Nominal || '1') || 1);
        for (const item of cbuData) {
          const v = perUnit(item);
          if (!(v > 0)) continue;
          if (item.Ccy === 'USD') live.usd = v;
          if (item.Ccy === 'EUR') live.eur = v;
          if (item.Ccy === 'RUB') live.rub = v;
          if (item.Ccy === 'KRW') live.krw = v;
          if (item.Ccy === 'JPY') live.jpy = v;
          if (item.Ccy === 'CNY') live.cny = v;
        }
        if (manual) return body('manual', { ...live, usd: stored.usd, eur: stored.eur, rub: stored.rub }, margin);
        // Kept as the fallback for when cbu.uz is down — only written when
        // the rate actually changed.
        if (live.usd !== settings?.rate_usd || live.eur !== settings?.rate_eur || live.rub !== settings?.rate_rub) {
          await prisma.siteSettings
            .upsert({
              where: { id: 'default' },
              update: { rate_usd: live.usd, rate_eur: live.eur, rate_rub: live.rub },
              create: { id: 'default', rate_usd: live.usd, rate_eur: live.eur, rate_rub: live.rub },
            })
            .catch(() => null);
        }
        return body('cbu.uz', live, margin);
      }
    } catch (e) {
      console.warn('CBU API unreachable, using database settings fallback:', e);
    }
    return body(manual ? 'manual' : 'fallback', stored, margin);
  },
  ['fx-rates'],
  { tags: [SETTINGS_TAG], revalidate: 3600 }
);

export async function GET() {
  try {
    return NextResponse.json(await computeRates());
  } catch {
    return NextResponse.json(body('default', { usd: 12850, eur: 13900, rub: 140, ...FALLBACK_UZS }, 3), { status: 200 });
  }
}
