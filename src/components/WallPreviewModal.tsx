'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

// "View on a wall".
// - On a phone: the phone's own AR viewer (iOS Quick Look / Android Scene
//   Viewer) puts the artwork on the visitor's real wall through the camera,
//   at its real size (scaling is locked).
// - Everywhere: a room drawn in centimetres (sofa 200 cm, person 170 cm)
//   with the artwork at its real size.
// The artwork image is cut out of its main photo (frame edge, or canvas
// edge) and its outer size, frame included, comes from
// /api/paintings/[id]/wall (src/lib/wallView.ts).

interface WallPreviewModalProps {
  paintingId: string;
  title: string;
  fallbackImage: string;
  fallbackWidthCm: number;
  fallbackHeightCm: number;
  arFailed?: boolean;
  onClose: () => void;
}

interface WallData {
  widthCm: number | null;
  heightCm: number | null;
  framed: boolean;
  cropped: boolean;
  image: string;
  model: string;
  usdz: string;
}

// 'ios-inapp': an iPhone browser without Quick Look (Telegram, Instagram…
// in-app browsers, the Google app) — the visitor is told to open the page
// in Safari. Safari and Chrome/Edge/Firefox on iOS do have Quick Look (the
// latter only from a real .usdz link, which is what we give them).
// null: a computer — a QR code opens this view on the phone.
type ArMode = 'ios' | 'ios-inapp' | 'android' | null;

