'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Search, CheckSquare, Square } from 'lucide-react';

export interface LabelPainting {
  id: string;
  title_en: string;
  title_uz: string;
  artist: string;
  technique: string;
  size: string;
  year: string;
  price: number;
  discount_price: number | null;
  is_sold: boolean;
}

type LabelSize = 'small' | 'large';

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// ?ref=qr marks a visit as coming from a gallery label (VisitTracker →
// dashboard "QR label" source).
const labelUrl = (siteUrl: string, id: string) => `${siteUrl}/gallery/${id}?ref=qr`;

export default function LabelsClient({
  paintings,
  preselected,
  siteUrl,
}: {
  paintings: LabelPainting[];
  preselected: string[];
  siteUrl: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselected.length ? preselected : paintings.filter((p) => !p.is_sold).map((p) => p.id))
  );
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<LabelSize>('small');
  const [showPrice, setShowPrice] = useState(true);
  const [qr, setQr] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? paintings.filter((p) => `${p.title_en} ${p.title_uz} ${p.artist}`.toLowerCase().includes(q))
      : paintings;
  }, [paintings, query]);
  const chosen = paintings.filter((p) => selected.has(p.id));

  useEffect(() => {
    const missing = chosen.filter((p) => !qr[p.id]);
    if (!missing.length) return;
    let cancelled = false;
    import('qrcode').then(async (QR) => {
      const made: Record<string, string> = {};
      for (const p of missing) {
        made[p.id] = await QR.toDataURL(labelUrl(siteUrl, p.id), { margin: 0, width: 360, errorCorrectionLevel: 'M' });
      }
      if (!cancelled) setQr((prev) => ({ ...prev, ...made }));
    });
    return () => {
      cancelled = true;
    };
  }, [chosen, qr, siteUrl]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of visible) {
        if (allVisibleSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });

  const ready = chosen.every((p) => qr[p.id]);

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Only the label sheet is printed, on A4 with small margins. */}
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          body * { visibility: hidden !important; }
          #label-sheet, #label-sheet * { visibility: visible !important; }
          #label-sheet { position: absolute; left: 0; top: 0; width: 194mm; }
          .aq-label { break-inside: avoid; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link href="/admin/paintings" className="text-xs font-semibold text-[#BA4E25] hover:underline flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kartinalar</span>
          </Link>
          <h1 className="font-serif text-3xl font-semibold mt-2">QR yorliqlar</h1>
          <p className="text-sm text-[#6B5E55] mt-1 max-w-2xl">
            Galereyadagi asarlar yoniga qo&apos;yiladigan yorliqlar. Mehmon QR kodni telefonida skanerlab asar haqida
            o&apos;qiydi, narxni o&apos;z valyutasida ko&apos;radi va uyiga yetkazib berishni so&apos;raydi. QR orqali
            kirganlar Dashboard&apos;da &laquo;QR yorliq&raquo; bo&apos;lib ko&apos;rinadi.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          disabled={!chosen.length || !ready}
          className="shrink-0 bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-50 text-white text-sm font-semibold px-5 py-3 rounded-[3px] flex items-center gap-2 shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Chop etish ({chosen.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start print:block">
        {/* Picker */}
        <div className="bg-white border border-[#E7E0D8] rounded-[4px] p-4 space-y-3 print:hidden">
          <div className="flex gap-2">
            {(['small', 'large'] as LabelSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 text-xs font-semibold py-2 rounded-[3px] border transition ${
                  size === s ? 'bg-[#281C18] text-white border-[#281C18]' : 'bg-white text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25]'
                }`}
              >
                {s === 'small' ? 'Kichik (A4 da 8 ta)' : 'Katta (A4 da 3 ta)'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPrice((v) => !v)}
            className="w-full flex items-center gap-2 text-xs text-[#554740] py-1"
          >
            {showPrice ? <CheckSquare className="w-4 h-4 text-[#BA4E25]" /> : <Square className="w-4 h-4 text-[#B5A599]" />}
            <span>Narxni yorliqda ko&apos;rsatish</span>
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-[#B5A599] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nomi yoki rassom bo'yicha qidirish"
              className="w-full text-sm pl-9 pr-3 py-2.5 border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
            />
          </div>
          <button onClick={toggleAllVisible} className="text-xs font-semibold text-[#BA4E25] hover:underline">
            {allVisibleSelected ? 'Hammasini olib tashlash' : 'Hammasini tanlash'}
          </button>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#F0EAE1] -mx-1">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full flex items-start gap-2.5 px-1 py-2 text-left hover:bg-[#FAF4EC]"
              >
                {selected.has(p.id) ? (
                  <CheckSquare className="w-4 h-4 mt-0.5 shrink-0 text-[#BA4E25]" />
                ) : (
                  <Square className="w-4 h-4 mt-0.5 shrink-0 text-[#B5A599]" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm text-[#281C18] truncate">{p.title_uz || p.title_en}</span>
                  <span className="block text-[11px] text-[#8F8178] truncate">
                    {p.artist}
                    {p.is_sold && ' · Sotilgan'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview = the printed sheet */}
        <div className="bg-[#E9E2D9] p-4 rounded-[4px] overflow-x-auto print:bg-transparent print:p-0">
          {chosen.length === 0 ? (
            <p className="text-sm text-[#6B5E55] p-6 print:hidden">Chap tomondan asarlarni tanlang.</p>
          ) : (
            <div
              id="label-sheet"
              className={`mx-auto grid gap-[4mm] ${size === 'small' ? 'grid-cols-2' : 'grid-cols-1'}`}
              style={{ width: '194mm' }}
            >
              {chosen.map((p) => (
                <Label key={p.id} p={p} qr={qr[p.id]} size={size} showPrice={showPrice} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ p, qr, size, showPrice }: { p: LabelPainting; qr?: string; size: LabelSize; showPrice: boolean }) {
  const big = size === 'large';
  const facts = [p.technique, p.size, p.year].filter(Boolean).join(' · ');
  return (
    <div
      className="aq-label bg-white border border-[#D9CFC3] text-[#281C18] flex overflow-hidden"
      style={{ height: big ? '88mm' : '66mm', padding: big ? '7mm' : '4.5mm', gap: big ? '7mm' : '4mm' }}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="text-[#BA4E25] font-semibold uppercase" style={{ fontSize: big ? '9pt' : '6.5pt', letterSpacing: '0.18em' }}>
          Art Qala Gallery
        </div>
        <div className="font-serif font-semibold leading-tight mt-[1.5mm]" style={{ fontSize: big ? '20pt' : '12.5pt' }}>
          {p.title_en}
        </div>
        {p.title_uz && p.title_uz !== p.title_en && (
          <div className="font-serif italic text-[#6B5E55] leading-tight" style={{ fontSize: big ? '12pt' : '8.5pt' }}>
            {p.title_uz}
          </div>
        )}
        <div className="mt-[2mm]" style={{ fontSize: big ? '11pt' : '8pt' }}>
          {p.artist}
        </div>
        {facts && (
          <div className="text-[#6B5E55]" style={{ fontSize: big ? '9.5pt' : '7pt' }}>
            {facts}
          </div>
        )}
        <div className="mt-auto">
          {p.is_sold ? (
            <div className="font-semibold text-[#8F8178]" style={{ fontSize: big ? '13pt' : '9pt' }}>
              Sold · Продано · Sotilgan
            </div>
          ) : (
            showPrice && (
              <div className="font-serif font-bold" style={{ fontSize: big ? '18pt' : '12pt' }}>
                {p.discount_price ? (
                  <>
                    {usd(p.discount_price)}{' '}
                    <span className="line-through text-[#8F8178] font-normal" style={{ fontSize: big ? '11pt' : '8pt' }}>
                      {usd(p.price)}
                    </span>
                  </>
                ) : (
                  usd(p.price)
                )}
              </div>
            )
          )}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-center justify-center text-center" style={{ width: big ? '52mm' : '33mm' }}>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="" style={{ width: big ? '46mm' : '29mm', height: big ? '46mm' : '29mm' }} />
        ) : (
          <div className="bg-[#F0EAE1]" style={{ width: big ? '46mm' : '29mm', height: big ? '46mm' : '29mm' }} />
        )}
        <div className="font-semibold mt-[1.5mm] leading-tight" style={{ fontSize: big ? '8.5pt' : '6pt' }}>
          Scan · Сканируйте · Skanerlang
        </div>
        <div className="text-[#6B5E55] leading-tight mt-[0.5mm]" style={{ fontSize: big ? '7.5pt' : '5.2pt' }}>
          Story, price in your currency, worldwide shipping
        </div>
      </div>
    </div>
  );
}
