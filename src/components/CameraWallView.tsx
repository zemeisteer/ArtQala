'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Crosshair, Loader2, RotateCcw, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

// "View on a wall" for EVERY phone browser — including the ones without the
// phone's own AR viewer (the Google app on iPhone, Telegram/Instagram in-app
// browsers…): the live camera inside the page, with the artwork over it.
// The visitor drags it with a finger and pinches to resize. Its starting
// size is the real one for the distance they say they stand from the wall,
// from the typical phone camera's field of view — approximate, unlike the
// native AR viewers, which measure the wall. The phone's gyroscope keeps the
// artwork in place on the wall while the phone turns or tilts (walking is
// not tracked; "re-centre" undoes any drift). A photo of the result can be
// saved or shared.

interface CameraWallViewProps {
  image: string; // same-origin cut-out of the artwork (can be drawn to a canvas)
  title: string;
  widthCm: number;
  heightCm: number;
  onClose: () => void;
}

const DISTANCES = [1, 1.5, 2, 3];

// iPhone asks before a page may read the gyroscope, and only from a tap:
// call this in the click that opens the camera view.
let motionPermission: Promise<boolean> = Promise.resolve(true);
export function requestMotionPermission() {
  const DM =
    typeof window !== 'undefined'
      ? (window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> } | undefined)
      : undefined;
  if (DM?.requestPermission) {
    motionPermission = DM.requestPermission()
      .then((r) => r === 'granted')
      .catch(() => false);
  }
  return motionPermission;
}

function screenAngle() {
  if (typeof window === 'undefined') return 0;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return screen.orientation?.angle ?? legacy ?? 0;
}
// Typical main phone camera: ~63° across the long side of the frame, ~48°
// across the short side.
const FOV_LONG = 63;
const FOV_SHORT = 48;