function detectArMode(): ArMode {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    if (/GSA\//.test(ua)) return 'ios-inapp';
    if (/CriOS\/|EdgiOS\/|FxiOS\/|DuckDuckGo\//.test(ua)) return 'ios';
    return document.createElement('a').relList?.supports?.('ar') ? 'ios' : 'ios-inapp';
  }
  if (/android/i.test(ua)) return 'android';
  return null;
}

const WALL_COLORS = ['#EDE6DC', '#D8D3CB', '#C7D5D1', '#E9D8C4', '#3B3734'];
const SOFA_W = 200;
const SOFA_H = 82;
const PERSON_H = 170;

export default function WallPreviewModal({
  paintingId,
  title,
  fallbackImage,
  fallbackWidthCm,
  fallbackHeightCm,
  arFailed = false,
  onClose,
}: WallPreviewModalProps) {
  const { t, lang } = useApp();
  const cm = lang === 'uz' ? 'sm' : lang === 'ru' ? 'см' : 'cm';
  const [wall, setWall] = useState(WALL_COLORS[0]);
  const [data, setData] = useState<WallData | null>(null);
  const [loading, setLoading] = useState(true);
  // Only ever rendered after a click, so the browser is there to ask.
  const [arMode] = useState<ArMode>(detectArMode);
  const [showInAppHelp, setShowInAppHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  // This view, straight from a phone (the painting page opens it on ?wall=1).
  const phoneUrl = () => {
    const u = new URL(window.location.href);
    u.hash = '';
    u.searchParams.set('wall', '1');
    return u.toString();
  };

  useEffect(() => {
    if (arMode) return;
    let cancelled = false;
    import('qrcode')
      .then((QR) => QR.toString(phoneUrl(), { type: 'svg', margin: 1, color: { dark: '#281C18', light: '#FFFFFF' } }))
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [arMode]);

  const copyLink = () => {
    navigator.clipboard?.writeText(phoneUrl()).then(() => setCopied(true)).catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/paintings/${paintingId}/wall`)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled && d.success) setData(d as WallData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paintingId]);

  const openAr = () => {
    if (arMode === 'ios-inapp') {
      setShowInAppHelp(true);
      return;
    }
    if (!data) return;
    if (arMode === 'ios') {
      const a = document.createElement('a');
      a.rel = 'ar';
      a.href = `${new URL(data.usdz, window.location.href).href}#allowsContentScaling=0`;
      a.appendChild(document.createElement('img'));
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (arMode === 'android') {
      const file = new URL(data.model, window.location.href).href;
      const fallback = `${window.location.href.split('#')[0]}#ar-failed`;
      const params = new URLSearchParams({
        file,
        mode: 'ar_preferred',
        title,
        resizable: 'false', // real size only
        enable_vertical_placement: 'true',
      });
      window.location.href =
        `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}#Intent;scheme=https;` +
        `package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;` +
        `S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
    }
  };

  // Always the size typed in the admin.
  const widthCm = data?.widthCm || fallbackWidthCm;
  const heightCm = data?.heightCm || fallbackHeightCm;
  const imageSrc = data?.image || fallbackImage;
  const exactImage = Boolean(data?.cropped);

  // --- the room, in centimetres ---
  const sceneW = Math.max(480, widthCm + 300);
  const wallH = Math.max(270, heightCm + 150);
  const floorH = 45;
  const sceneH = wallH + floorH;
  const floorY = wallH;
  const sofaX = (sceneW - SOFA_W) / 2 - 25;
  const sofaTop = floorY - SOFA_H;
  // ~25 cm above the sofa back, or centred at eye level (~150 cm) when that
  // would reach the ceiling.
  let artY = sofaTop - 25 - heightCm;
  if (artY < 18) artY = Math.max(18, floorY - 150 - heightCm / 2);
  const artX = sofaX + SOFA_W / 2 - widthCm / 2;
  const personX = Math.min(sceneW - 40, Math.max(artX + widthCm, sofaX + SOFA_W) + 55);
  const plantX = Math.max(25, sofaX - 38);
  const dark = wall === WALL_COLORS[WALL_COLORS.length - 1];
  const label = Math.max(9, sceneW / 48); // font size, cm
  const ink = dark ? '#E9E2DA' : '#6B5E55';


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

        {/* Phone: the real wall through the camera */}
        {arMode && (
          <div className="px-5 pt-4 space-y-2">
            <button
              type="button"
              onClick={openAr}
              disabled={arMode !== 'ios-inapp' && (loading || !data)}
              className="w-full flex items-center justify-center gap-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm py-3 rounded-[3px] disabled:opacity-60"
            >
              {arMode !== 'ios-inapp' && loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {t.painting.wallArButton}
            </button>
            {showInAppHelp ? (
              <div className="text-xs text-[#7C2D12] bg-[#FFF7ED] border border-[#FED7AA] rounded-[3px] p-3 space-y-2">
                <p>{t.painting.wallInApp}</p>
                <button type="button" onClick={copyLink} className="font-semibold text-[#BA4E25] underline">
                  {copied ? t.painting.wallLinkCopied : t.painting.wallCopyLink}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[#6E6057] text-center">{t.painting.wallArHint}</p>
            )}
          </div>
        )}

        {/* Computer: scan to open this view on the phone */}
        {!arMode && qrSvg && (
          <div className="px-5 pt-4 flex items-center gap-4">
            <div
              className="w-24 h-24 shrink-0 border border-[#E7E0D8] rounded-[3px] bg-white p-1 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#281C18]">
                <Camera className="w-4 h-4 text-[#BA4E25]" />
                {t.painting.wallQrTitle}
              </p>
              <p className="text-xs text-[#6E6057] mt-1">{t.painting.wallPhoneHint}</p>
            </div>
          </div>
        )}
        {arFailed && <p className="px-5 pt-3 text-xs text-[#B45309]">{t.painting.wallArFailed}</p>}

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#FAF4EC]/70 text-xs text-[#6E6057]">
              <Loader2 className="w-4 h-4 animate-spin text-[#BA4E25]" />
              {t.painting.wallPreparing}
            </div>
          )}
          <svg viewBox={`0 0 ${sceneW} ${sceneH}`} className="w-full h-auto block" role="img" aria-label={title}>
            <defs>
              <linearGradient id="wv-light" x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.08 : 0.35} />
                <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity={dark ? 0.25 : 0.1} />
              </linearGradient>
              <linearGradient id="wv-floor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7A5A43" />
                <stop offset="1" stopColor="#5E4332" />
              </linearGradient>
              <linearGradient id="wv-sofa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8C7B6E" />
                <stop offset="1" stopColor="#6F5F54" />
              </linearGradient>
              <filter id="wv-shadow" x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow dx="1.2" dy="3.5" stdDeviation="3" floodOpacity="0.35" />
              </filter>
              <filter id="wv-soft" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            {/* wall, light, skirting, floor with planks */}
            <rect x="0" y="0" width={sceneW} height={wallH} fill={wall} />
            <rect x="0" y="0" width={sceneW} height={wallH} fill="url(#wv-light)" />
            <rect x="0" y={floorY} width={sceneW} height={floorH} fill="url(#wv-floor)" />
            {Array.from({ length: Math.ceil(sceneW / 60) }, (_, i) => (
              <line key={i} x1={i * 60 + (i % 2) * 22} y1={floorY + 10} x2={i * 60 + (i % 2) * 22} y2={sceneH} stroke="#000" strokeOpacity="0.12" strokeWidth="0.6" />
            ))}
            <rect x="0" y={floorY - 9} width={sceneW} height="9" fill={dark ? '#2A2724' : '#F8F5F1'} />
            <rect x="0" y={floorY - 1} width={sceneW} height="1" fill="#000" opacity="0.12" />

            {/* plant */}
            <g>
              <ellipse cx={plantX} cy={floorY - 1} rx="16" ry="3" fill="#000" opacity="0.18" />
              <path d={`M${plantX - 12} ${floorY - 34} h24 l-3 33 h-18 z`} fill="#C9BBAE" />
              {[-28, -14, 0, 14, 28].map((a, i) => (
                <ellipse
                  key={i}
                  cx={plantX + a * 0.55}
                  cy={floorY - 62 - (i % 2) * 14}
                  rx="7"
                  ry="26"
                  transform={`rotate(${a} ${plantX + a * 0.55} ${floorY - 50})`}
                  fill={i % 2 ? '#5E7D5A' : '#6E8F68'}
                />
              ))}
            </g>

            {/* the artwork, real size */}
            <ellipse cx={artX + widthCm / 2} cy={artY + heightCm + 4} rx={widthCm * 0.45} ry="3" fill="#000" opacity="0.08" filter="url(#wv-soft)" />
            <g filter="url(#wv-shadow)">
              {!exactImage && <rect x={artX - 1.5} y={artY - 1.5} width={widthCm + 3} height={heightCm + 3} fill="#2A2420" />}
              <image
                href={imageSrc}
                x={artX}
                y={artY}
                width={widthCm}
                height={heightCm}
                preserveAspectRatio={exactImage ? 'none' : 'xMidYMid slice'}
              />
            </g>

            {/* dimensions */}
            <g stroke={ink} strokeWidth="0.6" opacity="0.8">
              <line x1={artX} y1={artY - 7} x2={artX + widthCm} y2={artY - 7} />
              <line x1={artX} y1={artY - 10} x2={artX} y2={artY - 4} />
              <line x1={artX + widthCm} y1={artY - 10} x2={artX + widthCm} y2={artY - 4} />
              <line x1={artX + widthCm + 7} y1={artY} x2={artX + widthCm + 7} y2={artY + heightCm} />
              <line x1={artX + widthCm + 4} y1={artY} x2={artX + widthCm + 10} y2={artY} />
              <line x1={artX + widthCm + 4} y1={artY + heightCm} x2={artX + widthCm + 10} y2={artY + heightCm} />
            </g>
            <text x={artX + widthCm / 2} y={artY - 11} textAnchor="middle" fontSize={label} fill={ink} fontFamily="sans-serif">
              {Math.round(widthCm)} {cm}
            </text>
            <text
              x={artX + widthCm + 13}
              y={artY + heightCm / 2}
              fontSize={label}
              fill={ink}
              fontFamily="sans-serif"
              dominantBaseline="middle"
            >
              {Math.round(heightCm)} {cm}
            </text>

            {/* sofa, 200 × 82 cm */}
            <g>
              <ellipse cx={sofaX + SOFA_W / 2} cy={floorY - 1} rx={SOFA_W / 2 + 8} ry="4" fill="#000" opacity="0.2" filter="url(#wv-soft)" />
              <rect x={sofaX + 6} y={sofaTop} width={SOFA_W - 12} height="46" rx="10" fill="url(#wv-sofa)" />
              <rect x={sofaX + 14} y={sofaTop + 6} width={(SOFA_W - 34) / 2} height="34" rx="8" fill="#988777" />
              <rect x={sofaX + 20 + (SOFA_W - 34) / 2} y={sofaTop + 6} width={(SOFA_W - 34) / 2} height="34" rx="8" fill="#988777" />
              <rect x={sofaX + 4} y={sofaTop + 40} width={SOFA_W - 8} height="24" rx="6" fill="#7D6C60" />
              <rect x={sofaX - 6} y={sofaTop + 24} width="22" height={SOFA_H - 36} rx="9" fill="#75655A" />
              <rect x={sofaX + SOFA_W - 16} y={sofaTop + 24} width="22" height={SOFA_H - 36} rx="9" fill="#75655A" />
              <rect x={sofaX + 8} y={floorY - 13} width="5" height="13" rx="1.5" fill="#3A2E27" />
              <rect x={sofaX + SOFA_W - 13} y={floorY - 13} width="5" height="13" rx="1.5" fill="#3A2E27" />
            </g>

            {/* person, 170 cm */}
            <g fill={dark ? '#CFC6BD' : '#5A4D45'} opacity="0.55">
              <circle cx={personX} cy={floorY - PERSON_H + 11} r="10.5" />
              <path
                d={`M${personX - 17} ${floorY - PERSON_H + 30}
                    q17 -9 34 0 l4 52 q-2 4 -6 2 l-4 -34 l-2 0 l0 128 l-10 0 l-1 -76 l-2 0 l-1 76 l-10 0 l0 -128 l-2 0 l-4 34 q-4 2 -6 -2 z`}
              />
            </g>
          </svg>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#6E6057]">
              {t.painting.wallScaleNote.replace('{w}', String(Math.round(widthCm))).replace('{h}', String(Math.round(heightCm)))}
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
    </div>
  );
}
