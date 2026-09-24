'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Upload,
  Plus,
  X,
  Loader2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import AiBackgroundModal from './AiBackgroundModal';
import ImageCropModal from './ImageCropModal';
import FilterSelect from '@/components/FilterSelect';
import DatePicker from '@/components/DatePicker';
import type { DiscountRule } from '@/lib/discounts';
import { fillMissingTranslations, useAutoTranslate } from '@/lib/useAutoTranslate';
import TranslateStatus from '@/components/TranslateStatus';

interface PaintingFormProps {
  initialData?: any;
  artists: any[];
  categories: any[];
  // Active ARTIST/CATEGORY rules (src/lib/discounts.ts) — so the form can
  // show which rule a painting already falls under instead of a blank field.
  discountRules?: DiscountRule[];
  isNew?: boolean;
}

// Numeric fields are kept as strings while editing: a controlled
// <input type="number"> bound to a number state keeps a typed leading zero
// ("035") and lets letters like "e" through. These strip everything but
// digits (and one decimal point where allowed) and drop leading zeros.
const digitsOnly = (raw: string) => raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const decimalOnly = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  const intPart = whole.replace(/^0+(?=\d)/, '');
  return rest.length ? `${intPart || '0'}.${rest.join('').slice(0, 2)}` : intPart;
};

const toDateInput = (d?: string | Date | null) =>
  d ? new Date(d).toISOString().split('T')[0] : '';

