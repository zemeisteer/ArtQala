'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getCountries, type CountryCode } from 'libphonenumber-js';
import { useApp } from '@/context/AppContext';
import {
  estimateShipping,
  estimatePaintingWeightKg,
  POSILKA_RATES_UZS,
  EMS_ZONE_BY_COUNTRY,
  DOMESTIC_COUNTRY,
} from '@/lib/shipping';
import { Truck, Info } from 'lucide-react';
import FilterSelect from '@/components/FilterSelect';

interface ShippingEstimatorProps {
  sizeString: string;
}

function parseSizeToCm(sizeString: string): { widthCm: number; heightCm: number } | null {
  const match = sizeString.match(/(\d+(?:\.\d+)?)\s*[×x*X]\s*(\d+(?:\.\d+)?)(?:\s*(sm|cm|in|dyum))?/i);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  const unit = (match[3] || 'sm').toLowerCase();
  const isInches = unit === 'in' || unit === 'dyum';
  return {
    widthCm: isInches ? w * 2.54 : w,
    heightCm: isInches ? h * 2.54 : h,
  };
}

const isSupported = (c: string) =>
  c === DOMESTIC_COUNTRY || !!POSILKA_RATES_UZS[c] || !!EMS_ZONE_BY_COUNTRY[c];

// The visitor's own country when we have a tariff for it — "uz"/"uz-UZ"
// browsers used to land on Uzbekistan, which had no tariff, and see
// "not available" before picking anything. Otherwise Uzbekistan itself.
function guessDefaultCountry(): CountryCode {
  try {
    const locale = navigator.language || '';
    const region = locale.split('-')[1]?.toUpperCase();
    if (region && isSupported(region)) return region as CountryCode;
    if (/^ru\b/i.test(locale) && isSupported('RU')) return 'RU' as CountryCode;
  } catch {}
  return DOMESTIC_COUNTRY as CountryCode;
}

const countryDisplayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

export default function ShippingEstimator({ sizeString }: ShippingEstimatorProps) {
  const { t, settings } = useApp();
  const countries = useMemo(
    () => {
      const list = getCountries().filter((c) => c !== DOMESTIC_COUNTRY && isSupported(c));
      list.sort((a, b) => (countryDisplayNames?.of(a) || a).localeCompare(countryDisplayNames?.of(b) || b));
      return [DOMESTIC_COUNTRY as CountryCode, ...list];
    },
    []
  );
  // Picked after mount — navigator isn't available during server rendering,
  // and reading it in the initial state caused a hydration mismatch.
  const [country, setCountry] = useState<CountryCode>(DOMESTIC_COUNTRY as CountryCode);
  useEffect(() => {
    // Browser-only value, deliberately applied after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountry(guessDefaultCountry());
  }, []);

  const parsedSize = parseSizeToCm(sizeString);
  const somPerUsd = settings?.rate_usd;

  if (!parsedSize || !somPerUsd) return null;

  const weightKg = estimatePaintingWeightKg(parsedSize.widthCm, parsedSize.heightCm);
  const estimate = estimateShipping(country, weightKg, somPerUsd);

  return (
    <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-[#BA4E25]" />
        <h4 className="text-xs font-bold tracking-wider text-[#6B5E55] uppercase">
          {t.shippingEstimator.title}
        </h4>
      </div>

      <div>
        <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
          {t.shippingEstimator.selectCountry}
        </label>
        <FilterSelect
          value={country}
          onChange={(v) => setCountry(v as CountryCode)}
          searchable
          buttonClassName="!rounded-[2px] !py-2"
          options={countries.map((c) => ({
            value: c,
            label: countryDisplayNames ? countryDisplayNames.of(c) || c : c,
          }))}
        />
      </div>

      {estimate.posilka || estimate.ems ? (
        <div className="space-y-2">
          {estimate.posilka && (
            <div className="flex items-center justify-between text-xs bg-white border border-[#E7E0D8] rounded-[2px] px-3 py-2">
              <span className="font-semibold text-[#281C18]">{t.shippingEstimator.posilkaLabel}</span>
              <span className="text-[#554740]">
                ${estimate.posilka.priceUsd} · {estimate.posilka.estimatedDays} {t.shippingEstimator.daysUnit}
              </span>
            </div>
          )}
          {estimate.ems && (
            <div className="flex items-center justify-between text-xs bg-white border border-[#E7E0D8] rounded-[2px] px-3 py-2">
              <span className="font-semibold text-[#281C18]">{t.shippingEstimator.emsLabel}</span>
              <span className="text-[#554740]">
                ${estimate.ems.priceUsd} · {estimate.ems.estimatedDays} {t.shippingEstimator.daysUnit}
              </span>
            </div>
          )}
          <p className="text-[10.5px] text-[#8F8178] flex items-start gap-1 pt-1">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{t.shippingEstimator.refundNote}</span>
          </p>
          <p className="text-[10px] text-[#A8988E]">{t.shippingEstimator.disclaimer}</p>
        </div>
      ) : (
        <p className="text-xs text-[#8F8178]">{t.shippingEstimator.notAvailable}</p>
      )}
    </div>
  );
}
