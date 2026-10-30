'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD', same format the native <input type="date"> used
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  // Days before this ('YYYY-MM-DD') can't be picked.
  min?: string;
  // Extra rule for days that can't be picked (e.g. a weekday a masterclass doesn't run).
  isDisabled?: (value: string) => boolean;
  // Public site: month/weekday names in this language (default: Uzbek, as in the admin).
  locale?: string;
  placeholder?: string;
  todayLabel?: string;
}

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
const WEEKDAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date | null, locale?: string): string {
  if (!date) return '';
  if (locale) return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export default function DatePicker({
  value,
  onChange,
  className = '',
  buttonClassName = '',
  min,
  isDisabled,
  locale,
  placeholder = 'Sanani tanlang',
  todayLabel = 'Bugun',
}: DatePickerProps) {
  const selected = parseDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selected || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setViewDate(selected || new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first weekday index (0 = Monday ... 6 = Sunday)
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSameDay = (d: number) =>
    selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;

  const today = new Date();
  const disabled = (d: number) => {
    const v = formatValue(new Date(year, month, d));
    return (!!min && v < min) || !!isDisabled?.(v);
  };
  const monthTitle = locale
    ? new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : `${MONTH_NAMES[month]} ${year}`;
  // Monday-first, 2024-01-01 was a Monday.
  const weekdayLabels = locale
    ? Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }))
    : WEEKDAY_LABELS;
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 text-xs px-3 py-2.5 bg-white border border-[#E7E0D8] rounded-md hover:border-[#BA4E25]/50 focus:outline-none focus:ring-2 focus:ring-[#BA4E25]/20 focus:border-[#BA4E25] transition-colors text-left text-[#281C18] ${buttonClassName}`}
      >
        <Calendar className="w-3.5 h-3.5 text-[#8A7C73] shrink-0" />
        <span className="truncate">{selected ? formatDisplay(selected, locale) : placeholder}</span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 mt-1.5 w-64 bg-white border border-[#E7E0D8] rounded-md shadow-lg p-3 animate-[fadeSlideIn_0.15s_ease-out]">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1 rounded hover:bg-[#FAF4EC] text-[#554740]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[#281C18]">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1 rounded hover:bg-[#FAF4EC] text-[#554740]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekdayLabels.map((w, i) => (
              <div key={i} className="text-center text-[9.5px] font-bold text-[#A8988E] py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, idx) =>
              d === null ? (
                <div key={idx} />
              ) : (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled(d)}
                  onClick={() => {
                    onChange(formatValue(new Date(year, month, d)));
                    setOpen(false);
                  }}
                  className={`aspect-square text-[11px] rounded transition-colors flex items-center justify-center ${
                    disabled(d)
                      ? 'text-[#D9D0C6] cursor-not-allowed'
                      : isSameDay(d)
                      ? 'bg-[#BA4E25] text-white font-semibold'
                      : isToday(d)
                      ? 'text-[#BA4E25] font-semibold hover:bg-[#FAF4EC]'
                      : 'text-[#554740] hover:bg-[#FAF4EC]'
                  }`}
                >
                  {d}
                </button>
              )
            )}
          </div>

          {todayLabel && (
            <button
              type="button"
              disabled={(!!min && formatValue(today) < min) || !!isDisabled?.(formatValue(today))}
              onClick={() => {
                onChange(formatValue(today));
                setOpen(false);
              }}
              className="w-full mt-2 pt-2 border-t border-[#F0EAE1] text-[11px] font-semibold text-[#347578] hover:underline"
            >
              {todayLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
