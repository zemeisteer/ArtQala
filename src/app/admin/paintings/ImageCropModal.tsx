'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Loader2, AlertTriangle, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Undo2 } from 'lucide-react';

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onCropped: (croppedFile: File) => void;
  onSkip: (originalFile: File) => void;
  // Round avatar mode (artist photos): the crop is locked to a square shown
  // as a circle, so the admin picks exactly what lands inside the round frame.
  circular?: boolean;
}

// Vercel rejects request bodies over ~4.5 MB, and /api/upload shrinks every
// photo to 1800px on its longest side anyway — so the browser never needs to
// send more than this. A full-resolution phone photo (12–48 MP) re-encoded
// as JPEG often went over the limit and the upload failed.
const MAX_OUTPUT_SIDE = 2400;
const AVATAR_OUTPUT_SIDE = 1200;
// An original under this size, in a format every browser shows, is uploaded
// untouched by "Kesmasdan yuklash".
const SAFE_ORIGINAL_BYTES = 3.5 * 1024 * 1024;
const JPEG_QUALITY = 0.9;

// The frame is kept in PERCENT of the image, never in on-screen pixels: the
// saved crop is computed from the image's real (natural) size at save time,
// so it always matches the frame shown, whatever size the photo is
// displayed at (and even if the window was resized or the phone rotated).
function centeredCropFor(width: number, height: number, aspect?: number): Crop {
  if (!aspect) {
    return { unit: '%', width: 90, height: 90, x: 5, y: 5 };
  }
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height), width, height);
}

// Changing the ratio keeps the frame where the admin put it (same centre,
// as large as fits) instead of jumping back to the middle of the photo.
function refitCrop(current: Crop | undefined, width: number, height: number, aspect?: number): Crop {
  if (!current || current.unit !== '%' || !current.width || !current.height) {
    return centeredCropFor(width, height, aspect);
  }
  if (!aspect) return current;
  const cx = ((current.x + current.width / 2) / 100) * width;
  const cy = ((current.y + current.height / 2) / 100) * height;
  const area = ((current.width / 100) * width * (current.height / 100) * height) || width * height * 0.8;
  let w = Math.sqrt(area * aspect);
  let h = w / aspect;
  const maxW = Math.min(width, 2 * cx, 2 * (width - cx)) || width;
  const maxH = Math.min(height, 2 * cy, 2 * (height - cy)) || height;
  const fit = Math.min(1, maxW / w, maxH / h);
  w *= fit;
  h *= fit;
  if (w < width * 0.1 || h < height * 0.1) return centeredCropFor(width, height, aspect);
  return {
    unit: '%',
    x: ((cx - w / 2) / width) * 100,
    y: ((cy - h / 2) / height) * 100,
    width: (w / width) * 100,
    height: (h / height) * 100,
  };
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

// Rotation in quarter turns + mirroring, all relative to what the admin
// sees (a mirror after a rotation flips the rotated picture).
interface Transform {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}
const IDENTITY: Transform = { rotation: 0, flipH: false, flipV: false };
const isIdentity = (t: Transform) => t.rotation === 0 && !t.flipH && !t.flipV;

// iOS Safari refuses canvases above ~16.7 million pixels (a 48 MP photo).
const MAX_CANVAS_PIXELS = 16_000_000;
const PREVIEW_SIDE = 1600;

// Draws the whole image rotated/mirrored onto a new canvas, scaled so its
// longest side is at most `maxSide` (and within the canvas pixel limit).
function drawTransformed(image: HTMLImageElement, t: Transform, maxSide: number): HTMLCanvasElement {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h), Math.sqrt(MAX_CANVAS_PIXELS / (w * h)));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const quarter = t.rotation === 90 || t.rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = quarter ? dh : dw;
  canvas.height = quarter ? dw : dh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  // Mirror first (outermost), then rotate: the mirror acts on the picture
  // as displayed, i.e. after the rotation.
  ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
  return canvas;
}

// Crops an image (or an already rotated/mirrored canvas) by a percent
// frame, at full resolution, scaled down to at most `maxSide`.
function getCroppedBlob(source: HTMLImageElement | HTMLCanvasElement, crop: Crop, maxSide: number): Promise<Blob> {
  const W = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const H = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const sx = Math.max(0, (crop.x / 100) * W);
  const sy = Math.max(0, (crop.y / 100) * H);
  const sw = Math.min(W - sx, (crop.width / 100) * W);
  const sh = Math.min(H - sy, (crop.height / 100) * H);
  if (sw < 1 || sh < 1) return Promise.reject(new Error('Empty crop'));

  const shrink = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * shrink));
  canvas.height = Math.max(1, Math.round(sh * shrink));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas not supported'));
  // JPEG has no transparency — a transparent PNG would otherwise turn black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas);
}

