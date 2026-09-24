'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import PaintingCard, { PaintingItem } from '@/components/PaintingCard';
import PhoneInput from '@/components/PhoneInput';
import ShippingEstimator from '@/components/ShippingEstimator';
import AccessoryCheckboxes, { SelectedAccessory } from '@/components/AccessoryCheckboxes';
import { getSizeBucket } from '@/lib/paintingSize';
import { effectiveProductType } from '@/lib/productType';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Send,
  Star,
  MessageSquarePlus,
  X,
  Sparkles,
  Lock,
  Info,
  ZoomIn,
} from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';

interface PaintingDetailClientProps {
  painting: any;
  relatedPaintings?: any[];
}

export default function PaintingDetailClient({ painting, relatedPaintings = [] }: PaintingDetailClientProps) {
  const { lang, formatPrice, wishlist, toggleWishlist, t, user } = useApp();

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<SelectedAccessory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reviews state (TZ 8.12)
  const [reviews, setReviews] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Review eligibility
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Review modal form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);

  // Track painting view once when client mounts
  useEffect(() => {
    if (painting?.id) {
      fetch(`/api/paintings/${painting.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [painting?.id]);

  // Load reviews for this specific painting
  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/reviews?painting_id=${painting.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
          setTotalReviews(data.total_reviews || 0);
          setAverageRating(data.average_rating || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load painting reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Check if current user can review this painting (TZ 8.12: must have inquired/purchased)
  const checkReviewEligibility = async () => {
    try {
      const res = await fetch(`/api/user/can-review?painting_id=${painting.id}`);
      if (res.ok) {
        const data = await res.json();
        setCanReview(!!data.can_review);
        setHasReviewed(!!data.has_reviewed);
      } else {
        setCanReview(false);
      }
    } catch {
      setCanReview(false);
    }
  };

  useEffect(() => {
    if (painting?.id) {
      fetchReviews();
      checkReviewEligibility();
    }
    if (user?.name) {
      setReviewAuthor(user.name);
    }
  }, [painting?.id, user]);

  const title =
    lang === 'ru'
      ? painting.title_ru
      : lang === 'uz'
      ? painting.title_uz
      : painting.title_en;

  const description =
    lang === 'ru'
      ? painting.description_ru || painting.description_en
      : lang === 'uz'
      ? painting.description_uz || painting.description_en
      : painting.description_en;

  const technique =
    lang === 'ru'
      ? painting.technique_ru || painting.technique_en
      : lang === 'uz'
      ? painting.technique_uz || painting.technique_en
      : painting.technique_en;

  const categoryName =
    lang === 'ru'
      ? painting.category.name_ru
      : lang === 'uz'
      ? painting.category.name_uz
      : painting.category.name_en;

  let imageList: string[] = ['/assets/p-arch.svg'];
  try {
    const parsed = JSON.parse(painting.images);
    if (Array.isArray(parsed) && parsed.length > 0) {
      imageList = parsed;
    }
  } catch {
    if (painting.images && !painting.images.startsWith('[')) {
      imageList = [painting.images];
    }
  }
  const imageSrc = imageList[Math.min(activeImage, imageList.length - 1)];

  const isFavorited = wishlist.includes(painting.id);
  const hasDiscount = !!painting.discount_price && painting.discount_price < painting.price;
  const discountPercent = hasDiscount
    ? Math.round(((painting.price - (painting.discount_price as number)) / painting.price) * 100)
    : 0;

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painting_id: painting.id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          message,
          selected_accessories: selectedAccessories,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setMessage('');
        setSelectedAccessories([]);
        // Re-check review eligibility now that an inquiry was placed
        checkReviewEligibility();
      }
    } catch (err) {
      console.error('Failed to submit inquiry', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewErrorMessage(null);
    setReviewSuccessMessage(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painting_id: painting.id,
          rating: reviewRating,
          author_name: reviewAuthor.trim() || user?.name || t.reviews.verifiedCollectorBadge,
          text: reviewText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReviewSuccessMessage(
          lang === 'uz'
            ? "Sharhingiz uchun rahmat! Moderatsiyadan so'ng (admin tasdiqlagach) saytda ko'rinadi."
            : lang === 'ru'
            ? 'Спасибо за ваш отзыв! Он появится на сайте после проверки модератором.'
            : 'Thank you! Your review has been submitted and will appear on the site after admin approval.'
        );
        setReviewText('');
        setHasReviewed(true);
        setTimeout(() => {
          setShowReviewModal(false);
          setReviewSuccessMessage(null);
        }, 2800);
      } else {
        setReviewErrorMessage(data.error || t.reviews.submitError);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewErrorMessage(t.reviews.networkError);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: t.nav.gallery, href: '/gallery' }, { label: title }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#BA4E25] hover:underline mb-8 mt-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.painting.backToGallery}</span>
        </Link>

        {/* 2-Column Split Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left Art View */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative aspect-square w-full rounded-[4px] overflow-hidden border border-[#E7E0D8] bg-[#F4ECE1] shadow-md">
              {/* The whole artwork is always visible (contain, not cover) —
                  a tall or wide painting used to get its edges cropped off.
                  Clicking opens the full-screen viewer. */}
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute inset-0 cursor-zoom-in"
                aria-label={t.painting.enlarge}
              >
                <Image
                  src={imageSrc}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-contain p-3 sm:p-5"
                />
              </button>
              <span className="pointer-events-none absolute top-4 left-4 w-9 h-9 rounded-full bg-white/85 text-[#4D3F38] flex items-center justify-center shadow-sm">
                <ZoomIn className="w-4 h-4" />
              </span>

              {/* Wishlist toggle button */}
              <button
                onClick={() => toggleWishlist(painting.id)}
                aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 shadow-md ${
                  isFavorited
                    ? 'bg-[#BA4E25] text-white'
                    : 'bg-white/90 text-[#4D3F38] hover:text-[#BA4E25]'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>

              {/* Sold Badge */}
              {painting.is_sold && (
                <div className="absolute bottom-4 left-4 bg-[#281C18]/90 text-white text-xs tracking-widest uppercase font-semibold px-3 py-1 rounded-[2px]">
                  {t.gallery.soldBadge}
                </div>
              )}

              {/* Bestseller Badge — most-inquired-about available paintings */}
              {!painting.is_sold && painting.is_bestseller && (
                <div className="absolute bottom-4 left-4 bg-[#DAA932] text-[#281C18] text-xs tracking-widest uppercase font-semibold px-3 py-1 rounded-[2px] shadow-xs">
                  {t.gallery.bestsellerBadge}
                </div>
              )}
            </div>

            {imageList.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {imageList.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`relative w-20 h-20 shrink-0 rounded-[3px] overflow-hidden border-2 bg-[#F4ECE1] transition-colors cursor-pointer ${
                      idx === activeImage ? 'border-[#BA4E25]' : 'border-[#E7E0D8] hover:border-[#D2C5BA]'
                    }`}
                    aria-label={`${title} — ${idx + 1}`}
                  >
                    <Image src={src} alt="" fill sizes="80px" className="object-contain p-1" />
                  </button>
                ))}
              </div>
            )}

            {lightboxOpen && (
              <ImageLightbox
                images={imageList}
                startIndex={Math.min(activeImage, imageList.length - 1)}
                alt={title}
                onClose={() => setLightboxOpen(false)}
              />
            )}

            {/* Certificate of Authenticity Info Box */}
            <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[3px] p-5 flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-[#429599] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif font-semibold text-base text-[#281C18]">
                  {t.painting.authenticity}
                </h4>
                <p className="text-xs text-[#6B5E55] mt-1 leading-relaxed">
                  {t.painting.authenticityDesc}
                </p>
                <Link
                  href={`/certificate/${painting.id}`}
                  target="_blank"
                  className="inline-block mt-2 text-xs font-bold text-[#BA4E25] hover:underline"
                >
                  {t.painting.viewCertificateLink}
                </Link>
              </div>
            </div>

            {/* TZ 8.12: Reviews and Ratings Section under Artwork Description */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 sm:p-7 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EFE8DE]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-widest text-[#429599] uppercase">
                      {t.reviews.collectorReviewsEyebrow}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[#DAA932]" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-[#281C18] mt-1">
                    {t.reviews.authenticImpressions}
                  </h3>
                </div>

                {/* Rating summary badge */}
                <div className="flex items-center gap-3">
                  {totalReviews > 0 ? (
                    <div className="flex items-center gap-2 bg-[#FAF4EC] px-3.5 py-2 border border-[#E7E0D8] rounded-[3px]">
                      <span className="text-xl font-serif font-bold text-[#281C18]">
                        {averageRating.toFixed(1)}
                      </span>
                      <div className="flex text-[#DAA932]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.round(averageRating) ? 'fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#726861] pl-1 font-medium">
                        ({totalReviews} {totalReviews === 1 ? t.reviews.reviewSingular : t.reviews.reviewPlural})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8F8178] italic">
                      {t.reviews.noApprovedReviewsYet}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Call-to-Action / Permission Notice */}
              <div className="bg-[#FAF4EC]/70 border border-[#E7E0D8] rounded-[3px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-[#6B5E55] leading-relaxed flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#BA4E25] shrink-0 mt-0.5" />
                  <span>
                    <strong>{t.reviews.verifiedInquirersOnlyLabel}</strong> {t.reviews.verifiedInquirersOnlyDesc}
                  </span>
                </div>

                {canReview ? (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="shrink-0 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold px-4 py-2 rounded-[3px] transition flex items-center gap-1.5 shadow-xs"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>{hasReviewed ? t.reviews.updateReviewBtn : t.reviews.writeReviewBtn}</span>
                  </button>
                ) : user ? (
                  <span className="text-[11px] text-[#8F8178] italic shrink-0">
                    {t.reviews.unlockReviewsHint}
                  </span>
                ) : (
                  <Link
                    href="/signin"
                    className="shrink-0 text-xs font-semibold text-[#BA4E25] hover:underline"
                  >
                    {t.reviews.signInToReview}
                  </Link>
                )}
              </div>

              {/* Reviews List */}
              {loadingReviews ? (
                <div className="py-6 text-center text-xs text-[#8F8178]">
                  {t.reviews.loadingReviews}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4 divide-y divide-[#F0EAE1]">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-semibold text-sm text-[#281C18]">
                            {rev.author_name}
                          </span>
                          <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            {t.account.verifiedBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex text-[#DAA932]">
                            {[...Array(rev.rating)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-current" />
                            ))}
                          </div>
                          <span className="text-[11px] text-[#9E9086]">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-[#554740] leading-relaxed italic">
                        "{rev.text}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#8F8178]">
                  {t.reviews.beFirstReview.replace('{title}', title)}
                </div>
              )}
            </div>
          </div>

          {/* Right Details & Inquiry Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Meta tags */}
            <div className="flex items-center gap-2">
              <span className="bg-[#FDFBF9] border border-[#E7E0D8] text-[#554740] text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">
                {categoryName}
              </span>
              {hasDiscount && (
                <span className="bg-[#BA4E25] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">
                  -{discountPercent}% {t.painting.promotionSuffix}
                </span>
              )}
            </div>

            {/* Title & Artist */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#281C18] leading-tight">
                {title}
              </h1>
              <p className="text-sm text-[#726861] mt-1.5">
                {t.gallery.byArtist}{' '}
                <Link
                  href="/artists"
                  className="font-medium text-[#281C18] hover:text-[#BA4E25] underline decoration-[#E7E0D8] underline-offset-4"
                >
                  {painting.artist.name}
                </Link>{' '}
                · {painting.year}
              </p>
            </div>

            {/* Price section */}
            <div className="p-4 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] flex items-baseline gap-3">
              {hasDiscount ? (
                <>
                  <span className="font-serif text-3xl font-bold text-[#BA4E25]">
                    {formatPrice(painting.discount_price)}
                  </span>
                  <span className="text-sm text-[#8F8178] line-through">
                    {formatPrice(painting.price)}
                  </span>
                </>
              ) : (
                <span className="font-serif text-3xl font-bold text-[#BA4E25]">
                  {formatPrice(painting.price)}
                </span>
              )}
              <span className="text-xs text-[#8F8178] ml-auto">
                {painting.is_sold ? t.gallery.soldBadge : t.painting.availableStatus}
              </span>
            </div>

            {/* Specifications */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-[#E7E0D8] p-3 rounded-[2px] bg-[#FDFBF9]">
                <span className="text-[#8F8178] block uppercase text-[10px] tracking-wider">
                  {t.painting.size}
                </span>
                <span className="font-semibold text-[#281C18] mt-0.5 block">
                  {painting.size}
                </span>
              </div>
              <div className="border border-[#E7E0D8] p-3 rounded-[2px] bg-[#FDFBF9]">
                <span className="text-[#8F8178] block uppercase text-[10px] tracking-wider">
                  {t.painting.technique}
                </span>
                <span className="font-semibold text-[#281C18] mt-0.5 block">
                  {technique}
                </span>
              </div>
            </div>

            {/* Artwork Description */}
            <p className="text-sm text-[#5F534C] leading-relaxed">{description}</p>

            {/* Shipping Cost Estimator */}
            <ShippingEstimator sizeString={painting.size} />

            {/* Direct Inquiry Form */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-6 space-y-4 shadow-sm">
              <h3 className="font-serif text-xl font-semibold text-[#281C18]">
                {t.painting.inquireTitle}
              </h3>
              <p className="text-xs text-[#726861] leading-relaxed">
                {t.painting.inquireDesc}
              </p>

              {submitted ? (
                <div className="p-4 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[3px] text-xs text-[#1B5E20] flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-[#2E7D32]" />
                  <div>
                    <span className="font-semibold block">{t.painting.inquirySuccess}</span>
                    <span className="text-[11px] text-[#2E7D32] mt-1 block">
                      {t.reviews.eligibleNote}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                      {t.painting.yourName} *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Elena Rostova"
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
                      placeholder="you@example.com"
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
                      placeholder="I would like to inquire about reservation, delivery to my hotel in Tashkent, or international shipping..."
                      className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] resize-none"
                    />
                    <p className="text-[10.5px] text-[#8F8178] mt-1.5 flex items-start gap-1">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{t.painting.protectiveCaseHint}</span>
                    </p>
                  </div>

                  <AccessoryCheckboxes
                    productTypes={[effectiveProductType(painting.category)].filter((t): t is string => Boolean(t))}
                    sizeBucket={getSizeBucket(painting.size)}
                    onChange={setSelectedAccessories}
                  />

                  <button
                    type="submit"
                    disabled={submitting || !phoneValid}
                    className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs py-2.5 rounded-[3px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? t.painting.sending : t.painting.sendInquiry}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Related Paintings Carousel */}
        {relatedPaintings.length > 0 && (
          <div className="mt-16 sm:mt-20 pt-10 border-t border-[#E7E0D8]">
            <div className="mb-6">
              <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
                {t.painting.relatedEyebrow}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#281C18] mt-1">
                {t.painting.relatedTitle}
              </h2>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14 scrollbar-none">
              {relatedPaintings.map((p) => (
                <div key={p.id} className="w-[240px] sm:w-[260px] shrink-0">
                  <PaintingCard painting={p as PaintingItem} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TZ 8.12: Write Review Modal for Verified Inquirers */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#281C18]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowReviewModal(false)}
              className="absolute top-5 right-5 text-[#8F8178] hover:text-[#281C18] p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#429599] uppercase">
                {t.reviews.modalEyebrow}
              </span>
              <h3 className="font-serif text-2xl font-semibold text-[#281C18] mt-1">
                {t.reviews.modalTitleShare.replace('{title}', title)}
              </h3>
              <p className="text-xs text-[#726861] mt-1">
                {t.reviews.modalDescModerated}
              </p>
            </div>

            {reviewSuccessMessage ? (
              <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-[3px] text-xs text-[#16A34A] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{reviewSuccessMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {reviewErrorMessage && (
                  <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">
                    {reviewErrorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                    {t.reviews.ratingLabel}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`p-2 rounded-[2px] border transition-all ${
                          reviewRating >= star
                            ? 'text-[#DAA932] border-[#DAA932] bg-white shadow-xs'
                            : 'text-gray-300 border-[#E7E0D8] bg-[#FDFBF9]'
                        }`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            reviewRating >= star ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.reviews.yourNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="e.g. Jean-Luc Moreau"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.reviews.yourReviewLabel}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={t.reviews.reviewPlaceholder}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2.5 text-xs text-[#726861] hover:text-[#281C18] transition"
                  >
                    {t.reviews.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReview ? t.reviews.submitting : t.reviews.submitForApproval}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
