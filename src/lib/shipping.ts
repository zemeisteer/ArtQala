/**
 * Shipping cost estimator based on UzPost's official published tariff tables
 * (uz.post -> Tariflar, served from new.pochta.uz/api/v1/public/menu-item-pages/<id>/):
 *   - Domestic (Uzbekistan): posilka = per-piece fee + per-kg fee (page 29),
 *     EMS = weight-bracket table with delivery (page 64).
 *   - CIS countries (MDH davlatlari): posilka, air transport — ground-only
 *     for Turkmenistan (page 38, "2.6. Posilkalar").
 * And for "distant foreign countries" (Uzoq xorijiy davlatlar), air transport:
 *   - Posilka (standard parcel): flat rate per country for the first kg,
 *     plus a per-kg rate for each additional kg. Source: uz.post/uz/menu/16
 *     -> "Xalqaro xizmatlar (Uzoq xorijiy davlatlar)" -> "3.6. Posilkalar".
 *   - EMS (express): countries are grouped into 6 zones, each zone has its
 *     own weight-bracket price table. Source: same menu -> "EMS: Xalqaro
 *     tezkor pochta" (Posilkalar rows 2.1-2.33).
 * All source figures are in UZS. Fetched and transcribed 2026-09-11,
 * re-verified against the live tables 2026-09-24 (EMS zones and brackets
 * matched; Israel's per-kg posilka rate was corrected, CIS and domestic
 * tables were added).
 */

export type CountryCode2 = string;