const jpegName = (name: string) => (/\.\w+$/.test(name) ? name.replace(/\.\w+$/, '.jpg') : `${name}.jpg`);

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Erkin', value: undefined },
  { label: 'Kvadrat', value: 1 },
  { label: 'Peyzaj 4:3', value: 4 / 3 },
  { label: 'Portret 3:4', value: 3 / 4 },
];

export default function ImageCropModal({ file, onCancel, onCropped, onSkip, circular = false }: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(circular ? 1 : undefined);
  const [crop, setCrop] = useState<Crop>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  // What ReactCrop shows: the original, or a rotated/mirrored preview of
  // it — so the frame always lies on exactly the picture that gets saved.
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // The original photo, decoded once into its own (detached) element; every
  // rotation is drawn from it. Not the displayed <img>, whose src becomes
  // the rotated preview.
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const [sourceReady, setSourceReady] = useState(false);
  useEffect(() => {
    if (!imageSrc) return;
    const source = new Image();
    source.onload = () => {
      sourceRef.current = source;
      setSourceReady(true);
    };
    source.src = imageSrc;
    return () => {
      source.onload = null;
    };
  }, [imageSrc]);
  const maxSide = circular ? AVATAR_OUTPUT_SIDE : MAX_OUTPUT_SIDE;

  // Created and revoked with the modal (the old version leaked one blob URL
  // per opened photo).
  useEffect(() => {
    const url = URL.createObjectURL(file);
    let active = true;
    // Set asynchronously: React's StrictMode runs this effect twice, and
    // each run must hand out its own, not-yet-revoked URL.
    Promise.resolve().then(() => {
      if (active) setImageSrc(url);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Builds the rotated/mirrored preview whenever the transform changes.
  useEffect(() => {
    const source = sourceRef.current;
    if (isIdentity(transform) || !sourceReady || !source?.naturalWidth) {
      Promise.resolve().then(() => setPreviewSrc(null));
      return;
    }
    let url: string | null = null;
    let active = true;
    drawTransformed(source, transform, PREVIEW_SIDE).toBlob(
      (blob) => {
        if (!blob || !active) return;
        url = URL.createObjectURL(blob);
        setPreviewSrc(url);
      },
      'image/jpeg',
      0.9
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [transform, sourceReady]);

  // Each rotation changes the picture's shape: start a fresh frame on it.
  const applyTransform = (next: Transform) => {
    setTransform(next);
    setCrop(undefined);
  };
  const rotate = (delta: 90 | -90) => {
    // With exactly one mirror on, turning the picture right means turning
    // the un-mirrored original left.
    const d = transform.flipH !== transform.flipV ? -delta : delta;
    applyTransform({ ...transform, rotation: (((transform.rotation + d) % 360) + 360) % 360 as Transform['rotation'] });
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setLoadFailed(false);
    setCrop((prev) => prev ?? centeredCropFor(naturalWidth, naturalHeight, aspect));
  };

  const changeAspect = (value: number | undefined) => {
    setAspect(value);
    const img = imgRef.current;
    if (img?.naturalWidth) setCrop((prev) => refitCrop(prev, img.naturalWidth, img.naturalHeight, value));
  };

  const cropIsUsable = !!crop && crop.width > 0 && crop.height > 0;

  const handleConfirmCrop = async () => {
    const img = imgRef.current;
    if (!crop || !img?.naturalWidth) return;
    setProcessing(true);
    try {
      // Rotated/mirrored: crop from a full-resolution transformed copy of
      // the original, not from the smaller on-screen preview.
      const source =
        !isIdentity(transform) && sourceRef.current
          ? drawTransformed(sourceRef.current, transform, Number.MAX_SAFE_INTEGER)
          : img;
      const blob = await getCroppedBlob(source, crop, maxSide);
      onCropped(new File([blob], jpegName(file.name), { type: 'image/jpeg' }));
    } catch {
      alert('Kesishda xatolik yuz berdi');
    } finally {
      setProcessing(false);
    }
  };

  // "Upload without cropping": the original as-is when it's small enough
  // and in a common format; otherwise the whole photo, re-encoded at a safe
  // size, so a big phone photo doesn't fail the upload.
  const handleSkip = async () => {
    const img = imgRef.current;
    const common = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const transformed = !isIdentity(transform) && !!sourceRef.current;
    if (!transformed && ((common && file.size <= SAFE_ORIGINAL_BYTES) || loadFailed || !img?.naturalWidth)) {
      onSkip(file);
      return;
    }
    setProcessing(true);
    try {
      // Keeps the rotation/mirroring, without cropping.
      const blob = transformed
        ? await canvasToJpeg(drawTransformed(sourceRef.current!, transform, maxSide))
        : await getCroppedBlob(img!, { unit: '%', x: 0, y: 0, width: 100, height: 100 }, maxSide);
      onSkip(new File([blob], jpegName(file.name), { type: 'image/jpeg' }));
    } catch {
      onSkip(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      {/* max-h + scroll: on a phone the buttons used to end up off-screen. */}
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-[#E7E0D8]">
        <div className="flex items-center justify-between border-b px-5 py-3.5 border-[#E7E0D8]">
          <h3 className="font-serif text-lg font-bold text-[#281C18]">
            {circular ? 'Fotoni doiraga joylashtirish' : 'Rasmni kesish'}
          </h3>
          <button onClick={onCancel} className="text-[#8F8178] hover:text-[#281C18]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full flex items-center justify-center bg-[#1D100B] p-2 min-h-[160px]">
          {loadFailed ? (
            <div className="flex items-start gap-2 text-xs text-[#FDE68A] p-4 max-w-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Brauzer bu rasmni ko&apos;rsata olmadi (masalan, iPhone&apos;ning HEIC formati), shuning uchun uni bu yerda
                kesib bo&apos;lmaydi. &quot;Kesmasdan yuklash&quot; tugmasini bosing yoki rasmni telefonda JPG formatida
                saqlab, qaytadan tanlang.
              </p>
            </div>
          ) : (
            imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={aspect}
                circularCrop={circular}
                // Clicking outside the frame used to delete it (then saving
                // failed with "Kesishda xatolik").
                keepSelection
                ruleOfThirds={!circular}
                className="max-h-[55vh] sm:max-h-[400px] max-w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={previewSrc || imageSrc}
                  alt="Kesiladigan rasm"
                  onLoad={onImageLoad}
                  onError={() => setLoadFailed(true)}
                  // Displayed size == element size (no object-fit letterboxing),
                  // so the frame sits exactly on the photo.
                  className="block max-h-[55vh] sm:max-h-[400px] max-w-full w-auto h-auto"
                />
              </ReactCrop>
            )
          )}
        </div>

        <div className="p-5 space-y-4">
          {!loadFailed && (
            <div>
              <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                Burish va ko&apos;zgu
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: 'Chapga 90°', icon: RotateCcw, onClick: () => rotate(-90) },
                  { label: "O'ngga 90°", icon: RotateCw, onClick: () => rotate(90) },
                  {
                    label: 'Gorizontal ko\'zgu',
                    icon: FlipHorizontal2,
                    onClick: () => applyTransform({ ...transform, flipH: !transform.flipH }),
                    active: transform.flipH,
                  },
                  {
                    label: 'Vertikal ko\'zgu',
                    icon: FlipVertical2,
                    onClick: () => applyTransform({ ...transform, flipV: !transform.flipV }),
                    active: transform.flipV,
                  },
                ].map(({ label, icon: Icon, onClick, active }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    disabled={processing}
                    title={label}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 ${
                      active
                        ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                        : 'bg-white text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
                {!isIdentity(transform) && (
                  <button
                    type="button"
                    onClick={() => applyTransform(IDENTITY)}
                    disabled={processing}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 text-[#429599] hover:underline disabled:opacity-50"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Asl holiga</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {!loadFailed &&
            (circular ? (
              <p className="text-[11px] text-[#6B5E55]">
                Doirani suring va burchagidan tortib kattalashtiring yoki kichraytiring — saytda aynan doira ichidagi
                qism ko&apos;rinadi.
              </p>
            ) : (
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
            ))}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
            >
              Bekor qilish
            </button>
            {(!circular || loadFailed) && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={processing}
                className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Kesmasdan yuklash
              </button>
            )}
            {!loadFailed && (
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={processing || !cropIsUsable}
                className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50 flex items-center gap-1.5"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{processing ? 'Kesilmoqda...' : circular ? 'Saqlash' : 'Kesish va yuklash'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