export default function CameraWallView({ image, title, widthCm, heightCm, onClose }: CameraWallViewProps) {
  const { t, lang } = useApp();
  const cmLabel = lang === 'uz' ? 'sm' : lang === 'ru' ? 'см' : 'cm';
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [error, setError] = useState<'denied' | 'unsupported' | null>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [video, setVideo] = useState({ w: 0, h: 0 });
  const [distance, setDistance] = useState(2);
  const [scale, setScale] = useState(1); // the visitor's pinch on top of the real size
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null); // artwork centre, px
  const [saving, setSaving] = useState(false);
  // How far the phone has turned since the artwork was placed, as the
  // on-screen shift (px) and roll (degrees) that keep it on the same spot.
  const [track, setTrack] = useState({ x: 0, y: 0, roll: 0 });
  const [tracking, setTracking] = useState(false);
  const trackRef = useRef({ x: 0, y: 0, roll: 0 });
  const focalRef = useRef(0); // camera focal length in screen px
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number } | null>(null);

  // Camera on; off again when closing.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      queueMicrotask(() => setError('unsupported'));
      return;
    }
    md.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream = s;
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          v.play().catch(() => {});
        }
      })
      .catch((err) => setError(err?.name === 'NotAllowedError' ? 'denied' : 'unsupported'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  // The artwork image, also needed for the saved photo.
  useEffect(() => {
    const img = new Image();
    img.onload = () => (imgRef.current = img);
    img.src = image;
  }, [image]);

  useEffect(() => {
    const measure = () => {
      const r = boxRef.current?.getBoundingClientRect();
      if (r) setBox({ w: r.width, h: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // How the camera frame is laid over the screen (object-fit: cover) and how
  // many screen pixels one centimetre on the wall takes at that distance.
  const cover = video.w && box.w ? Math.max(box.w / video.w, box.h / video.h) : 0;
  const frameW = video.w * cover;
  const frameH = video.h * cover;
  const fovAcross = ((video.w >= video.h ? FOV_LONG : FOV_SHORT) * Math.PI) / 180;
  const wallAcrossCm = 2 * distance * 100 * Math.tan(fovAcross / 2);
  const pxPerCm = frameW && wallAcrossCm ? frameW / wallAcrossCm : 0;
  const artW = widthCm * pxPerCm * scale;
  const artH = heightCm * pxPerCm * scale;
  const base = pos || { x: box.w / 2, y: box.h * 0.42 };
  const center = { x: base.x + track.x, y: base.y + track.y };
  const focal = frameW ? frameW / 2 / Math.tan(fovAcross / 2) : 0;
  useEffect(() => {
    focalRef.current = focal;
  }, [focal]);

  // Gyroscope: integrate the rotation rate. Turning the phone left moves the
  // wall (and the artwork on it) right on screen, tilting it up moves it
  // down, rolling it turns it the other way. Portrait only.
  useEffect(() => {
    let last = 0;
    let frame = 0;
    let on = true;
    const onMotion = (e: DeviceMotionEvent) => {
      const r = e.rotationRate;
      const f = focalRef.current;
      const dt = last ? (e.timeStamp - last) / 1000 : 0;
      last = e.timeStamp;
      if (!r || r.beta == null || r.gamma == null || !f || dt <= 0 || dt > 0.2 || screenAngle() !== 0) return;
      const rad = Math.PI / 180;
      const tr = trackRef.current;
      tr.x += r.gamma * rad * dt * f;
      tr.y += r.beta * rad * dt * f;
      tr.roll += (r.alpha ?? 0) * dt;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setTrack({ ...trackRef.current });
          setTracking(true);
        });
      }
    };
    motionPermission.then((ok) => {
      if (ok && on) window.addEventListener('devicemotion', onMotion);
    });
    return () => {
      on = false;
      window.removeEventListener('devicemotion', onMotion);
      cancelAnimationFrame(frame);
    };
  }, []);

  const recenter = () => {
    trackRef.current = { x: 0, y: 0, roll: 0 };
    setTrack(trackRef.current);
    setPos(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(Math.min(4, Math.max(0.25, gesture.current.scale * (d / gesture.current.dist))));
    } else if (pointers.current.size === 1) {
      setPos({ x: base.x + (e.clientX - prev.x), y: base.y + (e.clientY - prev.y) });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  // The screen as a photo: camera frame + artwork with a soft shadow.
  const savePhoto = async () => {
    const v = videoRef.current;
    const img = imgRef.current;
    if (!v || !img || !box.w) return;
    setSaving(true);
    try {
      const k = Math.min(3, window.devicePixelRatio || 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(box.w * k);
      canvas.height = Math.round(box.h * k);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(k, k);
      ctx.drawImage(v, (box.w - frameW) / 2, (box.h - frameH) / 2, frameW, frameH);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.translate(center.x, center.y);
      ctx.rotate((track.roll * Math.PI) / 180);
      ctx.drawImage(img, -artW / 2, -artH / 2, artW, artH);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) return;
      const file = new File([blob], 'art-qala-wall.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title }).catch(() => {});
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
    } finally {
      setSaving(false);
    }
  };

  // Portalled to <body>: the wall-view dialog's backdrop blur would
  // otherwise become this full-screen layer's containing block.
  return createPortal(
    <div
      className="fixed inset-0 z-[140] bg-black text-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Rendered inside the wall-view dialog, whose backdrop click closes it.
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={boxRef}
        className="relative flex-1 overflow-hidden touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={(e) => {
            setVideo({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight });
            setReady(true);
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {ready && pxPerCm > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            draggable={false}
            className="absolute max-w-none pointer-events-none shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            style={{
              width: artW,
              height: artH,
              left: center.x - artW / 2,
              top: center.y - artH / 2,
              transform: track.roll ? `rotate(${track.roll}deg)` : undefined,
            }}
          />
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white/80" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/90">
            {error === 'denied' ? t.painting.camDenied : t.painting.camUnsupported}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/55 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
        {ready && (
          <div className="absolute top-3 left-3 right-16 text-[11px] leading-snug bg-black/45 rounded-[3px] px-2.5 py-1.5">
            {t.painting.camHint}
          </div>
        )}
      </div>

      <div className="bg-[#1D100B] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">
            {Math.round(widthCm)} × {Math.round(heightCm)} {cmLabel}
            {scale !== 1 && <span className="font-normal text-white/60"> · {t.painting.camAdjusted}</span>}
          </span>
          <div className="flex items-center gap-3">
            {tracking && (
              <button type="button" onClick={recenter} className="flex items-center gap-1 text-[#E8A27F]">
                <Crosshair className="w-3.5 h-3.5" />
                {t.painting.camRecenter}
              </button>
            )}
            {scale !== 1 && (
              <button type="button" onClick={() => setScale(1)} className="flex items-center gap-1 text-[#E8A27F]">
                <RotateCcw className="w-3.5 h-3.5" />
                {t.painting.camReset}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/70 shrink-0">{t.painting.camDistance}</span>
          {DISTANCES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDistance(d);
                setScale(1);
              }}
              className={`flex-1 text-xs py-1.5 rounded-full border ${
                distance === d ? 'bg-[#BA4E25] border-[#BA4E25]' : 'border-white/25'
              }`}
            >
              {d} m
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={savePhoto}
          disabled={!ready || saving}
          className="w-full flex items-center justify-center gap-2 bg-white text-[#281C18] font-semibold text-sm py-2.5 rounded-[3px] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {t.painting.camCapture}
        </button>
      </div>
    </div>,
    document.body
  );
}
