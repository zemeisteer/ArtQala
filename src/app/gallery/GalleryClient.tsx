'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import PaintingCard, { PaintingItem } from '@/components/PaintingCard';
import WishlistInquiryModal from '@/components/WishlistInquiryModal';
import { Search, Heart, SlidersHorizontal, Send, ChevronDown, X, Palette, CalendarDays, Ruler, Layers, Wallet } from 'lucide-react';
import AnimatedMadohil from '@/components/patterns/AnimatedMadohil';
import DandanaScrollTrack from '@/components/patterns/DandanaScrollTrack';
import Breadcrumbs from '@/components/Breadcrumbs';
import FilterSelect from '@/components/FilterSelect';
import PublicPagination from '@/components/PublicPagination';
import { getSizeBucket } from '@/lib/paintingSize';
import { effectiveProductType } from '@/lib/productType';

// Paintings per page (15 rows of the 4-column desktop grid).
const PAGE_SIZE = 60;

interface GalleryClientProps {
  paintings: any[];
  categories: any[];
}

export default function GalleryClient({ paintings, categories }: GalleryClientProps) {
  const { lang, t, wishlist, currency, currencyRate } = useApp();
  const searchParams = useSearchParams();

  // The top pills are product types only (ota kategoriya — Kartina,
  // Kulolchilik, ...); the subject/theme (bola kategoriya — Portret,
  // Tabiat, ...) is a separate filter below, scoped to whichever product
  // type is selected — showing both flattened together as pills made it
  // impossible to tell which was which, and picking a product-type pill
  // used to only match paintings tagged with that exact category, missing
  // every painting actually tagged with one of its themes.
  const topLevelCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  // Every filter starts from the URL (and is written back to it below), so
  // a filtered view can be linked, bookmarked or shared — and links like the
  // Artists page's "View works" (?artist=<id>) or ?q=... actually apply.
  const param = (key: string, fallback = 'all') => searchParams.get(key) || fallback;

  const [selectedCategory, setSelectedCategory] = useState<string>(() => param('category'));
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(() => param('theme'));
  const [searchQuery, setSearchQuery] = useState<string>(() => param('q', ''));
  const [onlyWishlist, setOnlyWishlist] = useState<boolean>(() => searchParams.get('wishlist') === 'true');
  const [showWishlistInquiry, setShowWishlistInquiry] = useState<boolean>(false);

  // Advanced filters: artist / year / size / price, plus sort order
  const [selectedArtistId, setSelectedArtistId] = useState<string>(() => param('artist'));
  const [selectedYear, setSelectedYear] = useState<string>(() => param('year'));
  const [selectedSize, setSelectedSize] = useState<string>(() => param('size'));
  // Price bounds are typed in the currency the visitor is browsing in.
  const [minPrice, setMinPrice] = useState<string>(() => param('min', ''));
  const [maxPrice, setMaxPrice] = useState<string>(() => param('max', ''));
  const [sortBy, setSortBy] = useState<string>(() => param('sort', 'newest'));
  const [page, setPage] = useState<number>(() => Math.max(1, parseInt(param('page', '1')) || 1));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(
    () => ['theme', 'artist', 'year', 'size', 'min', 'max'].some((k) => searchParams.get(k))
  );

  // Theme/subject options that actually exist under the selected product
  // type — an "All" ota pill has no single parent to scope by, so no theme
  // options are offered until a specific product type is chosen.
  const subCategoryOptions = useMemo(() => {
    if (selectedCategory === 'all') return [];
    const ota = topLevelCategories.find((c) => c.slug === selectedCategory);
    if (!ota) return [];
    return categories.filter((c) => c.parent_id === ota.id);
  }, [categories, topLevelCategories, selectedCategory]);

  // Reset the theme filter whenever the product type changes — otherwise a
  // theme from the previous product type could stay selected and silently
  // filter everything to zero results.
  const isFirstCategoryRender = useRef(true);
  useEffect(() => {
    if (isFirstCategoryRender.current) {
      isFirstCategoryRender.current = false;
      return;
    }
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  // Scoped to the selected product type + theme, so the artist/year lists in
  // Advanced Filters only ever offer choices that actually exist within it —
  // picking a category then an artist/year that has no work there is what
  // used to silently return zero results.
  const categoryScopedPaintings = useMemo(() => {
    return paintings.filter((p) => {
      if (selectedSubCategory !== 'all') return p.category?.slug === selectedSubCategory;
      if (selectedCategory !== 'all') return effectiveProductType(p.category) === selectedCategory;
      return true;
    });
  }, [paintings, selectedCategory, selectedSubCategory]);

  const artistOptions = useMemo(() => {
    const map = new Map<string, string>();
    categoryScopedPaintings.forEach((p) => {
      if (p.artist?.id && p.artist?.name) map.set(p.artist.id, p.artist.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryScopedPaintings]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    categoryScopedPaintings.forEach((p) => {
      if (p.year) years.add(p.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [categoryScopedPaintings]);

  // If switching category makes the current artist/year selection invalid,
  // reset it instead of silently filtering everything to zero results.
  useEffect(() => {
    if (selectedArtistId !== 'all' && !artistOptions.some((a) => a.id === selectedArtistId)) {
      setSelectedArtistId('all');
    }
    if (selectedYear !== 'all' && !yearOptions.some((y) => String(y) === selectedYear)) {
      setSelectedYear('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSubCategory]);

  const activeAdvancedCount = [
    selectedSubCategory !== 'all',
    selectedArtistId !== 'all',
    selectedYear !== 'all',
    selectedSize !== 'all',
    !!minPrice || !!maxPrice,
  ].filter(Boolean).length;
  const hasActiveAdvancedFilters = activeAdvancedCount > 0;

  const clearAdvancedFilters = () => {
    setSelectedSubCategory('all');
    setSelectedArtistId('all');
    setSelectedYear('all');
    setSelectedSize('all');
    setMinPrice('');
    setMaxPrice('');
  };

  const resetEverything = () => {
    clearAdvancedFilters();
    setSelectedCategory('all');
    setSearchQuery('');
    setOnlyWishlist(false);
  };

  // Mirror the filters into the URL. replaceState (not router.replace) so
  // typing in the search box doesn't add history entries or refetch the page.
  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedCategory !== 'all') next.set('category', selectedCategory);
    if (selectedSubCategory !== 'all') next.set('theme', selectedSubCategory);
    if (searchQuery.trim()) next.set('q', searchQuery.trim());
    if (onlyWishlist) next.set('wishlist', 'true');
    if (selectedArtistId !== 'all') next.set('artist', selectedArtistId);
    if (selectedYear !== 'all') next.set('year', selectedYear);
    if (selectedSize !== 'all') next.set('size', selectedSize);
    if (minPrice) next.set('min', minPrice);
    if (maxPrice) next.set('max', maxPrice);
    if (sortBy !== 'newest') next.set('sort', sortBy);
    if (page > 1) next.set('page', String(page));
    const qs = next.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [selectedCategory, selectedSubCategory, searchQuery, onlyWishlist, selectedArtistId, selectedYear, selectedSize, minPrice, maxPrice, sortBy, page]);

  // What a visitor actually pays (a discount if there is one), in USD.
  const effectivePrice = (p: any): number =>
    p.discount_price && p.discount_price < p.price ? p.discount_price : p.price;

  const filteredPaintings = useMemo(() => {
    const minUsd = minPrice ? Number(minPrice) / currencyRate : null;
    const maxUsd = maxPrice ? Number(maxPrice) / currencyRate : null;

    const matches = paintings.filter((p) => {
      // Theme (bola kategoriya) filter — exact match. Otherwise fall back
      // to the product-type (ota kategoriya) pill, matched via the shared
      // effectiveProductType() helper so a painting tagged with any theme
      // under that product type still shows up.
      if (selectedSubCategory !== 'all') {
        if (p.category?.slug !== selectedSubCategory) return false;
      } else if (selectedCategory !== 'all') {
        if (effectiveProductType(p.category) !== selectedCategory) return false;
      }

      // Wishlist filter
      if (onlyWishlist && !wishlist.includes(p.id)) {
        return false;
      }

      // Advanced filters
      if (selectedArtistId !== 'all' && p.artist?.id !== selectedArtistId) {
        return false;
      }
      if (selectedYear !== 'all' && String(p.year) !== selectedYear) {
        return false;
      }
      if (selectedSize !== 'all' && getSizeBucket(p.size) !== selectedSize) {
        return false;
      }
      if (minUsd !== null && effectivePrice(p) < minUsd) return false;
      if (maxUsd !== null && effectivePrice(p) > maxUsd) return false;

      // Search filter — also matches the category/theme name (uz/en/ru), so
      // typing e.g. "portret" finds paintings tagged with that theme even
      // though it never appears in the title/artist/technique.
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle =
          p.title_en.toLowerCase().includes(q) ||
          p.title_ru.toLowerCase().includes(q) ||
          p.title_uz.toLowerCase().includes(q);
        const matchesArtist = p.artist?.name.toLowerCase().includes(q);
        const matchesTech = p.technique_en?.toLowerCase().includes(q);
        const matchesCategory =
          p.category?.name_en?.toLowerCase().includes(q) ||
          p.category?.name_ru?.toLowerCase().includes(q) ||
          p.category?.name_uz?.toLowerCase().includes(q);
        return matchesTitle || matchesArtist || matchesTech || matchesCategory;
      }

      return true;
    });

    // The server already sends newest first; only price sorts reorder.
    if (sortBy === 'price_asc') return [...matches].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sortBy === 'price_desc') return [...matches].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return matches;
  }, [
    paintings,
    minPrice,
    maxPrice,
    currencyRate,
    sortBy,
    selectedCategory,
    selectedSubCategory,
    onlyWishlist,
    wishlist,
    searchQuery,
    selectedArtistId,
    selectedYear,
    selectedSize,
  ]);

  // Back to page 1 whenever the result set changes (filters, search, sort) —
  // adjusted during render, not in an effect, so there's no flash of an
  // empty page. A page number from the URL survives the first render.
  const filterKey = [selectedCategory, selectedSubCategory, searchQuery, onlyWishlist, selectedArtistId, selectedYear, selectedSize, minPrice, maxPrice, sortBy].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(filteredPaintings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedPaintings = filteredPaintings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: t.nav.gallery }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Page Head */}
        <AnimatedMadohil />
        <div className="max-w-2xl mb-10 space-y-2">
          <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
            {t.gallery.eyebrow}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">
            {t.gallery.title}
          </h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">
            {t.gallery.subtitle}
          </p>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-10 pb-6 border-b border-[#E7E0D8]">
          {/* Category Pills — horizontal scroll on mobile (touch), wraps to multiple lines on desktop (mouse has no easy way to scroll a hidden overflow) */}
          <div className="flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none min-w-0 md:flex-1">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setOnlyWishlist(false);
              }}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                selectedCategory === 'all' && !onlyWishlist
                  ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                  : 'bg-[#FDFBF9] text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25] hover:text-[#BA4E25]'
              }`}
            >
              {t.gallery.filterAll}
            </button>

            {topLevelCategories.map((cat) => {
              const catName =
                lang === 'ru'
                  ? cat.name_ru
                  : lang === 'uz'
                  ? cat.name_uz
                  : cat.name_en;

              const isSelected = selectedCategory === cat.slug && !onlyWishlist;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.slug);
                    setOnlyWishlist(false);
                  }}
                  className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                      : 'bg-[#FDFBF9] text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25] hover:text-[#BA4E25]'
                  }`}
                >
                  {catName}
                </button>
              );
            })}

            {/* Wishlist toggle pill */}
            <button
              onClick={() => setOnlyWishlist(!onlyWishlist)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border transition-all whitespace-nowrap ml-1 ${
                onlyWishlist
                  ? 'bg-[#BA4E25] text-white border-[#BA4E25]'
                  : 'bg-[#FDFBF9] text-[#BA4E25] border-[#E7E0D8] hover:border-[#BA4E25]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyWishlist ? 'fill-current' : ''}`} />
              <span>{t.nav.wishlist} ({wishlist.length})</span>
            </button>
          </div>

          {/* Search bar + Advanced Filters toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-[#8A7C73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.gallery.searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FDFBF9] border border-[#E7E0D8] rounded-full focus:outline-none focus:border-[#BA4E25] text-[#281C18]"
              />
            </div>
            <FilterSelect
              value={sortBy}
              onChange={setSortBy}
              ariaLabel={t.gallery.sortBy}
              className="w-40 shrink-0"
              buttonClassName="!rounded-full !py-1.5 !text-xs"
              options={[
                { value: 'newest', label: t.gallery.sortNewest },
                { value: 'price_asc', label: t.gallery.sortPriceAsc },
                { value: 'price_desc', label: t.gallery.sortPriceDesc },
              ]}
            />
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap shrink-0 ${
                showAdvancedFilters || hasActiveAdvancedFilters
                  ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                  : 'bg-[#FDFBF9] text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25] hover:text-[#BA4E25]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.gallery.advancedFilters}</span>
              {hasActiveAdvancedFilters && (
                <span className="bg-[#BA4E25] text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeAdvancedCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="relative -mt-6 mb-10 p-5 sm:p-6 bg-[#FDFBF9] border border-[#E7E0D8] rounded-lg shadow-sm animate-[fadeSlideIn_0.2s_ease-out]">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg bg-gradient-to-r from-[#BA4E25] via-[#D98C4A] to-[#429599]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {subCategoryOptions.length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                    <Layers className="w-3 h-3 text-[#BA4E25]" />
                    {t.gallery.filterBySubcategory}
                  </label>
                  <FilterSelect
                    value={selectedSubCategory}
                  ariaLabel={t.gallery.filterBySubcategory}
                    onChange={setSelectedSubCategory}
                    allValue="all"
                    allLabel={t.gallery.allSubcategories}
                    emptyMessage={t.gallery.noSubcategoriesInType}
                    options={subCategoryOptions.map((c) => ({
                      value: c.slug,
                      label: lang === 'ru' ? c.name_ru : lang === 'uz' ? c.name_uz : c.name_en,
                    }))}
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                  <Palette className="w-3 h-3 text-[#BA4E25]" />
                  {t.gallery.filterByArtist}
                </label>
                <FilterSelect
                  value={selectedArtistId}
                  ariaLabel={t.gallery.filterByArtist}
                  onChange={setSelectedArtistId}
                  allValue="all"
                  allLabel={t.gallery.allArtists}
                  emptyMessage={t.gallery.noArtistsInCategory}
                  options={artistOptions.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                  <CalendarDays className="w-3 h-3 text-[#BA4E25]" />
                  {t.gallery.filterByYear}
                </label>
                <FilterSelect
                  value={selectedYear}
                  ariaLabel={t.gallery.filterByYear}
                  onChange={setSelectedYear}
                  allValue="all"
                  allLabel={t.gallery.allYears}
                  emptyMessage={t.gallery.noYearsInCategory}
                  options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                  <Ruler className="w-3 h-3 text-[#BA4E25]" />
                  {t.gallery.filterBySize}
                </label>
                <FilterSelect
                  value={selectedSize}
                  ariaLabel={t.gallery.filterBySize}
                  onChange={setSelectedSize}
                  allValue="all"
                  allLabel={t.gallery.allSizes}
                  emptyMessage=""
                  options={[
                    { value: 'small', label: t.gallery.sizeSmall },
                    { value: 'medium', label: t.gallery.sizeMedium },
                    { value: 'large', label: t.gallery.sizeLarge },
                  ]}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                  <Wallet className="w-3 h-3 text-[#BA4E25]" />
                  {t.gallery.filterByPrice} ({currency})
                </label>
                <div className="flex items-center gap-2">
                  {([
                    [minPrice, setMinPrice, t.gallery.priceMin],
                    [maxPrice, setMaxPrice, t.gallery.priceMax],
                  ] as const).map(([value, setValue, placeholder]) => (
                    <input
                      key={placeholder}
                      type="text"
                      inputMode="numeric"
                      value={value}
                      onChange={(e) => setValue(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
                      placeholder={placeholder}
                      aria-label={`${t.gallery.filterByPrice} ${placeholder}`}
                      className="w-full min-w-0 px-3 py-2 text-xs bg-white border border-[#E7E0D8] rounded-md focus:outline-none focus:border-[#BA4E25] text-[#281C18]"
                    />
                  ))}
                </div>
              </div>

              {hasActiveAdvancedFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearAdvancedFilters}
                    className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-[#BA4E25] border border-[#E7E0D8] hover:border-[#BA4E25] hover:bg-[#BA4E25]/5 rounded-md px-3 py-2.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t.gallery.clearFilters}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Send inquiry about all wishlist pieces at once */}
        {onlyWishlist && filteredPaintings.length > 0 && (
          <div className="flex justify-end mb-5">
            <button
              onClick={() => setShowWishlistInquiry(true)}
              className="bg-[#281C18] hover:bg-[#BA4E25] text-white text-xs font-semibold px-4 py-2.5 rounded-[3px] transition flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t.wishlistInquiry.sendAllBtn} ({filteredPaintings.length})</span>
            </button>
          </div>
        )}

        {/* Gallery Grid */}
        {filteredPaintings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
            {pagedPaintings.map((painting) => (
              <div key={painting.id}>
                <PaintingCard painting={painting as PaintingItem} />
              </div>
            ))}
          </div>
        ) : null}

        <PublicPagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setPage}
          labels={{ previous: t.gallery.pagePrevious, next: t.gallery.pageNext, page: t.gallery.pageLabel }}
        />

        {filteredPaintings.length === 0 && (
          <div className="text-center py-20 bg-[#FDFBF9] rounded-[4px] border border-[#E7E0D8] space-y-3">
            <SlidersHorizontal className="w-8 h-8 mx-auto text-[#A89990]" />
            <p className="text-base font-serif text-[#554740] px-4">
              {onlyWishlist
                ? t.gallery.wishlistEmpty
                : searchQuery.trim()
                ? t.gallery.noSearchResults.replace('{q}', searchQuery.trim())
                : hasActiveAdvancedFilters
                ? t.gallery.noFilterResults
                : t.gallery.noPaintingsFound}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-[#BA4E25] hover:underline"
                >
                  {t.gallery.clearSearch}
                </button>
              )}
              {(onlyWishlist || hasActiveAdvancedFilters || selectedCategory !== 'all' || searchQuery.trim()) && (
                <button
                  onClick={resetEverything}
                  className="text-xs font-semibold text-[#BA4E25] hover:underline"
                >
                  {onlyWishlist ? t.gallery.viewAllPaintings : t.gallery.resetAll}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dandana — the gallery's bottom trim, echoing Ichan-Qala's wall crenellations */}
        <div className="mt-14">
          <DandanaScrollTrack />
        </div>
      </div>

      {showWishlistInquiry && (
        <WishlistInquiryModal
          paintings={paintings.filter((p) => wishlist.includes(p.id))}
          onClose={() => setShowWishlistInquiry(false)}
        />
      )}
    </div>
  );
}