export default function PaintingForm({
  initialData,
  artists: initialArtists,
  categories: initialCategories,
  discountRules = [],
  isNew = false,
}: PaintingFormProps) {
  const router = useRouter();

  // Lists with dynamic additions
  const [artistsList, setArtistsList] = useState(initialArtists || []);
  const [categoriesList, setCategoriesList] = useState(initialCategories || []);

  // Form fields (EN / RU / UZ)
  const [titleUz, setTitleUz] = useState(initialData?.title_uz || '');
  const [titleEn, setTitleEn] = useState(initialData?.title_en || '');
  const [titleRu, setTitleRu] = useState(initialData?.title_ru || '');

  const [descriptionUz, setDescriptionUz] = useState(initialData?.description_uz || '');
  const [descriptionEn, setDescriptionEn] = useState(initialData?.description_en || '');
  const [descriptionRu, setDescriptionRu] = useState(initialData?.description_ru || '');

  // Structured size parsing (e.g. "60 × 80 sm" or "60x80")
  const parseSize = (sizeStr?: string) => {
    if (!sizeStr) return { width: 60, height: 80, unit: 'sm' };
    const parts = sizeStr.match(/(\d+)\s*[×x*X]\s*(\d+)(?:\s*(sm|cm|in|dyum))?/i);
    if (parts) {
      const u = (parts[3] || 'sm').toLowerCase();
      return {
        width: parseInt(parts[1]) || 60,
        height: parseInt(parts[2]) || 80,
        unit: u === 'in' || u === 'dyum' ? 'dyum' : 'sm',
      };
    }
    return { width: 60, height: 80, unit: 'sm' };
  };

  const initialParsedSize = parseSize(initialData?.size);
  const [sizeWidth, setSizeWidth] = useState<string>(String(initialParsedSize.width));
  const [sizeHeight, setSizeHeight] = useState<string>(String(initialParsedSize.height));
  const [sizeUnit, setSizeUnit] = useState<string>(initialParsedSize.unit);

  // Empty by default (not pre-filled with the "Oil on canvas" example) so a
  // placeholder is never mistaken for real text by the auto-translation.
  const [techniqueUz, setTechniqueUz] = useState(initialData?.technique_uz || '');
  const [techniqueEn, setTechniqueEn] = useState(initialData?.technique_en || '');
  const [techniqueRu, setTechniqueRu] = useState(initialData?.technique_ru || '');
  const [year, setYear] = useState<string>(String(initialData?.year || new Date().getFullYear()));
  const [artistId, setArtistId] = useState(initialData?.artist_id || initialArtists[0]?.id || '');

  // Category is picked in two steps — ota (product type) then bola (subject)
  // — so it's always clear exactly which one a painting lands in, instead of
  // one flat dropdown mixing both levels together.
  const initialCategory = initialCategories.find(
    (c: any) => c.id === (initialData?.category_id || initialCategories[0]?.id)
  );
  const [categoryId, setCategoryId] = useState(
    initialData?.category_id || initialCategories[0]?.id || ''
  );
  const [topCategoryId, setTopCategoryId] = useState<string>(
    (initialCategory as any)?.parent_id || initialCategory?.id || ''
  );

  // Images array
  const initialImages: string[] = (() => {
    try {
      if (initialData?.images) {
        const parsed = typeof initialData.images === 'string' ? JSON.parse(initialData.images) : initialData.images;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['/assets/p-arch.svg'];
  })();
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [aiEditIndex, setAiEditIndex] = useState<number | null>(null);

  // Pricing
  const [price, setPrice] = useState<string>(initialData?.price ? String(initialData.price) : '');

  // Which discount the painting currently gets, most specific first — its
  // own discount_price, else an active artist rule, else a category rule
  // (on its leaf category or the parent product type). New paintings start
  // with no discount at all rather than a silent default percent.
  const findRule = (scope: 'ARTIST' | 'CATEGORY', artist: string, catId: string, topId: string) =>
    discountRules.find(
      (r) =>
        r.scope === scope &&
        (scope === 'ARTIST' ? r.target_id === artist : r.target_id === catId || r.target_id === topId)
    ) || null;

  const initialDiscount = (() => {
    const p = initialData?.price;
    const dp = initialData?.discount_price;
    if (p && dp && dp < p) {
      return {
        scope: 'PAINTING' as const,
        percent: String(Math.round((1 - dp / p) * 100)),
        starts: toDateInput(initialData?.discount_starts_at),
        ends: toDateInput(initialData?.discount_ends_at),
      };
    }
    const initialArtistId = initialData?.artist_id || initialArtists[0]?.id || '';
    const initialCatId = initialData?.category_id || initialCategories[0]?.id || '';
    const initialCat: any = initialCategories.find((c: any) => c.id === initialCatId);
    const initialTopId = initialCat?.parent_id || initialCat?.id || '';
    const rule =
      findRule('ARTIST', initialArtistId, initialCatId, initialTopId) ||
      findRule('CATEGORY', initialArtistId, initialCatId, initialTopId);
    if (rule) {
      return {
        scope: rule.scope as 'ARTIST' | 'CATEGORY',
        percent: String(rule.percent),
        starts: toDateInput(rule.starts_at),
        ends: toDateInput(rule.ends_at),
      };
    }
    return { scope: 'PAINTING' as const, percent: '', starts: '', ends: '' };
  })();

  const [discountPercent, setDiscountPercent] = useState<string>(initialDiscount.percent);
  const [discountStarts, setDiscountStarts] = useState(initialDiscount.starts);
  const [discountEnds, setDiscountEnds] = useState(initialDiscount.ends);
  const [discountScope, setDiscountScope] = useState<'PAINTING' | 'ARTIST' | 'CATEGORY'>(
    initialDiscount.scope
  );

  // Toggles
  const [isSold, setIsSold] = useState(initialData?.is_sold || false);
  const [isFeatured, setIsFeatured] = useState(initialData?.is_featured !== undefined ? initialData.is_featured : true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modals for adding inline Artist or Category
  const [showAddArtistModal, setShowAddArtistModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistSpecialtyUz, setNewArtistSpecialtyUz] = useState('');
  const [newArtistSpecialtyEn, setNewArtistSpecialtyEn] = useState('');
  const [newArtistSpecialtyRu, setNewArtistSpecialtyRu] = useState('');
  const [newArtistBioUz, setNewArtistBioUz] = useState('');
  const [newArtistBioEn, setNewArtistBioEn] = useState('');
  const [newArtistBioRu, setNewArtistBioRu] = useState('');
  const [newArtistCategoryId, setNewArtistCategoryId] = useState('');
  const [addingArtist, setAddingArtist] = useState(false);

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryNameUz, setNewCategoryNameUz] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [newCategoryNameRu, setNewCategoryNameRu] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategorySlugManual, setNewCategorySlugManual] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  // A category created while adding a painting is almost always a subject
  // (Nature, Portraits, ...) of an existing product type — default to
  // "Kartina" if it exists, otherwise leave it as its own top-level type.
  const topLevelCategoryOptions = categoriesList.filter((c: any) => !c.parent_id);
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>(
    () => topLevelCategoryOptions.find((c: any) => c.slug === 'kartina')?.id || ''
  );

  // Auto-translation: whichever language the admin edits (UZ, RU or EN)
  // becomes the source and the other two are re-translated from it — see
  // src/lib/useAutoTranslate.ts for the overwrite rules.
  const tr = useAutoTranslate();

  const fieldGroups = {
    title: {
      uz: [titleUz, setTitleUz] as const,
      ru: [titleRu, setTitleRu] as const,
      en: [titleEn, setTitleEn] as const,
    },
    description: {
      uz: [descriptionUz, setDescriptionUz] as const,
      ru: [descriptionRu, setDescriptionRu] as const,
      en: [descriptionEn, setDescriptionEn] as const,
    },
    technique: {
      uz: [techniqueUz, setTechniqueUz] as const,
      ru: [techniqueRu, setTechniqueRu] as const,
      en: [techniqueEn, setTechniqueEn] as const,
    },
    // Inline "add artist" / "add category" modal fields — same UZ->EN/RU
    // convenience, just kept out of the main painting fields above.
    newArtistSpecialty: {
      uz: [newArtistSpecialtyUz, setNewArtistSpecialtyUz] as const,
      ru: [newArtistSpecialtyRu, setNewArtistSpecialtyRu] as const,
      en: [newArtistSpecialtyEn, setNewArtistSpecialtyEn] as const,
    },
    newArtistBio: {
      uz: [newArtistBioUz, setNewArtistBioUz] as const,
      ru: [newArtistBioRu, setNewArtistBioRu] as const,
      en: [newArtistBioEn, setNewArtistBioEn] as const,
    },
    newCategoryName: {
      uz: [newCategoryNameUz, setNewCategoryNameUz] as const,
      ru: [newCategoryNameRu, setNewCategoryNameRu] as const,
      en: [newCategoryNameEn, setNewCategoryNameEn] as const,
    },
  };

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[ʻʼ'`]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  // Calculate live preview
  const numPrice = parseFloat(price) || 0;
  const numPercent = Math.min(parseFloat(discountPercent) || 0, 90);
  const calculatedDiscountPrice =
    numPercent > 0 && numPrice > 0 ? Math.round(numPrice * (1 - numPercent / 100)) : null;

  // The rule the currently selected scope points at (if any) — switching
  // the scope pill re-reads its percent and dates so the form always shows
  // what's actually saved for that target.
  const activeRuleFor = (scope: 'PAINTING' | 'ARTIST' | 'CATEGORY') =>
    scope === 'PAINTING' ? null : findRule(scope, artistId, categoryId, topCategoryId);

  const selectScope = (scope: 'PAINTING' | 'ARTIST' | 'CATEGORY') => {
    setDiscountScope(scope);
    if (scope === 'PAINTING') {
      const own = initialDiscount.scope === 'PAINTING' ? initialDiscount : null;
      setDiscountPercent(own?.percent || '');
      setDiscountStarts(own?.starts || '');
      setDiscountEnds(own?.ends || '');
      return;
    }
    const rule = activeRuleFor(scope);
    setDiscountPercent(rule ? String(rule.percent) : '');
    setDiscountStarts(toDateInput(rule?.starts_at));
    setDiscountEnds(toDateInput(rule?.ends_at));
  };

  // Picking another artist/category while an artist/category scope is
  // selected must show *that* target's rule, not the previous one's —
  // adjusted during render (React's "reset state on prop change" pattern)
  // rather than in an effect, so there's no stale intermediate render.
  const scopeTargetKey = `${artistId}|${topCategoryId}|${categoryId}`;
  const [prevScopeTargetKey, setPrevScopeTargetKey] = useState(scopeTargetKey);
  if (prevScopeTargetKey !== scopeTargetKey) {
    setPrevScopeTargetKey(scopeTargetKey);
    if (discountScope !== 'PAINTING') selectScope(discountScope);
  }

  // Saves an ARTIST/CATEGORY rule: updates the existing one for that
  // target, creates it if there is none, or removes it when the percent is
  // cleared. Throws on failure so the painting save reports it.
  const saveScopeRule = async () => {
    if (discountScope === 'PAINTING') return;
    const targetId = discountScope === 'ARTIST' ? artistId : topCategoryId;
    const existing = activeRuleFor(discountScope);
    const dates = { starts_at: discountStarts || null, ends_at: discountEnds || null };

    let res: Response | null = null;
    if (existing && numPercent <= 0) {
      res = await fetch(`/api/admin/discounts?id=${existing.id}`, { method: 'DELETE' });
    } else if (existing) {
      res = await fetch('/api/admin/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, percent: numPercent, ...dates }),
      });
    } else if (numPercent > 0 && targetId) {
      res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: discountScope, target_id: targetId, percent: numPercent, ...dates }),
      });
    }
    if (res && !res.ok) throw new Error('discount rule save failed');
  };

  // Actually POSTs a file (original or cropped) to the upload API.
  const uploadFile = async (fileToUpload: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setImages((prev) => [data.url, ...prev]);
      } else {
        alert(data.error || 'Rasm yuklashda xatolik yuz berdi');
      }
    } catch {
      alert('Rasm yuklashda xatolik yuz berdi');
    } finally {
      setUploadingImage(false);
    }
  };

  // File picked — open the crop tool instead of uploading immediately.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingCropFile(file);
    // Allow re-selecting the exact same file later.
    e.target.value = '';
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtistName.trim()) return;
    setAddingArtist(true);
    try {
      const res = await fetch('/api/admin/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newArtistName,
          specialty_uz: newArtistSpecialtyUz || 'Rassom',
          specialty_en: newArtistSpecialtyEn || newArtistSpecialtyUz || 'Artist',
          specialty_ru: newArtistSpecialtyRu || newArtistSpecialtyUz || 'Художник',
          bio_uz: newArtistBioUz,
          bio_en: newArtistBioEn || newArtistBioUz,
          bio_ru: newArtistBioRu || newArtistBioUz,
          category_id: newArtistCategoryId || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.artist) {
        setArtistsList((prev) => [data.artist, ...prev]);
        setArtistId(data.artist.id);
        if (data.artist.category_id) {
          setTopCategoryId(data.artist.category_id);
          const children = categoriesList.filter((c: any) => c.parent_id === data.artist.category_id);
          setCategoryId(children[0]?.id || data.artist.category_id);
        }
        setShowAddArtistModal(false);
        setNewArtistName('');
        setNewArtistSpecialtyUz('');
        setNewArtistSpecialtyEn('');
        setNewArtistSpecialtyRu('');
        setNewArtistBioUz('');
        setNewArtistBioEn('');
        setNewArtistBioRu('');
        setNewArtistCategoryId('');
      }
    } catch {
      alert('Rassom qo\'shishda xatolik yuz berdi');
    } finally {
      setAddingArtist(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryNameUz.trim() && !newCategoryNameEn.trim()) return;
    setAddingCategory(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_uz: newCategoryNameUz || newCategoryNameEn,
          name_en: newCategoryNameEn || newCategoryNameUz,
          name_ru: newCategoryNameRu || newCategoryNameUz,
          slug: newCategorySlug.trim() || slugify(newCategoryNameUz || newCategoryNameEn),
          parent_id: newCategoryParentId || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategoriesList((prev) => [...prev, data.category]);
        setCategoryId(data.category.id);
        setTopCategoryId(data.category.parent_id || data.category.id);
        setShowAddCategoryModal(false);
        setNewCategoryNameUz('');
        setNewCategoryNameEn('');
        setNewCategoryNameRu('');
        setNewCategorySlug('');
        setNewCategorySlugManual(false);
      }
    } catch {
      alert('Kategoriya qo\'shishda xatolik yuz berdi');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formattedSize = `${sizeWidth} × ${sizeHeight} ${sizeUnit}`;
    const ownDiscount = discountScope === 'PAINTING';

    const [title, description, technique] = await Promise.all([
      fillMissingTranslations({ uz: titleUz, ru: titleRu, en: titleEn }),
      fillMissingTranslations({ uz: descriptionUz, ru: descriptionRu, en: descriptionEn }),
      fillMissingTranslations({ uz: techniqueUz, ru: techniqueRu, en: techniqueEn }),
    ]);
    const firstFilled = (v: Record<string, string>) => v.uz || v.en || v.ru || '';

    const payload = {
      title_uz: title.uz || firstFilled(title),
      title_en: title.en || firstFilled(title),
      title_ru: title.ru || firstFilled(title),
      description_uz: description.uz || firstFilled(description),
      description_en: description.en || firstFilled(description),
      description_ru: description.ru || firstFilled(description),
      size: formattedSize,
      technique_uz: technique.uz || firstFilled(technique),
      technique_en: technique.en || firstFilled(technique),
      technique_ru: technique.ru || firstFilled(technique),
      year: parseInt(year) || new Date().getFullYear(),
      artist_id: artistId,
      category_id: categoryId,
      price: numPrice,
      // An artist/category rule applies on its own at read time — the
      // painting's own discount is cleared so it doesn't override the rule.
      discount_price: ownDiscount ? calculatedDiscountPrice : null,
      discount_starts_at: ownDiscount && calculatedDiscountPrice && discountStarts ? new Date(discountStarts) : null,
      discount_ends_at: ownDiscount && calculatedDiscountPrice && discountEnds ? new Date(discountEnds) : null,
      is_sold: isSold,
      is_featured: isFeatured,
      images: JSON.stringify(images.length > 0 ? images : ['/assets/p-arch.svg']),
    };

    try {
      try {
        await saveScopeRule();
      } catch {
        setMessage('Chegirma qoidasini saqlashda xatolik yuz berdi.');
        setLoading(false);
        return;
      }

      const url = isNew ? '/api/admin/paintings' : `/api/admin/paintings/${initialData.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Kartina muvaffaqiyatli saqlandi!');
        setTimeout(() => {
          router.push('/admin/paintings');
        }, 1000);
      } else {
        setMessage(data.error || 'Kartinani saqlashda xatolik yuz berdi.');
      }
    } catch {
      setMessage('Serverga bog\'lanishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePainting = async () => {
    if (!initialData?.id) return;
    if (!confirm(`"${titleEn || 'Ushbu'}" kartinani o'chirishni tasdiqlaysizmi?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/paintings/${initialData.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/paintings');
      } else {
        alert('O\'chirishda xatolik yuz berdi.');
      }
    } catch {
      alert('Serverga bog\'lanishda xatolik.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top action header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D8]">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/paintings"
              className="p-1.5 text-[#726861] hover:text-[#BA4E25] rounded hover:bg-[#FAF4EC]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="font-serif text-2xl font-semibold text-[#281C18]">
              {isNew ? 'Yangi Kartina Qo\'shish' : `Tahrirlash — ${titleEn || 'Registon at Dusk'}`}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                type="button"
                onClick={handleDeletePainting}
                disabled={loading}
                className="px-3.5 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-[3px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>O'chirish</span>
              </button>
            )}
            <Link
              href="/admin/paintings"
              className="px-4 py-2 border border-[#E7E0D8] bg-white text-xs font-semibold text-[#554740] rounded-[3px] hover:bg-[#FAF4EC] transition-colors"
            >
              Bekor qilish
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[3px] text-xs text-[#1B5E20]">
            {message}
          </div>
        )}

        {/* 2-Column Form Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Details + Images) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Details Panel */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase">
                  ASOSIY MA'LUMOTLAR
                </h3>
                <span className="text-[10.5px] text-[#8F7E73]">
                  Istalgan bitta tilda yozing — qolgan ikkitasi avtomatik tarjima qilinadi
                </span>
              </div>

              {/* Sarlavhalar (3 tilda) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    SARLAVHA (UZ)
                    <TranslateStatus translating={tr.translatingGroup === 'title'} canUndo={tr.canUndo('title')} onUndo={() => tr.undo('title')} />
                  </label>
                  <input
                    type="text"
                    // Any one language is enough — the other two are translated from it.
                    required={!titleUz.trim() && !titleEn.trim() && !titleRu.trim()}
                    value={titleUz}
                    {...tr.bind('title', 'uz', fieldGroups.title)}
                    onChange={(e) => setTitleUz(e.target.value)}
                    placeholder="Registon shafaq paytida"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    SARLAVHA (EN)
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    {...tr.bind('title', 'en', fieldGroups.title)}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Registon at Dusk"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    SARLAVHA (RU)
                  </label>
                  <input
                    type="text"
                    value={titleRu}
                    {...tr.bind('title', 'ru', fieldGroups.title)}
                    onChange={(e) => setTitleRu(e.target.value)}
                    placeholder="Регистан на закате"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              {/* Tavsiflar (3 tilda) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    TAVSIF (UZ)
                    <TranslateStatus translating={tr.translatingGroup === 'description'} canUndo={tr.canUndo('description')} onUndo={() => tr.undo('description')} />
                  </label>
                  <textarea
                    rows={3}
                    value={descriptionUz}
                    {...tr.bind('description', 'uz', fieldGroups.description)}
                    onChange={(e) => setDescriptionUz(e.target.value)}
                    placeholder="San'at asari haqida ma'lumot (O'zbekcha)..."
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    TAVSIF (EN)
                  </label>
                  <textarea
                    rows={3}
                    value={descriptionEn}
                    {...tr.bind('description', 'en', fieldGroups.description)}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder="Artwork description in English..."
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    TAVSIF (RU)
                  </label>
                  <textarea
                    rows={3}
                    value={descriptionRu}
                    {...tr.bind('description', 'ru', fieldGroups.description)}
                    onChange={(e) => setDescriptionRu(e.target.value)}
                    placeholder="Описание картины на русском..."
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
              </div>

              {/* Texnikalar (3 tilda) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    TEXNIKA (UZ)
                    <TranslateStatus translating={tr.translatingGroup === 'technique'} canUndo={tr.canUndo('technique')} onUndo={() => tr.undo('technique')} />
                  </label>
                  <input
                    type="text"
                    value={techniqueUz}
                    {...tr.bind('technique', 'uz', fieldGroups.technique)}
                    onChange={(e) => setTechniqueUz(e.target.value)}
                    placeholder="Moybo'yoq, polotno"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    TEXNIKA (EN)
                  </label>
                  <input
                    type="text"
                    value={techniqueEn}
                    {...tr.bind('technique', 'en', fieldGroups.technique)}
                    onChange={(e) => setTechniqueEn(e.target.value)}
                    placeholder="Oil on canvas"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    TEXNIKA (RU)
                  </label>
                  <input
                    type="text"
                    value={techniqueRu}
                    {...tr.bind('technique', 'ru', fieldGroups.technique)}
                    onChange={(e) => setTechniqueRu(e.target.value)}
                    placeholder="Холст, масло"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              {/* Structured Size + Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Structured Size Input (TZ Section 8.2) */}
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    O'LCHAMI (ENI × BO'YI) *
                  </label>
                  <div className="flex items-center gap-1.5 bg-white border border-[#E7E0D8] rounded-[3px] px-2 py-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={sizeWidth}
                      onChange={(e) => setSizeWidth(digitsOnly(e.target.value))}
                      placeholder="60"
                      className="w-14 text-xs font-semibold text-center focus:outline-none"
                    />
                    <span className="text-[#8F7E73] text-xs font-bold">×</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={sizeHeight}
                      onChange={(e) => setSizeHeight(digitsOnly(e.target.value))}
                      placeholder="80"
                      className="w-14 text-xs font-semibold text-center focus:outline-none"
                    />
                    <FilterSelect
                      value={sizeUnit}
                      onChange={setSizeUnit}
                      className="w-[68px] ml-auto"
                      buttonClassName="!bg-transparent !border-0 !border-l !rounded-none !pl-1.5 !pr-1 !py-0 !text-[11px] !font-medium !text-[#BA4E25] !ring-0 border-[#E7E0D8]"
                      options={[
                        { value: 'sm', label: 'sm' },
                        { value: 'dyum', label: 'dyum' },
                      ]}
                    />
                  </div>
                  <span className="text-[10px] text-[#8F7E73] mt-0.5 block">
                    Natija: {sizeWidth} × {sizeHeight} {sizeUnit}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    YIL
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={year}
                    onChange={(e) => setYear(digitsOnly(e.target.value).slice(0, 4))}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              {/* Artist and Category with Inline "+ Yangi qo'shish" Modals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Artist Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                      RASSOM (ARTIST) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddArtistModal(true)}
                      className="text-[11px] font-semibold text-[#BA4E25] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Yangi qo'shish</span>
                    </button>
                  </div>
                  <FilterSelect
                    value={artistId}
                    onChange={(newArtistId) => {
                      setArtistId(newArtistId);
                      // Rassomga biriktirilgan ota-kategoriya (yo'nalishi)
                      // bo'lsa, ota-kategoriyani avtomatik shunga o'rnatamiz
                      // — bola-kategoriyani admin qo'lda tanlaydi.
                      const chosenArtist: any = artistsList.find((a: any) => a.id === newArtistId);
                      if (chosenArtist?.category_id) {
                        setTopCategoryId(chosenArtist.category_id);
                        const children = categoriesList.filter((c: any) => c.parent_id === chosenArtist.category_id);
                        setCategoryId(children[0]?.id || chosenArtist.category_id);
                      }
                    }}
                    buttonClassName="!rounded-[3px] !py-2"
                    searchable
                    options={artistsList.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </div>

                {/* Category Selector — ota (product type) then bola (subject) */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                        OTA-KATEGORIYA (MAHSULOT TURI) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddCategoryModal(true)}
                        className="text-[11px] font-semibold text-[#BA4E25] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Yangi qo'shish</span>
                      </button>
                    </div>
                    <FilterSelect
                      value={topCategoryId}
                      onChange={(newTopId) => {
                        setTopCategoryId(newTopId);
                        const children = categoriesList.filter((c: any) => c.parent_id === newTopId);
                        // A top-level category with no subjects under it (e.g.
                        // "Kulolchilik") is used directly as the painting's category.
                        setCategoryId(children[0]?.id || newTopId);
                      }}
                      buttonClassName="!rounded-[3px] !py-2"
                      options={categoriesList
                        .filter((c: any) => !c.parent_id)
                        .map((c) => ({ value: c.id, label: c.name_uz || c.name_en }))}
                    />
                  </div>

                  {(() => {
                    const children = categoriesList.filter((c: any) => c.parent_id === topCategoryId);
                    if (children.length === 0) return null;
                    return (
                      <div>
                        <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                          BOLA-KATEGORIYA (MAVZU) *
                        </label>
                        <FilterSelect
                          value={categoryId}
                          onChange={setCategoryId}
                          buttonClassName="!rounded-[3px] !py-2"
                          options={children.map((c: any) => ({ value: c.id, label: c.name_uz || c.name_en }))}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Images Upload Box */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase">
                  RASMLAR (IMAGES)
                </h3>
                <span className="text-[11px] text-[#8F7E73]">
                  {images.length} ta rasm yuklangan
                </span>
              </div>

              {/* Gallery of Uploaded Images */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-4/3 rounded border border-[#E7E0D8] overflow-hidden bg-white group"
                    >
                      <Image
                        src={img}
                        alt="Painting asset"
                        fill
                        sizes="200px"
                        className="object-contain p-1"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-[#BA4E25] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Asosiy
                        </span>
                      )}
                      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setAiEditIndex(idx)}
                          title="AI bilan fon yaratish"
                          className="p-1 bg-black/60 text-white rounded hover:bg-[#BA4E25]"
                        >
                          <Sparkles className="w-3 h-3" />
                        </button>
                        {images.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 bg-black/60 text-white rounded hover:bg-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-[#D2C5BA] rounded-[4px] p-6 text-center bg-[#FAF4EC]/40 hover:bg-[#FAF4EC] transition-colors cursor-pointer flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <div className="flex items-center gap-2 text-xs text-[#BA4E25]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Rasm yuklanmoqda...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-[#8F8178] mb-1.5" />
                    <p className="text-xs font-semibold text-[#554740]">
                      Kompyuterdan rasm tanlash yoki sudrab tashlash
                    </p>
                    <span className="text-[10px] text-[#A8988E] mt-0.5">
                      JPG, PNG, WEBP formatlar (birinchi rasm muqova sifatida qo'llanadi)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Right Column (Pricing & Toggles) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Pricing Panel */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase">
                NARX VA CHEGIRMA
              </h3>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  ASOSIY NARX (USD) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => setPrice(decimalOnly(e.target.value))}
                  placeholder="420"
                  className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              {/* Scope selection pills */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                  CHEGIRMA DARAJASI (HIERARCHY)
                </label>
                <div className="grid grid-cols-3 gap-1 bg-[#FAF4EC] p-1 rounded-[3px] border border-[#E7E0D8]">
                  {(
                    [
                      { id: 'PAINTING', label: 'Ushbu kartina' },
                      { id: 'ARTIST', label: 'Rassom' },
                      { id: 'CATEGORY', label: 'Kategoriya' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectScope(s.id)}
                      className={`text-[10px] font-semibold py-1.5 rounded-[2px] transition-all cursor-pointer ${
                        discountScope === s.id
                          ? 'bg-white text-[#BA4E25] shadow-xs'
                          : 'text-[#8F8178] hover:text-[#281C18]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {discountScope !== 'PAINTING' && (
                  <p className="text-[10px] text-[#8F7E73] mt-1.5 leading-snug">
                    {discountScope === 'ARTIST'
                      ? `Bu chegirma ${artistsList.find((a: any) => a.id === artistId)?.name || 'tanlangan rassom'}ning barcha kartinalariga qo'llanadi`
                      : `Bu chegirma "${categoriesList.find((c: any) => c.id === topCategoryId)?.name_uz || 'tanlangan'}" kategoriyasidagi barcha kartinalarga qo'llanadi`}
                    {activeRuleFor(discountScope) ? ' (mavjud qoida tahrirlanadi).' : '.'} Foizni o'chirsangiz, qoida bekor qilinadi.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    CHEGIRMA %
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(digitsOnly(e.target.value).slice(0, 2))}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    YAKUNIY NARX
                  </label>
                  <div className="text-sm font-bold text-[#BA4E25] py-2">
                    ${calculatedDiscountPrice ?? numPrice}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-3 pt-2 border-t border-[#E7E0D8]">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#8F8178] uppercase mb-1">
                    BOSHLANISH SANASI
                  </label>
                  <DatePicker
                    value={discountStarts}
                    onChange={setDiscountStarts}
                    buttonClassName="!py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#8F8178] uppercase mb-1">
                    TUGASH SANASI
                  </label>
                  <DatePicker
                    value={discountEnds}
                    onChange={setDiscountEnds}
                    buttonClassName="!py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Toggles Panel */}
            <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase">
                HOLATI VA KO'RINIShI
              </h3>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-[#281C18]">Sotilgan (Sold)</div>
                  <div className="text-[10px] text-[#8F8178]">
                    Kartina saytda "Sotildi" belgisi bilan ko'rinadi
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSold}
                  onChange={(e) => setIsSold(e.target.checked)}
                  className="w-4 h-4 accent-[#BA4E25]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-[#E7E0D8]">
                <div>
                  <div className="text-xs font-semibold text-[#281C18]">Bosh sahifada (Featured)</div>
                  <div className="text-[10px] text-[#8F8178]">
                    Bosh sahifadagi tanlangan asarlar qatorida ko'rsatish
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#BA4E25]"
                />
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* Modal: Inline Add Artist */}
      {showAddArtistModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b pb-3 border-[#E7E0D8]">
              <h3 className="font-serif text-lg font-bold text-[#281C18]">
                Yangi Rassom Qo'shish
              </h3>
              <button
                type="button"
                onClick={() => setShowAddArtistModal(false)}
                className="text-[#8F8178] hover:text-[#281C18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArtist} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Rassom Ism-Sharifi *
                </label>
                <input
                  type="text"
                  required
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="Kamoliddin Behzod"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Ota-kategoriya (yo'nalishi)
                </label>
                <FilterSelect
                  value={newArtistCategoryId}
                  onChange={setNewArtistCategoryId}
                  allValue=""
                  allLabel="— Belgilanmagan —"
                  buttonClassName="!rounded !py-2"
                  options={topLevelCategoryOptions.map((c: any) => ({ value: c.id, label: c.name_uz }))}
                />
                <p className="text-[10.5px] text-[#8F7E73] mt-1">
                  Bu rassom keyingi kartinalarga tanlanganda ota-kategoriya avtomatik shunga o'rnatiladi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    Mutaxassisligi (UZ)
                  </label>
                  <input
                    type="text"
                    value={newArtistSpecialtyUz}
                    {...tr.bind('newArtistSpecialty', 'uz', fieldGroups.newArtistSpecialty)}
                    onChange={(e) => setNewArtistSpecialtyUz(e.target.value)}
                    placeholder="Miniatyura ustasi"
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[#6B5E55] mb-1">
                    Mutaxassisligi (EN)
                    <TranslateStatus translating={tr.translatingGroup === 'newArtistSpecialty'} canUndo={tr.canUndo('newArtistSpecialty')} onUndo={() => tr.undo('newArtistSpecialty')} />
                  </label>
                  <input
                    type="text"
                    value={newArtistSpecialtyEn}
                    {...tr.bind('newArtistSpecialty', 'en', fieldGroups.newArtistSpecialty)}
                    onChange={(e) => setNewArtistSpecialtyEn(e.target.value)}
                    placeholder="Miniature Artist"
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    Mutaxassisligi (RU)
                  </label>
                  <input
                    type="text"
                    value={newArtistSpecialtyRu}
                    {...tr.bind('newArtistSpecialty', 'ru', fieldGroups.newArtistSpecialty)}
                    onChange={(e) => setNewArtistSpecialtyRu(e.target.value)}
                    placeholder="Мастер миниатюры"
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    Tarjimai Hol (Bio - UZ)
                  </label>
                  <textarea
                    rows={2}
                    value={newArtistBioUz}
                    {...tr.bind('newArtistBio', 'uz', fieldGroups.newArtistBio)}
                    onChange={(e) => setNewArtistBioUz(e.target.value)}
                    placeholder="Rassom ijodi haqida o'zbekcha..."
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[#6B5E55] mb-1">
                    Tarjimai Hol (Bio - EN)
                    <TranslateStatus translating={tr.translatingGroup === 'newArtistBio'} canUndo={tr.canUndo('newArtistBio')} onUndo={() => tr.undo('newArtistBio')} />
                  </label>
                  <textarea
                    rows={2}
                    value={newArtistBioEn}
                    {...tr.bind('newArtistBio', 'en', fieldGroups.newArtistBio)}
                    onChange={(e) => setNewArtistBioEn(e.target.value)}
                    placeholder="Artist bio in English..."
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    Tarjimai Hol (Bio - RU)
                  </label>
                  <textarea
                    rows={2}
                    value={newArtistBioRu}
                    {...tr.bind('newArtistBio', 'ru', fieldGroups.newArtistBio)}
                    onChange={(e) => setNewArtistBioRu(e.target.value)}
                    placeholder="Биография на русском..."
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddArtistModal(false)}
                  className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={addingArtist}
                  className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50"
                >
                  {addingArtist ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inline Add Category */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b pb-3 border-[#E7E0D8]">
              <h3 className="font-serif text-lg font-bold text-[#281C18]">
                Yangi Kategoriya Qo'shish
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-[#8F8178] hover:text-[#281C18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Kategoriya Nomi (O'zbekcha) *
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryNameUz}
                  {...tr.bind('newCategoryName', 'uz', fieldGroups.newCategoryName)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCategoryNameUz(val);
                    if (!newCategorySlugManual) {
                      setNewCategorySlug(slugify(val));
                    }
                  }}
                  placeholder="Ipak yo'li manzaralari"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#6B5E55] mb-1">
                  Kategoriya Nomi (Inglizcha - EN)
                  <TranslateStatus translating={tr.translatingGroup === 'newCategoryName'} canUndo={tr.canUndo('newCategoryName')} onUndo={() => tr.undo('newCategoryName')} />
                </label>
                <input
                  type="text"
                  value={newCategoryNameEn}
                  {...tr.bind('newCategoryName', 'en', fieldGroups.newCategoryName)}
                  onChange={(e) => setNewCategoryNameEn(e.target.value)}
                  placeholder="Silk Road Landscapes"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Kategoriya Nomi (Ruscha - RU)
                </label>
                <input
                  type="text"
                  value={newCategoryNameRu}
                  {...tr.bind('newCategoryName', 'ru', fieldGroups.newCategoryName)}
                  onChange={(e) => setNewCategoryNameRu(e.target.value)}
                  placeholder="Пейзажи Шелкового пути"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Ota-kategoriya (mahsulot turi)
                </label>
                <FilterSelect
                  value={newCategoryParentId}
                  onChange={setNewCategoryParentId}
                  allValue=""
                  allLabel="— Yuqori daraja (o'zi mahsulot turi) —"
                  buttonClassName="!rounded !py-2"
                  options={topLevelCategoryOptions.map((c: any) => ({ value: c.id, label: c.name_uz }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#6B5E55]">
                    Slug (URL identifikatori)
                  </label>
                  {!newCategorySlugManual ? (
                    <span className="text-[10px] text-[#429599] font-medium">
                      (Avtomatik)
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#BA4E25] font-medium">
                      (Qo'lda)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={newCategorySlug}
                  onChange={(e) => {
                    setNewCategorySlugManual(true);
                    setNewCategorySlug(e.target.value);
                  }}
                  placeholder="ipak-yoli-manzaralari"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={addingCategory}
                  className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50"
                >
                  {addingCategory ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Background Generation (Gemini) */}
      {aiEditIndex !== null && (
        <AiBackgroundModal
          originalImage={images[aiEditIndex]}
          onClose={() => setAiEditIndex(null)}
          onAccept={(newImageUrl) => {
            setImages((prev) => {
              const next = [...prev];
              next.splice(aiEditIndex + 1, 0, newImageUrl);
              return next;
            });
            setAiEditIndex(null);
          }}
        />
      )}

      {/* Modal: Crop tool, shown right after picking a file */}
      {pendingCropFile && (
        <ImageCropModal
          file={pendingCropFile}
          onCancel={() => setPendingCropFile(null)}
          onCropped={(croppedFile) => {
            setPendingCropFile(null);
            uploadFile(croppedFile);
          }}
          onSkip={(originalFile) => {
            setPendingCropFile(null);
            uploadFile(originalFile);
          }}
        />
      )}
    </>
  );
}
