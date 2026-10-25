import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SETTINGS_TAG } from '@/lib/publicCache';

export const dynamic = 'force-dynamic';

type Uzs = { usd: number; eur: number; rub: number };

const body = (source: string, r: Uzs) => ({
  source,
  rates: {
    USD: 1,
    UZS: r.usd,
    EUR: +(r.usd / r.eur).toFixed(4),
    RUB: +(r.usd / r.rub).toFixed(2),
  },
  raw_uzs: { USD: r.usd, EUR: r.eur, RUB: r.rub },
});

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
    };

    // Manual rates set in Admin → Settings win.
    if (settings?.manual_rates) return body('manual', stored);

    // Official Central Bank of Uzbekistan (cbu.uz) rates, fast timeout.
    try {
      const cbuRes = await fetch('https://cbu.uz/oz/arkhiv-kursov-valyut/json/', {
        signal: AbortSignal.timeout(1500),
      });
      if (cbuRes.ok) {
        const cbuData = (await cbuRes.json()) as { Ccy: string; Rate: string }[];
        const live = { ...stored, usd: 12850, eur: 13900, rub: 140 };
        for (const item of cbuData) {
          if (item.Ccy === 'USD') live.usd = parseFloat(item.Rate);
          if (item.Ccy === 'EUR') live.eur = parseFloat(item.Rate);
          if (item.Ccy === 'RUB') live.rub = parseFloat(item.Rate);
        }
        // Kept as the fallback for when cbu.uz is down — only written when
        // the rate actually changed.
        if (live.usd !== stored.usd || live.eur !== stored.eur || live.rub !== stored.rub) {
          await prisma.siteSettings
            .upsert({
              where: { id: 'default' },
              update: { rate_usd: live.usd, rate_eur: live.eur, rate_rub: live.rub },
              create: { id: 'default', rate_usd: live.usd, rate_eur: live.eur, rate_rub: live.rub },
            })
            .catch(() => null);
        }
        return body('cbu.uz', live);
      }
    } catch (e) {
      console.warn('CBU API unreachable, using database settings fallback:', e);
    }
    return body('fallback', stored);
  },
  ['fx-rates'],
  { tags: [SETTINGS_TAG], revalidate: 3600 }
);

export async function GET() {
  try {
    return NextResponse.json(await computeRates());
  } catch {
    return NextResponse.json(body('default', { usd: 12850, eur: 13900, rub: 140 }), { status: 200 });
  }
}
