'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

// "View on a wall": the painting drawn at its REAL size on a room wall,
// next to a 200 cm sofa and a 170 cm person, so a visitor (often abroad,
// buying without seeing it) can judge how big it really is. Everything is
// one SVG measured in centimetres, so the scale is exact.

interface WallPreviewModalProps {
  imageSrc: string;
  title: string;
  widthCm: number;
  heightCm: number;
  onClose: () => void;
}

const WALL_COLORS = ['#EFE8DF', '#D9D4CC', '#C9D6D3', '#3E3A37'];
const SOFA_W = 200;
const SOFA_H = 85;
const PERSON_H = 170;
const FLOOR_Y = 260; // wall height in cm (top of the floor)

export default function WallPreviewModal({ imageSrc, title, widthCm, heightCm, onClose }: WallPreviewModalProps) {
  const { t } = useApp();
  const [wall, setWall] = useState(WALL_COLORS[0]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A huge piece widens the room instead of overflowing it.
  const sceneW = Math.max(460, widthCm + 260);
  const sceneH = Math.max(FLOOR_Y + 40, heightCm + 120);
  const floorY = sceneH - 40;
  const sofaX = (sceneW - SOFA_W) / 2 - 30;
  // Hung ~25 cm above the sofa back, or centred at eye level (~150 cm) if
  // that would push it into the ceiling.
  const sofaTop = floorY - SOFA_H;
  let artY = sofaTop - 25 - heightCm;
  if (artY < 15) artY = Math.max(15, floorY - 150 - heightCm / 2);
  const artX = sofaX + SOFA_W / 2 - widthCm / 2;
  const personX = Math.min(sceneW - 55, Math.max(artX + widthCm, sofaX + SOFA_W) + 45);
  const dark = wall === WALL_COLORS[3];

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.painting.viewOnWall}
    >
      <div
        className="bg-[#FAF4EC] rounded-[4px] w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E0D8]">
          <h3 className="font-serif text-lg font-semibold text-[#281C18] truncate pr-3">
            {t.painting.viewOnWall} — {title}
          </h3>
          <button onClick={onClose} className="text-[#8F8178] hover:text-[#281C18] p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <svg viewBox={`0 0 ${sceneW} ${sceneH}`} className="w-full h-auto block" role="img" aria-label={title}>
          <defs>
            <filter id="art-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1.5" dy="3" stdDeviation="2.5" floodOpacity="0.35" />
            </filter>
          </defs>
          {/* wall + floor */}
          <rect x="0" y="0" width={sceneW} height={floorY} fill={wall} />
          <rect x="0" y={floorY} width={sceneW} height={sceneH - floorY} fill="#8A6A52" />
          <rect x="0" y={floorY - 8} width={sceneW} height="8" fill={dark ? '#2C2926' : '#F7F3EE'} />

          {/* the painting, real size */}
          <g filter="url(#art-shadow)">
            <rect x={artX - 1.5} y={artY - 1.5} width={widthCm + 3} height={heightCm + 3} fill="#2A2420" />
            <image
              href={imageSrc}
              x={artX}
              y={artY}
              width={widthCm}
              height={heightCm}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>

          {/* sofa, 200 × 85 cm */}
          <g fill="#6B5A4E">
            <rect x={sofaX} y={sofaTop} width={SOFA_W} height="45" rx="8" />
            <rect x={sofaX - 8} y={sofaTop + 25} width="22" height={SOFA_H - 35} rx="7" />
            <rect x={sofaX + SOFA_W - 14} y={sofaTop + 25} width="22" height={SOFA_H - 35} rx="7" />
            <rect x={sofaX + 8} y={sofaTop + 40} width={SOFA_W - 16} height="30" rx="5" fill="#7A685B" />
            <rect x={sofaX + 4} y={floorY - 12} width="6" height="12" fill="#3E322B" />
            <rect x={sofaX + SOFA_W - 10} y={floorY - 12} width="6" height="12" fill="#3E322B" />
          </g>

          {/* person, 170 cm */}
          <g fill={dark ? '#CFC6BD' : '#5A4D45'} opacity="0.85">
            <circle cx={personX} cy={floorY - PERSON_H + 11} r="11" />
            <rect x={personX - 17} y={floorY - PERSON_H + 25} width="34" height="68" rx="13" />
            <rect x={personX - 14} y={floorY - PERSON_H + 86} width="12" height="84" rx="5" />
            <rect x={personX + 2} y={floorY - PERSON_H + 86} width="12" height="84" rx="5" />
          </g>
        </svg>

        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#6E6057]">
            {t.painting.wallScaleNote
              .replace('{w}', String(Math.round(widthCm)))
              .replace('{h}', String(Math.round(heightCm)))}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase">{t.painting.wallColor}</span>
            {WALL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setWall(c)}
                aria-label={c}
                className={`w-6 h-6 rounded-full border-2 ${wall === c ? 'border-[#BA4E25]' : 'border-[#E7E0D8]'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
