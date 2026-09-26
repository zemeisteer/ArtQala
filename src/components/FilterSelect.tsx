'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  // Omit allValue/allLabel for a plain required picker (no "All ..." row) —
  // used for things like a country or phone-code field where there's no
  // "all" concept.
  allValue?: string;
  allLabel?: string;
  // Shown instead of the dropdown when `options` is empty (e.g. no artist
  // has a piece in the currently selected category) — a short, friendly
  // message rather than a select box with nothing but "All" in it.
  emptyMessage?: string;
  // Adds a search box inside the panel — for long lists (country pickers)
  // where scrolling to find one item isn't practical.
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  // Matches the dark quote-request card styling (Services page) instead of
  // the light default.
  dark?: boolean;
  // What the field is (e.g. "Artist") for screen readers — the visible text
  // is only the current value, which alone doesn't say what's being picked.
  ariaLabel?: string;
}

export default function FilterSelect({
  value,
  onChange,
  options,
  allValue,
  allLabel,
  emptyMessage,
  searchable = false,
  searchPlaceholder,
  className = '',
  buttonClassName = '',
  dark = false,
  ariaLabel,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hasAll = allValue !== undefined && allLabel !== undefined;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  if (options.length === 0 && emptyMessage) {
    return (
      <div className={`w-full text-xs px-3 py-2.5 bg-[#F5EFE7] border border-dashed border-[#D9CDBF] rounded-md text-[#A89990] italic ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  const selectedLabel =
    hasAll && value === allValue
      ? allLabel!
      : options.find((o) => o.value === value)?.label || (hasAll ? allLabel! : '');

  const Row = ({ optValue, label }: { optValue: string; label: string }) => (
    <button
      type="button"
      onClick={() => {
        onChange(optValue);
        setOpen(false);
      }}
      className={`w-full flex items-center justify-between gap-2 text-xs px-3 py-2 text-left rounded transition-colors ${
        value === optValue
          ? 'text-[#BA4E25] font-semibold bg-[#BA4E25]/10'
          : dark
          ? 'text-[#D0C2B7] hover:bg-[#4D3932]'
          : 'text-[#554740] hover:bg-[#FAF4EC]'
      }`}
    >
      <span className="truncate">{label}</span>
      {value === optValue && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}: ${selectedLabel}` : undefined}
        className={`w-full flex items-center justify-between gap-2 text-xs px-3 py-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BA4E25]/20 transition-colors text-left ${
          dark
            ? 'bg-[#362722] border border-[#4D3932] text-[#FAF4EC] hover:border-[#BA4E25]/50'
            : 'bg-white border border-[#E7E0D8] text-[#281C18] hover:border-[#BA4E25]/50 focus:border-[#BA4E25]'
        } ${buttonClassName}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${dark ? 'text-[#A8988E]' : 'text-[#8A7C73]'} ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute z-30 left-0 mt-1.5 rounded-md shadow-lg animate-[fadeSlideIn_0.15s_ease-out] flex flex-col max-h-72 min-w-full w-max max-w-[min(24rem,90vw)] ${
            dark ? 'bg-[#362722] border border-[#4D3932]' : 'bg-white border border-[#E7E0D8]'
          }`}
        >
          {searchable && (
            <div className={`relative p-1.5 border-b shrink-0 ${dark ? 'border-[#4D3932]' : 'border-[#F0EAE1]'}`}>
              <Search className={`w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-[#A8988E]' : 'text-[#8A7C73]'}`} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                className={`w-full text-xs pl-7 pr-2 py-1.5 border border-transparent rounded focus:outline-none focus:border-[#BA4E25]/40 ${
                  dark ? 'bg-[#281C18] text-[#FAF4EC]' : 'bg-[#FAF4EC] text-[#281C18]'
                }`}
              />
            </div>
          )}
          <div className="overflow-y-auto p-1">
            {hasAll && <Row optValue={allValue!} label={allLabel!} />}
            {filteredOptions.map((o) => (
              <Row key={o.value} optValue={o.value} label={o.label} />
            ))}
            {filteredOptions.length === 0 && (
              <p className="text-[11px] text-[#A89990] italic px-3 py-2">Hech narsa topilmadi</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
