'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  startIndex: number;
  alt: string;
  onClose: () => void;
}

// Full-screen artwork viewer. The page stays visible (dimmed and blurred)
// around the image on all four sides rather than being replaced by a solid
// backdrop, and the artwork is always shown whole (object-contain) — a
// click zooms 2.5x into the clicked spot, moving the mouse pans, another
// click zooms back out. ←/→ switch images, Esc closes.
export default function ImageLightbox({ images, startIndex, alt, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && count > 1) go(1);
      if (e.key === 'ArrowLeft' && count > 1) go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, go, count]);

  const originFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return `${x}% ${y}%`;
  };

  // Portaled to <body> so no ancestor's layout (e.g. a `space-y-*` margin,
  // or a transform creating a new containing block) can offset the overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-[#140B07]/55 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
            setOrigin('50% 50%');
          }}
          className="w-10 h-10 rounded-full bg-white/90 text-[#281C18] flex items-center justify-center shadow-md hover:bg-white cursor-pointer"
          aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
        >
          {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/90 text-[#281C18] flex items-center justify-center shadow-md hover:bg-white cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 text-[#281C18] flex items-center justify-center shadow-md hover:bg-white cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 text-[#281C18] flex items-center justify-center shadow-md hover:bg-white cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-xs font-semibold text-white bg-black/40 px-3 py-1 rounded-full">
            {index + 1} / {count}
          </div>
        </>
      )}

      <div
        className={`relative w-[92vw] h-[86vh] overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          e.stopPropagation();
          if (zoomed) {
            setZoomed(false);
          } else {
            setOrigin(originFromEvent(e));
            setZoomed(true);
          }
        }}
        onMouseMove={(e) => {
          if (zoomed) setOrigin(originFromEvent(e));
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out"
          style={{ transform: zoomed ? 'scale(2.5)' : 'scale(1)', transformOrigin: origin }}
        >
          <Image
            src={images[index]}
            alt={alt}
            fill
            sizes="100vw"
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
