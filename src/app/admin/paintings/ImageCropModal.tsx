'use client';

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Loader2 } from 'lucide-react';

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onCropped: (croppedFile: File) => void;
  onSkip: (originalFile: File) => void;
}

function centeredCropFor(width: number, height: number, aspect?: number): Crop {
  if (!aspect) {
    // Free-form: start with a crop covering most of the image, no ratio lock.
    return centerCrop(
      { unit: '%', width: 90, height: 90, x: 5, y: 5 },
      width,
      height
    );
  }
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
    width,
    height
  );
}

function getCroppedBlob(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pixelCrop.width * scaleX);
  canvas.height = Math.round(pixelCrop.height * scaleY);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
      'image/jpeg',
      0.92
    );
  });
}

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Erkin', value: undefined },
  { label: 'Kvadrat', value: 1 },
  { label: 'Peyzaj 4:3', value: 4 / 3 },
  { label: 'Portret 3:4', value: 3 / 4 },
];

export default function ImageCropModal({ file, onCancel, onCropped, onSkip }: ImageCropModalProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centeredCropFor(width, height, aspect));
    },
    [aspect]
  );

  const changeAspect = (value: number | undefined) => {
    setAspect(value);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centeredCropFor(width, height, value));
    }
  };

  const handleConfirmCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const croppedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
        type: 'image/jpeg',
      });
      onCropped(croppedFile);
    } catch {
      alert('Kesishda xatolik yuz berdi');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl border border-[#E7E0D8] overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5 border-[#E7E0D8]">
          <h3 className="font-serif text-lg font-bold text-[#281C18]">Rasmni kesish</h3>
          <button onClick={onCancel} className="text-[#8F8178] hover:text-[#281C18]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full max-h-[420px] overflow-hidden flex items-center justify-center bg-[#1D100B] p-2">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[400px] max-w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Kesiladigan rasm"
              onLoad={onImageLoad}
              // Fit the whole photo inside the box whatever its shape — a
              // very wide or very tall original used to spill past the modal.
              className="block max-h-[400px] max-w-full w-auto h-auto object-contain"
            />
          </ReactCrop>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
              Nisbat
            </label>
            <p className="text-[10.5px] text-[#8F8178] mb-2">
              &quot;Erkin&quot; tanlansa, kesish chegarasini burchaklaridan tortib xohlagancha o&apos;zgartirishingiz mumkin.
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {ASPECT_PRESETS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => changeAspect(opt.value)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    aspect === opt.value
                      ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                      : 'bg-white text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => onSkip(file)}
              className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
            >
              Kesmasdan yuklash
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={processing || !completedCrop}
              className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50 flex items-center gap-1.5"
            >
              {processing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{processing ? 'Kesilmoqda...' : 'Kesish va yuklash'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
