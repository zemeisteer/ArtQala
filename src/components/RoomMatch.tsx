'use client';

import React, { useRef, useState } from 'react';
import { Sparkles, Camera, Loader2, X, RotateCcw, Frame } from 'lucide-react';
import Link from '@/components/LocalizedLink';
import { useApp } from '@/context/AppContext';

interface Match {
  id: string;
  title: string;
  artist: string;
  size: string;
  price: number;
  discount_price: number | null;
  image: string;
  reason: string;
}

// Phone photos are 3–12 MB; send a ~1280 px JPEG instead (Vercel caps
// request bodies at ~4.5 MB, and it is all the AI needs).
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

// "Find art for my room" (src/lib/roomMatch.ts): a button that opens a
// modal — upload a room photo, get 3–5 matching works with the reason.
export default function RoomMatch() {
  const { t, lang, formatPrice } = useApp();
  const r = t.roomMatch;
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMatches(null);
    setError(null);
  };

  const onFile = async (file: File) => {
    reset();
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', await shrink(file), 'room.jpg');
      fd.append('lang', lang);
      const res = await fetch('/api/room-match', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.matches?.length) setMatches(data.matches);
      else setError(data.code === 'rate_limited' ? r.rateLimited : r.error);
    } catch {
      setError(r.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full border border-[#DAA932] bg-[#FFFBEF] text-[#8C5A00] hover:bg-[#FFF3D1] transition shadow-xs"
      >
        <Sparkles className="w-4 h-4" />
        {r.button}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#281C18]/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              aria-label={r.close}
              className="absolute top-5 right-5 text-[#756962] hover:text-[#281C18] p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pr-8">
              <h2 className="font-serif text-2xl font-semibold text-[#281C18] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#DAA932]" /> {r.title}
              </h2>
              <p className="text-sm text-[#6B5E55] mt-1">{r.subtitle}</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) onFile(f);
              }}
            />

            {!preview ? (
              <div className="space-y-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#D9CFC3] hover:border-[#BA4E25] rounded-[4px] py-12 flex flex-col items-center gap-2 text-[#554740] bg-white/60 transition"
                >
                  <Camera className="w-8 h-8 text-[#BA4E25]" />
                  <span className="text-sm font-semibold">{r.upload}</span>
                </button>
                <p className="text-[11px] text-[#756962] text-center">{r.privacy}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-[180px_1fr] gap-5 items-start">
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="w-full rounded-[3px] border border-[#E7E0D8] object-cover max-h-60" />
                  {!busy && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs font-semibold text-[#BA4E25] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> {r.tryAnother}
                    </button>
                  )}
                </div>
                <div>
                  {busy && (
                    <div className="flex items-center gap-2 text-sm text-[#554740] py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#BA4E25]" /> {r.analyzing}
                    </div>
                  )}
                  {error && <p className="text-sm text-[#B91C1C] py-4">{error}</p>}
                  {matches && (
                    <div className="space-y-3">
                      <h3 className="font-serif text-lg font-semibold text-[#281C18]">{r.resultsTitle}</h3>
                      {matches.map((m) => (
                        <div key={m.id} className="flex gap-3 bg-white border border-[#E7E0D8] rounded-[3px] p-3">
                          <Link href={`/gallery/${m.id}`} className="shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.image} alt={m.title} className="w-20 h-20 object-cover rounded-[2px]" loading="lazy" />
                          </Link>
                          <div className="min-w-0 space-y-1">
                            <Link href={`/gallery/${m.id}`} className="font-serif font-semibold text-[#281C18] hover:text-[#BA4E25] block">
                              {m.title}
                            </Link>
                            <div className="text-[11px] text-[#756962]">
                              {m.artist} · {m.size} · <b className="text-[#281C18]">{formatPrice(m.discount_price ?? m.price)}</b>
                            </div>
                            <p className="text-xs text-[#554740] leading-relaxed">{m.reason}</p>
                            <Link
                              href={`/gallery/${m.id}?wall=1`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#347578] hover:underline"
                            >
                              <Frame className="w-3.5 h-3.5" /> {r.viewOnWall}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