// ---- Posilka: country -> { first kg, each additional kg }, in UZS ----
export const POSILKA_RATES_UZS: Record<CountryCode2, { base: number; perKg: number }> = {
  // Europe
  AT: { base: 377000, perKg: 88000 },
  AL: { base: 390000, perKg: 119000 },
  BE: { base: 471000, perKg: 94000 },
  BG: { base: 346000, perKg: 117000 },
  BA: { base: 397000, perKg: 122000 },
  GB: { base: 554000, perKg: 132000 },
  HU: { base: 412000, perKg: 100000 },
  DE: { base: 540000, perKg: 94000 },
  GR: { base: 347000, perKg: 99000 },
  DK: { base: 401000, perKg: 88000 },
  IE: { base: 348000, perKg: 100000 },
  IS: { base: 485000, perKg: 103000 },
  ES: { base: 438000, perKg: 127000 },
  IT: { base: 364000, perKg: 92000 },
  CY: { base: 406000, perKg: 125000 },
  LV: { base: 271000, perKg: 80000 },
  LT: { base: 380000, perKg: 104000 },
  LU: { base: 400000, perKg: 112000 },
  MK: { base: 379000, perKg: 129000 },
  MT: { base: 425000, perKg: 137000 },
  NL: { base: 370000, perKg: 92000 },
  NO: { base: 522000, perKg: 101000 },
  PL: { base: 441000, perKg: 125000 },
  PT: { base: 429000, perKg: 110000 },
  RO: { base: 576000, perKg: 160000 },
  RS: { base: 439000, perKg: 106000 },
  SI: { base: 335000, perKg: 111000 },
  SK: { base: 356000, perKg: 118000 },
  TR: { base: 249000, perKg: 83000 },
  FI: { base: 475000, perKg: 93000 },
  FR: { base: 421000, perKg: 95000 },
  HR: { base: 309000, perKg: 96000 },
  CZ: { base: 301000, perKg: 90000 },
  SE: { base: 484000, perKg: 95000 },
  CH: { base: 355000, perKg: 91000 },
  EE: { base: 392000, perKg: 114000 },
  // Asia
  AF: { base: 447000, perKg: 113000 },
  BD: { base: 296000, perKg: 103000 },
  BH: { base: 276000, perKg: 79000 },
  VN: { base: 293000, perKg: 108000 },
  HK: { base: 425000, perKg: 92000 },
  ID: { base: 372000, perKg: 115000 },
  IR: { base: 497000, perKg: 122000 },
  IN: { base: 333000, perKg: 60000 },
  JO: { base: 305000, perKg: 96000 },
  IL: { base: 333000, perKg: 71000 },
  QA: { base: 242000, perKg: 57000 },
  KW: { base: 266000, perKg: 82000 },
  CN: { base: 333000, perKg: 103000 },
  KR: { base: 351000, perKg: 95000 },
  LB: { base: 320000, perKg: 102000 },
  MN: { base: 422000, perKg: 150000 },
  MY: { base: 355000, perKg: 110000 },
  NP: { base: 289000, perKg: 110000 },
  AE: { base: 228000, perKg: 52000 },
  OM: { base: 412000, perKg: 162000 },
  PK: { base: 303000, perKg: 94000 },
  SA: { base: 272000, perKg: 89000 },
  SG: { base: 325000, perKg: 90000 },
  TH: { base: 308000, perKg: 92000 },
  TW: { base: 532000, perKg: 120000 },
  PH: { base: 258000, perKg: 93000 },
  LK: { base: 314000, perKg: 110000 },
  JP: { base: 373000, perKg: 111000 },
  // Americas
  AR: { base: 625000, perKg: 279000 },
  BR: { base: 647000, perKg: 259000 },
  CA: { base: 546000, perKg: 210000 },
  CO: { base: 543000, perKg: 237000 },
  MX: { base: 497000, perKg: 229000 },
  CL: { base: 742000, perKg: 338000 },
  US: { base: 529000, perKg: 229000 },
  // Africa
  DZ: { base: 366000, perKg: 128000 },
  EG: { base: 377000, perKg: 125000 },
  KE: { base: 322000, perKg: 94000 },
  TN: { base: 423000, perKg: 119000 },
  ZA: { base: 457000, perKg: 145000 },
  // Australia
  AU: { base: 526000, perKg: 223000 },
  NZ: { base: 540000, perKg: 208000 },
  // CIS (air transport; Turkmenistan only has a ground rate)
  AZ: { base: 276000, perKg: 54000 },
  AM: { base: 374000, perKg: 91000 },
  BY: { base: 419000, perKg: 96000 },
  GE: { base: 379000, perKg: 74000 },
  KZ: { base: 433000, perKg: 94000 },
  KG: { base: 199000, perKg: 33000 },
  MD: { base: 427000, perKg: 149000 },
  RU: { base: 521000, perKg: 114000 },
  TJ: { base: 196000, perKg: 34000 },
  TM: { base: 216000, perKg: 47000 },
  UA: { base: 505000, perKg: 124000 },
};

const CIS_COUNTRIES = new Set(['AZ', 'AM', 'BY', 'GE', 'KZ', 'KG', 'MD', 'RU', 'TJ', 'TM', 'UA']);

export const DOMESTIC_COUNTRY = 'UZ';

// Domestic posilka (ground, to the post office): per piece + per kg.
const DOMESTIC_POSILKA_UZS = { perPiece: 15000, perKg: 9000 };

// Domestic EMS with door delivery, "ПОСЫЛКИ" rows 2.1-2.21 (up to 20 kg).
const DOMESTIC_EMS_BRACKETS_UZS: { maxKg: number; price: number }[] = [
  { maxKg: 1, price: 54000 },
  { maxKg: 2, price: 62000 },
  { maxKg: 3, price: 68000 },
  { maxKg: 4, price: 75000 },
  { maxKg: 5, price: 81000 },
  { maxKg: 6, price: 86000 },
  { maxKg: 7, price: 93000 },
  { maxKg: 8, price: 99000 },
  { maxKg: 9, price: 105000 },
  { maxKg: 10, price: 110000 },
  { maxKg: 11, price: 118000 },
  { maxKg: 12, price: 124000 },
  { maxKg: 13, price: 130000 },
  { maxKg: 14, price: 137000 },
  { maxKg: 15, price: 143000 },
  { maxKg: 16, price: 155000 },
  { maxKg: 17, price: 161000 },
  { maxKg: 18, price: 167000 },
  { maxKg: 19, price: 174000 },
  { maxKg: 20, price: 177000 },
];

