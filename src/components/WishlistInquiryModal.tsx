'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { X, Send, CheckCircle2, Info } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import AccessoryCheckboxes, { SelectedAccessory } from '@/components/AccessoryCheckboxes';
import { getSizeBucket } from '@/lib/paintingSize';
import { paintingAccessoryTargets } from '@/lib/productType';
import { trackLead } from '@/lib/analytics';
import { mainImage } from '@/lib/paintingImages';

interface WishlistPaintingLite {
  id: string;
  title_en: string;
  title_ru: string;
  title_uz: string;
  images: string;
  size?: string;
  price?: number;
  discount_price?: number | null;
  category?: { slug: string; parent?: { slug: string } | null };
  included_accessories?: string[];
}

interface WishlistInquiryModalProps {
  paintings: WishlistPaintingLite[];
  onClose: () => void;
}

const paintingThumb = (images: string) => mainImage(images);

// What this painting's accessories are scoped to (its product type).
const productTypesOf = (p: WishlistPaintingLite) => paintingAccessoryTargets(p.category);

export default function WishlistInquiryModal({ paintings, onClose }: WishlistInquiryModalProps) {
  const { t, lang, user, formatPrice } = useApp();

  const [selectedIds, setSelectedIds] = useState<string[]>(paintings.map((p) => p.id));
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [message, setMessage] = useState('');
  // Accessories are chosen per painting (a case for one canvas, framing for
  // another) and the whole selection is sent as ONE inquiry.
  const [accessoriesByPainting, setAccessoriesByPainting] = useState<Record<string, SelectedAccessory[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const selectedPaintings = paintings.filter((p) => selectedIds.includes(p.id));

  const paintingPrice = (p: WishlistPaintingLite) => p.discount_price || p.price || 0;
  const accessoriesFor = (id: string) => accessoriesByPainting[id] || [];
  // Indicative only — the server re-prices everything from the DB.
  const estimatedTotal = selectedPaintings.reduce(
    (sum, p) => sum + paintingPrice(p) + accessoriesFor(p.id).reduce((s, a) => s + a.price, 0),
    0
  );

  const title = (p: WishlistPaintingLite) =>
    lang === 'ru' ? p.title_ru : lang === 'uz' ? p.title_uz : p.title_en;

  const removeItem = (id: string) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedIds.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedIds.map((id) => ({
            painting_id: id,
            accessory_ids: accessoriesFor(id).map((a) => a.id),
          })),
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          message,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to send inquiry');
        return;
      }
      setSubmitted(true);
      trackLead('wishlist_inquiry', { items: selectedIds.length });
    } catch {
      setError('Network error while sending inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1D100B]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8F8178] hover:text-[#281C18] p-1 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="font-serif text-2xl font-semibold text-[#281C18]">
            {t.wishlistInquiry.title}
          </h3>
          <p className="text-xs text-[#726861] mt-1">{t.wishlistInquiry.subtitle}</p>
        </div>

        {submitted ? (
          <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-[3px] text-xs text-[#16A34A] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{t.wishlistInquiry.success}</span>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                {t.wishlistInquiry.selectedPieces} ({selectedPaintings.length})
              </label>
              {selectedPaintings.length === 0 ? (
                <p className="text-xs text-[#8F8178] italic">{t.wishlistInquiry.emptyAfterRemove}</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedPaintings.map((p) => (
                    <div key={p.id} className="bg-white border border-[#E7E0D8] rounded-[2px] p-2 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-[2px] overflow-hidden relative shrink-0 bg-[#F4ECE1]">
                          <Image src={paintingThumb(p.images)} alt={title(p)} fill sizes="40px" className="object-cover" />
                        </div>
                        <span className="text-xs font-medium text-[#281C18] flex-1 truncate">
                          {title(p)}
                        </span>
                        {paintingPrice(p) > 0 && (
                          <span className="text-xs font-semibold text-[#554740] shrink-0">{formatPrice(paintingPrice(p))}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(p.id)}
                          className="text-[#8F8178] hover:text-[#BA4E25] shrink-0"
                          aria-label={t.wishlistInquiry.removeItem}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <AccessoryCheckboxes
                        compact
                        heading={t.wishlistInquiry.addOnsFor}
                        productTypes={productTypesOf(p)}
                        sizeBucket={getSizeBucket(p.size)}
                        included={p.included_accessories}
                        onChange={(list) => setAccessoriesByPainting((prev) => ({ ...prev, [p.id]: list }))}
                      />
                    </div>
                  ))}
                </div>
              )}
              {selectedPaintings.length > 0 && estimatedTotal > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#281C18] border-t border-[#E7E0D8] pt-2">
                  <span>{t.wishlistInquiry.total}</span>
                  <span>{formatPrice(estimatedTotal)}</span>
                </div>
              )}
              {selectedPaintings.length > 0 && estimatedTotal > 0 && (
                <p className="text-[10.5px] text-[#8F8178] mt-0.5">{t.wishlistInquiry.totalHint}</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.painting.yourName} *
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.painting.yourEmail} *
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.painting.yourPhone} *
                </label>
                <PhoneInput value={guestPhone} onChange={setGuestPhone} onValidityChange={setPhoneValid} required />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.painting.yourMessage} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] resize-none"
                />
                <p className="text-[10.5px] text-[#8F8178] mt-1.5 flex items-start gap-1">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{t.painting.protectiveCaseHint}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || selectedIds.length === 0 || !phoneValid}
                className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs py-2.5 rounded-[3px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? t.painting.sending : t.wishlistInquiry.sendBtn}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
