'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Sofa } from 'lucide-react';

interface WallInfo {
  widthCm: number | null;
  heightCm: number | null;
  framed: boolean;
  cropped: boolean;
  image: string;
}

// What the site's "Devorda ko'rish" uses for this painting: the artwork cut
// out of the saved main photo (frame edge, or canvas edge) and its real
// outer size. Detected automatically; "Qayta aniqlash" runs it again.
export default function WallViewCard({ paintingId }: { paintingId: string }) {
  const [info, setInfo] = useState<WallInfo | null>(null);
  const [busy, setBusy] = useState(true);

  const fetchInfo = (method: 'GET' | 'POST') =>
    fetch(`/api/paintings/${paintingId}/wall`, { method })
      .then((res) => res.json())
      .then((d) => d.success && setInfo(d as WallInfo))
      .catch(() => {})
      .finally(() => setBusy(false));

  const redetect = () => {
    setBusy(true);
    fetchInfo('POST');
  };

  useEffect(() => {
    fetchInfo('GET');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintingId]);

  return (
    <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#BA4E25] uppercase">
          <Sofa className="w-3.5 h-3.5" />
          Devorda ko&apos;rish
        </h3>
        <button
          type="button"
          onClick={redetect}
          disabled={busy}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#554740] border border-[#E7E0D8] rounded px-2.5 py-1 hover:bg-[#FAF4EC] disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Qayta aniqlash
        </button>
      </div>
      <div className="flex gap-4 items-start">
        <div className="w-28 h-28 shrink-0 bg-[repeating-conic-gradient(#eee_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] border border-[#E7E0D8] rounded flex items-center justify-center overflow-hidden">
          {info && !busy ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.image} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-[#8F8178]" />
          )}
        </div>
        <div className="text-[11px] text-[#554740] space-y-1">
          {info && (
            <>
              <p>
                Devordagi o&apos;lchami:{' '}
                <b>
                  {info.widthCm && info.heightCm ? `${Math.round(info.widthCm)} × ${Math.round(info.heightCm)} sm` : "o'lcham yozilmagan"}
                </b>
                {info.framed && ' (ramka bilan)'}
              </p>
              {!info.cropped && (
                <p className="text-[#B45309]">
                  Kartina rasmda avtomatik topilmadi — asosiy rasm butunligicha ishlatiladi. Keyinroq &quot;Qayta aniqlash&quot;ni bosing.
                </p>
              )}
            </>
          )}
          <p className="text-[10px] text-[#8F8178]">
            Saqlangan asosiy rasmdan kartina avtomatik kesib olinadi: ramkasi bo&apos;lsa ramka chetidan, bo&apos;lmasa kartina
            chetidan. Mijoz telefonida kamera orqali o&apos;z devorida shu o&apos;lchamda ko&apos;radi. Kesish noto&apos;g&apos;ri
            bo&apos;lsa — &quot;Qayta aniqlash&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}