// UzPost rounds a partial kilogram *down* when it's at most 100 g over
// (6.1 kg is charged as 6 kg, 6.11 kg as 7 kg).
function chargeableKg(weightKg: number): number {
  const whole = Math.floor(weightKg);
  return weightKg - whole <= 0.1 + 1e-9 ? Math.max(1, whole) : whole + 1;
}

// ---- EMS: country -> zone (1-6) ----
export const EMS_ZONE_BY_COUNTRY: Record<CountryCode2, 1 | 2 | 3 | 4 | 5 | 6> = {
  AU: 5, ID: 3, PG: 6, AT: 3, IS: 3, PY: 6, AZ: 1, IR: 3, PE: 6,
  DZ: 4, IE: 3, PL: 3, GB: 3, ES: 3, PT: 3, AO: 6, IT: 3, RE: 6,
  AD: 6, YE: 6, RU: 3, AG: 6, KY: 6, RW: 6, KZ: 1, RO: 3,
  AR: 5, CM: 6, SV: 6, AM: 2, CA: 5, SA: 6, AW: 6, QA: 6, SZ: 6,
  BS: 6, KE: 6, SC: 6, BD: 5, CY: 3, SN: 6, BB: 6, CN: 4, VC: 6,
  BH: 4, CO: 6, KN: 6, BY: 1, CG: 6, LC: 5, BZ: 6, KR: 2, SG: 3,
  BE: 3, CR: 6, SY: 3, BJ: 6, CI: 6, SK: 3, BM: 6, CU: 6, SI: 3,
  BG: 3, KW: 4, SB: 6, BO: 6, KG: 1, SO: 6, BW: 6, LA: 5, SD: 6,
  BR: 5, LV: 2, SR: 6, BN: 6, LS: 6, SL: 6, BF: 6, LR: 6, US: 6,
  BI: 6, LB: 6, TJ: 1, VU: 6, LT: 2, TW: 3, LI: 3, TH: 3,
  HU: 3, LU: 3, TZ: 6, VE: 5, MU: 6, TC: 6, VN: 4, MR: 6, TG: 6,
  GA: 6, MG: 6, TT: 6, HT: 6, MO: 6, TN: 5, GY: 6, MW: 6, TM: 1,
  GM: 6, MY: 3, TR: 2, GH: 6, ML: 3, UG: 6, GP: 6, MV: 6, UA: 2,
  GT: 6, MT: 4, UY: 6, GN: 6, MA: 6, FJ: 6, GW: 6, MQ: 5, PH: 5,
  DE: 3, MX: 4, FI: 3, GI: 6, MZ: 6, FR: 3, HK: 3, MD: 2, HR: 3,
  HN: 6, MC: 3, CF: 6, GD: 6, MN: 4, TD: 6, GR: 2, NA: 6, CZ: 3,
  GE: 2, NE: 6, CL: 6, DK: 3, NG: 6, CH: 3, DJ: 6, NL: 3, SE: 3,
  DO: 6, NI: 6, LK: 4, EG: 4, NZ: 5, EC: 6, CD: 6, NC: 6, GQ: 6,
  ZM: 6, NO: 3, EE: 2, ZW: 6, AE: 2, ET: 6, IL: 3, OM: 4, ZA: 6,
  IN: 2, PK: 3, JM: 6, JO: 3, PA: 5, JP: 3,
};

