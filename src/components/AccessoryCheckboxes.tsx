'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { priceForSize, type SizeBucket } from '@/lib/paintingSize';
import { accessoryAppliesTo } from '@/lib/productType';

export interface AccessoryOption {
  id: string;
  name_en: string;
  name_ru: string;
  name_uz: string;
  price_small: number;
  price_medium: number | null;
  price_large: number | null;
  product_types: string[];
}

export interface SelectedAccessory {
  id: string;
  name_en: string;
  name_ru: string;
  name_uz: string;
  price: number;
}

interface AccessoryCheckboxesProps {
  // What's being inquired about — a painting's paintingAccessoryTargets()
  // (its product type, i.e. top-level category slug, plus its own slug), or
  // one of the Services types ("MURAL" | "CERAMICS" | "CUSTOM"). An
  // accessory with no product_types of its own applies to everything.
  productTypes: string[];
  // The painting's size bucket, so a size-tiered accessory (case, framing…)
  // charges the right amount instead of one flat price for every size.
  // Omit when there's no known size yet (e.g. a Services commission) — the
  // small/base price is used as a sensible default.
  sizeBucket?: SizeBucket | null;
  onChange: (selected: SelectedAccessory[]) => void;
  // Use dark-form styling (matches the Services page's dark quote-request card).
  dark?: boolean;
  // Smaller rows + custom heading, for one list per painting inside the
  // wishlist inquiry modal.
  compact?: boolean;
  heading?: string;
}

// One request per page load, however many checkbox lists are on screen
// (the wishlist inquiry shows one per painting). Cleared on failure so a
// later mount can retry.
let accessoriesRequest: Promise<AccessoryOption[]> | null = null;
function loadAccessories(): Promise<AccessoryOption[]> {
  if (!accessoriesRequest) {
    accessoriesRequest = fetch('/api/accessories')
      .then((res) => res.json())
      .then((data) => (data.success ? (data.accessories as AccessoryOption[]) : Promise.reject(new Error('failed'))))
      .catch((err) => {
        accessoriesRequest = null;
        throw err;
      });
  }
  return accessoriesRequest;
}

export default function AccessoryCheckboxes({
  productTypes,
  sizeBucket,
  onChange,
  dark = false,
  compact = false,
  heading,
}: AccessoryCheckboxesProps) {
  const { lang, t } = useApp();
  const [accessories, setAccessories] = useState<AccessoryOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAccessories()
      .then((list) => {
        if (!cancelled) setAccessories(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Same rule the server enforces (accessoryAppliesTo): only accessories
  // configured for this product type / service, or for everything.
  const relevant = accessories.filter((a) => accessoryAppliesTo(a.product_types, productTypes));
  const relevantKey = relevant.map((a) => a.id).join(',');

  const title = (a: AccessoryOption) =>
    lang === 'ru' ? a.name_ru : lang === 'uz' ? a.name_uz : a.name_en;

  const emit = (ids: string[]) =>
    onChange(
      relevant
        .filter((acc) => ids.includes(acc.id))
        .map((acc) => ({
          id: acc.id,
          name_en: acc.name_en,
          name_ru: acc.name_ru,
          name_uz: acc.name_uz,
          price: priceForSize(acc, sizeBucket),
        }))
    );

  // When what's being inquired about changes (another service type, a
  // different painting size), drop checked items that no longer apply and
  // re-report prices — otherwise a hidden, still-"checked" accessory would
  // be submitted with a stale price.
  const checkedIds = selectedIds.filter((id) => relevant.some((a) => a.id === id));
  useEffect(() => {
    if (selectedIds.length === 0) return;
    emit(checkedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantKey, sizeBucket]);

  const toggle = (a: AccessoryOption) => {
    const next = checkedIds.includes(a.id)
      ? checkedIds.filter((id) => id !== a.id)
      : [...checkedIds, a.id];
    setSelectedIds(next);
    emit(next);
  };

  if (loading || relevant.length === 0) return null;

  return (
    <div>
      <label
        className={`block font-bold tracking-wider uppercase ${compact ? 'text-[9.5px] mb-1' : 'text-[10.5px] mb-1.5'} ${
          dark ? 'text-[#A8988E]' : 'text-[#6B5E55]'
        }`}
      >
        {heading || t.accessories.heading}
      </label>
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        {relevant.map((a) => (
          <label
            key={a.id}
            className={`flex items-center justify-between gap-2 rounded-[2px] cursor-pointer border ${
              compact ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-2'
            } ${
              dark
                ? 'bg-[#362722] border-[#4D3932] hover:border-[#BA4E25]/50'
                : 'bg-white border-[#E7E0D8] hover:border-[#BA4E25]/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checkedIds.includes(a.id)}
                onChange={() => toggle(a)}
                className="w-3.5 h-3.5 accent-[#BA4E25]"
              />
              <span className={dark ? 'text-[#FAF4EC]' : 'text-[#281C18]'}>{title(a)}</span>
            </span>
            <span className="text-[#BA4E25] font-semibold shrink-0">+${priceForSize(a, sizeBucket)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
