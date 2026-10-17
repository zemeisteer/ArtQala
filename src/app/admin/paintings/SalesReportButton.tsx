'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import DatePicker from '@/components/DatePicker';

// "Savdo hisoboti": downloads /api/admin/reports/sales as an Excel file
// for an optional period (empty dates = from the beginning / until today).
export default function SalesReportButton() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      // DatePicker's calendar renders inside this box, so clicks there stay.
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const setThisMonth = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setFrom(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
    setTo(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  };
  const setThisYear = () => {
    const now = new Date();
    setFrom(`${now.getFullYear()}-01-01`);
    setTo('');
  };

  const href = (() => {
    const sp = new URLSearchParams();
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    const q = sp.toString();
    return `/api/admin/reports/sales${q ? `?${q}` : ''}`;
  })();

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 border border-[#E7E0D8] bg-white hover:border-[#BA4E25] text-[#281C18] font-semibold text-xs px-4 py-2.5 rounded-[3px] transition-all"
      >
        <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
        <span>Savdo hisoboti (Excel)</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[340px] max-w-[calc(100vw-32px)] bg-white border border-[#E7E0D8] rounded-[4px] shadow-xl p-4 space-y-3">
          <p className="text-[11px] text-[#726861]">
            Sotilgan kartinalar: sana, rassom, saytdagi va sotilgan narx, xaridor. Sana tanlanmasa — hammasi.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">Dan</label>
              <DatePicker value={from} onChange={setFrom} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">Gacha</label>
              <DatePicker value={to} onChange={setTo} />
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Shu oy', onClick: setThisMonth },
              { label: 'Shu yil', onClick: setThisYear },
              { label: 'Hammasi', onClick: () => (setFrom(''), setTo('')) },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.onClick}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#E7E0D8] text-[#554740] hover:border-[#BA4E25]"
              >
                {b.label}
              </button>
            ))}
          </div>
          <a
            href={href}
            download
            onClick={() => setTimeout(() => setOpen(false), 300)}
            className="flex items-center justify-center gap-2 w-full bg-[#16A34A] hover:bg-[#128038] text-white text-xs font-semibold py-2.5 rounded-[3px]"
          >
            <Download className="w-4 h-4" />
            Yuklab olish
          </a>
        </div>
      )}
    </div>
  );
}