// Weight-bracket EMS prices per zone (UZS), "Posilkalar" rows 2.1-2.32 of the
// EMS tariff table; maxKg is the upper bound of the bracket (inclusive-ish,
// matches the site's own "up to X kg" wording).
export const EMS_WEIGHT_BRACKETS_UZS: { maxKg: number; zonePrices: [number, number, number, number, number, number] }[] = [
  { maxKg: 0.5, zonePrices: [290000, 410000, 490000, 540000, 600000, 720000] },
  { maxKg: 1, zonePrices: [330000, 490000, 550000, 600000, 680000, 850000] },
  { maxKg: 1.5, zonePrices: [380000, 550000, 620000, 660000, 750000, 970000] },
  { maxKg: 2, zonePrices: [410000, 610000, 680000, 750000, 840000, 1100000] },
  { maxKg: 3, zonePrices: [460000, 680000, 780000, 840000, 970000, 1270000] },
  { maxKg: 4, zonePrices: [530000, 730000, 810000, 1020000, 1100000, 1440000] },
  { maxKg: 5, zonePrices: [580000, 800000, 860000, 1130000, 1240000, 1600000] },
  { maxKg: 6, zonePrices: [640000, 880000, 980000, 1260000, 1400000, 1820000] },
  { maxKg: 7, zonePrices: [680000, 950000, 1080000, 1400000, 1560000, 2030000] },
  { maxKg: 8, zonePrices: [730000, 1040000, 1190000, 1530000, 1720000, 2240000] },
  { maxKg: 9, zonePrices: [770000, 1120000, 1300000, 1660000, 1880000, 2450000] },
  { maxKg: 10, zonePrices: [810000, 1200000, 1400000, 1800000, 2040000, 2660000] },
  { maxKg: 11, zonePrices: [860000, 1280000, 1490000, 1930000, 2180000, 2830000] },
  { maxKg: 12, zonePrices: [900000, 1360000, 1570000, 2070000, 2320000, 3000000] },
  { maxKg: 13, zonePrices: [950000, 1440000, 1650000, 2200000, 2450000, 3170000] },
  { maxKg: 14, zonePrices: [990000, 1520000, 1730000, 2300000, 2580000, 3340000] },
  { maxKg: 15, zonePrices: [1040000, 1600000, 1800000, 2400000, 2720000, 3510000] },
  { maxKg: 16, zonePrices: [1080000, 1690000, 1930000, 2510000, 2850000, 3670000] },
  { maxKg: 17, zonePrices: [1130000, 1760000, 2040000, 2620000, 2990000, 3850000] },
  { maxKg: 18, zonePrices: [1180000, 1840000, 2150000, 2730000, 3120000, 4020000] },
  { maxKg: 19, zonePrices: [1210000, 1930000, 2280000, 2830000, 3250000, 4180000] },
  { maxKg: 20, zonePrices: [1260000, 2010000, 2390000, 2940000, 3390000, 4350000] },
  { maxKg: 21, zonePrices: [1300000, 2090000, 2510000, 3040000, 3530000, 4520000] },
  { maxKg: 22, zonePrices: [1350000, 2170000, 2630000, 3150000, 3660000, 4690000] },
  { maxKg: 23, zonePrices: [1400000, 2250000, 2740000, 3260000, 3790000, 4860000] },
  { maxKg: 24, zonePrices: [1440000, 2330000, 2860000, 3370000, 3930000, 5030000] },
  { maxKg: 25, zonePrices: [1490000, 2410000, 2970000, 3480000, 4200000, 5200000] },
  { maxKg: 26, zonePrices: [1530000, 2490000, 3090000, 3580000, 4330000, 5360000] },
  { maxKg: 27, zonePrices: [1580000, 2570000, 3210000, 3690000, 4470000, 5540000] },
  { maxKg: 28, zonePrices: [1620000, 2650000, 3320000, 3800000, 4610000, 5710000] },
  { maxKg: 29, zonePrices: [1660000, 2730000, 3440000, 3900000, 4740000, 5870000] },
  { maxKg: 30, zonePrices: [1710000, 2820000, 3550000, 4020000, 4870000, 6040000] },
];

