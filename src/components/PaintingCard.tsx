'use client';

import React from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import CardCornerBodom from '@/components/patterns/CardCornerBodom';

export interface PaintingItem {
  id: string;
  title_en: string;
  title_ru: string;
  title_uz: string;
  price: number;
  discount_price?: number | null;
  is_sold: boolean;
  is_featured?: boolean;
  is_bestseller?: boolean;
  images: string;
  artist: {
    name: string;
  };
  category: {
    name_en: string;
    name_ru: string;
    name_uz: string;
  };
}

interface PaintingCardProps {
  painting: PaintingItem;
}

export default function PaintingCard({ painting }: PaintingCardProps) {
  const { lang, formatPrice, wishlist, toggleWishlist, t } = useApp();

  const title =
    lang === 'ru'
      ? painting.title_ru
      : lang === 'uz'
      ? painting.title_uz
      : painting.title_en;

  const categoryName =
    lang === 'ru'
      ? painting.category.name_ru
      : lang === 'uz'
      ? painting.category.name_uz
      : painting.category.name_en;

  let imageSrc = '/assets/p-arch.svg';
  try {
    const parsed = JSON.parse(painting.images);
    if (Array.isArray(parsed) && parsed.length > 0) {
      imageSrc = parsed[0];
    }
  } catch {
    if (painting.images && !painting.images.startsWith('[')) {
      imageSrc = painting.images;
    }
  }

  const isFavorited = wishlist.includes(painting.id);
  const hasDiscount = !!painting.discount_price && painting.discount_price < painting.price;
  const discountPercent = hasDiscount
    ? Math.round(((painting.price - (painting.discount_price as number)) / painting.price) * 100)
    : 0;

  return (
    <div className="group bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] overflow-hidden flex flex-col h-full transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_35px_-15px_rgba(40,28,24,0.18)] hover:border-[#BA4E25]/40">
      {/* Artwork Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#F4ECE1]">
        <Link href={`/gallery/${painting.id}`} className="block w-full h-full">
          <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-108 group-hover:-rotate-[0.5deg]">
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        </Link>

        {/* Category Tag */}
        <div className="absolute top-3 left-3 bg-[#FDFBF9]/90 backdrop-blur-xs text-[#52443D] text-[10px] tracking-wider uppercase font-semibold px-2.5 py-1 rounded-full border border-[#E7E0D8] pointer-events-none">
          {categoryName}
        </div>

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 right-11 bg-[#BA4E25] text-white text-[10.5px] font-bold px-2 py-0.5 rounded-sm shadow-xs">
            -{discountPercent}%
          </div>
        )}

        {/* Wishlist Heart Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(painting.id);
          }}
          aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 shadow-xs ${
            isFavorited
              ? 'bg-[#BA4E25] text-white'
              : 'bg-white/85 text-[#554740] hover:text-[#BA4E25]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Sold Overlay */}
        {painting.is_sold && (
          <div className="absolute bottom-3 left-3 bg-[#281C18]/85 text-[#FAF4EC] text-[10px] tracking-widest uppercase font-semibold px-2.5 py-0.5 rounded-xs">
            {t.gallery.soldBadge}
          </div>
        )}

        {/* Bestseller Badge — most-inquired-about available paintings */}
        {!painting.is_sold && painting.is_bestseller && (
          <div className="absolute bottom-3 left-3 bg-[#DAA932] text-[#281C18] text-[10px] tracking-widest uppercase font-semibold px-2.5 py-0.5 rounded-xs shadow-xs">
            {t.gallery.bestsellerBadge}
          </div>
        )}

        {/* Bodomcha corner accent — appears on hover */}
        <CardCornerBodom />
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between gap-3">
        <div>
          <Link href={`/gallery/${painting.id}`}>
            <h3 className="font-serif text-[19px] sm:text-[20px] font-semibold text-[#281C18] leading-snug hover:text-[#BA4E25] transition-colors line-clamp-1">
              {title}
            </h3>
          </Link>
          <p className="text-xs text-[#726861] mt-0.5">
            {t.gallery.byArtist} {painting.artist.name}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE4]">
          <div className="flex flex-col">
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[#8F8178] line-through">
                  {formatPrice(painting.price)}
                </span>
                <span className="text-[15px] font-bold text-[#BA4E25]">
                  {formatPrice(painting.discount_price as number)}
                </span>
              </div>
            ) : (
              <span className="text-[15px] font-bold text-[#BA4E25]">
                {formatPrice(painting.price)}
              </span>
            )}
          </div>

          <Link
            href={`/gallery/${painting.id}`}
            className="text-xs font-semibold text-[#FAF4EC] bg-[#281C18] hover:bg-[#BA4E25] px-3.5 py-1.5 rounded-[3px] transition-all duration-300 hover:translate-x-0.5"
          >
            {t.gallery.inquireBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