// EMS: per-kg rate beyond 30kg, by zone (row 2.33)
export const EMS_EXTRA_PER_KG_UZS: [number, number, number, number, number, number] = [
  50000, 80000, 90000, 100000, 140000, 170000,
];

const SHIPPING_MULTIPLIER = 1.5;

export interface ShippingQuote {
  priceUsd: number;
  estimatedDays: string;
}

export interface ShippingEstimate {
  posilka: ShippingQuote | null;
  ems: ShippingQuote | null;
}

function posilkaCostUzs(countryCode: string, weightKg: number): number | null {
  const kg = chargeableKg(weightKg);
  if (countryCode === DOMESTIC_COUNTRY) {
    return DOMESTIC_POSILKA_UZS.perPiece + kg * DOMESTIC_POSILKA_UZS.perKg;
  }
  const rate = POSILKA_RATES_UZS[countryCode];
  if (!rate) return null;
  return rate.base + (kg - 1) * rate.perKg;
}

function emsCostUzs(countryCode: string, weightKg: number): number | null {
  if (countryCode === DOMESTIC_COUNTRY) {
    const bracket = DOMESTIC_EMS_BRACKETS_UZS.find((b) => weightKg <= b.maxKg);
    return bracket ? bracket.price : null; // over 20 kg: posilka only
  }
  const zone = EMS_ZONE_BY_COUNTRY[countryCode];
  if (!zone) return null;
  const zoneIdx = zone - 1;
  const lastBracket = EMS_WEIGHT_BRACKETS_UZS[EMS_WEIGHT_BRACKETS_UZS.length - 1];
  if (weightKg <= lastBracket.maxKg) {
    const bracket = EMS_WEIGHT_BRACKETS_UZS.find((b) => weightKg <= b.maxKg) || lastBracket;
    return bracket.zonePrices[zoneIdx];
  }
  const extraKg = chargeableKg(weightKg) - lastBracket.maxKg;
  return lastBracket.zonePrices[zoneIdx] + extraKg * EMS_EXTRA_PER_KG_UZS[zoneIdx];
}

/**
 * Estimates a painting's shipping weight from its physical size, since we
 * don't ask admins for an exact crated weight. Approximates a wooden crate +
 * padding as roughly constant per m^2 of surface area, plus a fixed base for
 * the crate itself. Deliberately rounds up (never undercharges shipping).
 */
export function estimatePaintingWeightKg(widthCm: number, heightCm: number): number {
  const areaM2 = (widthCm / 100) * (heightCm / 100);
  const estimated = areaM2 * 6 + 1.5;
  return Math.max(1, Math.ceil(estimated * 2) / 2); // round up to nearest 0.5kg
}

/**
 * Estimates Posilka + EMS shipping cost in USD for a given destination
 * country and package weight, applying the gallery's 1.5x markup over the
 * raw UzPost tariff (covers packaging, insurance, and handling).
 */
export function estimateShipping(
  countryCode: string,
  weightKg: number,
  somPerUsd: number
): ShippingEstimate {
  const posilkaUzs = posilkaCostUzs(countryCode, weightKg);
  const emsUzs = emsCostUzs(countryCode, weightKg);

  const toUsd = (uzs: number) => Math.round(((uzs * SHIPPING_MULTIPLIER) / somPerUsd) * 100) / 100;

  const domestic = countryCode === DOMESTIC_COUNTRY;
  const cis = CIS_COUNTRIES.has(countryCode);

  return {
    posilka: posilkaUzs
      ? { priceUsd: toUsd(posilkaUzs), estimatedDays: domestic ? '3-7' : cis ? '10-20' : '15-30' }
      : null,
    ems: emsUzs
      ? { priceUsd: toUsd(emsUzs), estimatedDays: domestic ? '1-3' : cis ? '4-8' : '7-15' }
      : null,
  };
}
