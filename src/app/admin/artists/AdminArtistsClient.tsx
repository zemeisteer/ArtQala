'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Trash2, Pencil, X, Loader2, Upload } from 'lucide-react';
import FilterSelect from '@/components/FilterSelect';
import Pagination from '@/components/Pagination';
import TranslateStatus from '@/components/TranslateStatus';
import { fillMissingTranslations, useAutoTranslate } from '@/lib/useAutoTranslate';

const PAGE_SIZE = 15;

interface ArtistItem {
  id: string;
  name: string;
  initials?: string | null;
  photo?: string | null;
  specialty_en: string;
  specialty_ru?: string;
  specialty_uz?: string;
  bio_en: string;
  bio_ru?: string;
  bio_uz?: string;
  category_id?: string | null;
  category?: { id: string; name_uz: string } | null;
  _count?: { paintings: number };
}

interface CategoryOption {
  id: string;
  name_uz: string;
}

export default function AdminArtistsClient({
  initialArtists,
  categories,
}: {
  initialArtists: ArtistItem[];
  categories: CategoryOption[];
}) {
  const [artists, setArtists] = useState<ArtistItem[]>(initialArtists);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(artists.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedArtists = useMemo(
    () => artists.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [artists, safePage]
  );

  // Adding/deleting an artist can push the current page past the new
  // total — clamp back instead of showing an empty page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  
  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<ArtistItem | null>(null);

  const [name, setName] = useState('');
  const [specialtyUz, setSpecialtyUz] = useState('');
  const [specialtyEn, setSpecialtyEn] = useState('');
  const [specialtyRu, setSpecialtyRu] = useState('');
  const [bioUz, setBioUz] = useState('');
  const [bioEn, setBioEn] = useState('');
  const [bioRu, setBioRu] = useState('');
  const [photo, setPhoto] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  // Edit any language — the other two are translated from it (see
  // src/lib/useAutoTranslate.ts).
  const tr = useAutoTranslate();

  const fieldGroups = {
    specialty: {
      uz: [specialtyUz, setSpecialtyUz] as const,
      en: [specialtyEn, setSpecialtyEn] as const,
      ru: [specialtyRu, setSpecialtyRu] as const,
    },
    bio: {
      uz: [bioUz, setBioUz] as const,
      en: [bioEn, setBioEn] as const,
      ru: [bioRu, setBioRu] as const,
    },
  };

  const openCreateModal = () => {
    tr.reset();
    setEditingArtist(null);
    setName('');
    setSpecialtyUz('');
    setSpecialtyEn('');
    setSpecialtyRu('');
    setBioUz('');
    setBioEn('');
    setBioRu('');
    setPhoto('');
    setCategoryId('');
    setIsModalOpen(true);
  };

  const openEditModal = (artist: ArtistItem) => {
    tr.reset();
    setEditingArtist(artist);
    setName(artist.name);
    const uzSpecialty = artist.specialty_uz || artist.specialty_en || '';
    const uzBio = artist.bio_uz || artist.bio_en || '';
    setSpecialtyUz(uzSpecialty);
    setBioUz(uzBio);
    // A record saved before this fix could have EN/RU copied verbatim from
    // UZ (the old silent fallback when translation hadn't finished yet) —
    // treat that as "never actually translated" so re-saving retranslates
    // it, instead of the untranslated text looking like a real value.
    setSpecialtyEn(artist.specialty_en && artist.specialty_en !== uzSpecialty ? artist.specialty_en : '');
    setSpecialtyRu(artist.specialty_ru && artist.specialty_ru !== uzSpecialty ? artist.specialty_ru : '');
    setBioEn(artist.bio_en && artist.bio_en !== uzBio ? artist.bio_en : '');
    setBioRu(artist.bio_ru && artist.bio_ru !== uzBio ? artist.bio_ru : '');
    setPhoto(artist.photo || '');
    setCategoryId(artist.category_id || '');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setPhoto(data.url);
      } else {
        alert(data.error || 'Rasm yuklashda xatolik yuz berdi');
      }
    } catch {
      alert('Rasm yuklashda xatolik');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      // Safety net if the admin saved before a blur translation finished:
      // fill any still-empty language from one that isn't.
      const [specialty, bio] = await Promise.all([
        fillMissingTranslations({ uz: specialtyUz, en: specialtyEn, ru: specialtyRu }),
        fillMissingTranslations({ uz: bioUz, en: bioEn, ru: bioRu }),
      ]);
      const firstFilled = (v: Record<string, string>) => v.uz || v.en || v.ru || '';

      const payload = {
        name,
        specialty_uz: specialty.uz || firstFilled(specialty) || 'Rassom',
        specialty_en: specialty.en || firstFilled(specialty) || 'Painter',
        specialty_ru: specialty.ru || firstFilled(specialty) || 'Художник',
        bio_uz: bio.uz || firstFilled(bio),
        bio_en: bio.en || firstFilled(bio),
        bio_ru: bio.ru || firstFilled(bio),
        photo: photo || null,
        category_id: categoryId || null,
      };

      if (editingArtist) {
        // UPDATE (PUT)
        const res = await fetch(`/api/admin/artists/${editingArtist.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.artist) {
          setArtists((prev) =>
            prev.map((a) => (a.id === editingArtist.id ? { ...a, ...data.artist } : a))
          );
          setIsModalOpen(false);
        } else {
          alert(data.error || 'Rassom ma\'lumotlarini yangilashda xatolik');
        }
      } else {
        // CREATE (POST)
        const res = await fetch('/api/admin/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.artist) {
          setArtists((prev) => [
            { ...data.artist, _count: { paintings: 0 } },
            ...prev,
          ]);
          setIsModalOpen(false);
        } else {
          alert(data.error || 'Rassom qo\'shishda xatolik');
        }
      }
    } catch {
      alert('Serverga bog\'lanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, artistName: string) => {
    if (!confirm(`"${artistName}" rassomini o'chirishni tasdiqlaysizmi?`)) return;

    try {
      const res = await fetch(`/api/admin/artists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArtists((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert('O\'chirishda xatolik yuz berdi.');
      }
    } catch {
      alert('Serverga bog\'lanishda xatolik.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
              Rassomlar Boshqaruvi
            </h2>
            <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
              {artists.length}
            </span>
          </div>
          <p className="text-xs text-[#726861] mt-0.5">
            Galereyada ro'yxatdan o'tgan ustalar va rassomlar ro'yxati (PostgreSQL)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Rassom Qo'shish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagedArtists.map((a) => (
          <div
            key={a.id}
            className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {a.photo ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#E7E0D8]">
                    <Image src={a.photo} alt={a.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#BA4E25] text-white font-serif font-bold text-lg flex items-center justify-center">
                    {a.initials || a.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-serif font-semibold text-lg text-[#281C18]">
                    {a.name}
                  </h3>
                  <span className="text-[10.5px] font-bold tracking-wider text-[#429599] uppercase">
                    {a.specialty_uz || a.specialty_en}
                    {a.category?.name_uz && <> · {a.category.name_uz}</>}
                  </span>
                </div>
              </div>

              {/* Action buttons (Edit & Delete) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditModal(a)}
                  className="p-1.5 text-[#554740] hover:text-[#BA4E25] hover:bg-[#FAF4EC] rounded cursor-pointer"
                  title="Tahrirlash"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(a.id, a.name)}
                  className="p-1.5 text-[#8F7E73] hover:text-red-600 hover:bg-[#FAF4EC] rounded cursor-pointer"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-[#5F534C] leading-relaxed line-clamp-3">
              {a.bio_uz || a.bio_en}
            </p>

            <div className="pt-2 border-t border-[#F0EAE1] flex items-center justify-between text-xs text-[#726861]">
              <span>
                Asarlar soni: <strong className="text-[#281C18]">{a._count?.paintings || 0}</strong>
              </span>
              <Link
                href={`/admin/paintings?artist=${a.id}`}
                className="text-[#BA4E25] font-semibold hover:underline"
              >
                Kartinalarni ko'rish →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs">
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            totalItems={artists.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {/* Modal: Create or Edit Artist */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b pb-3 border-[#E7E0D8]">
              <h3 className="font-serif text-lg font-bold text-[#281C18]">
                {editingArtist ? 'Rassomni Tahrirlash' : 'Yangi Rassom Qo\'shish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8F7E73] hover:text-[#281C18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Rassom Ism-Sharifi *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kamoliddin Behzod"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Ota-kategoriya (yo'nalishi)
                </label>
                <FilterSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  allValue=""
                  allLabel="— Belgilanmagan —"
                  buttonClassName="!rounded !py-2"
                  options={categories.map((c) => ({ value: c.id, label: c.name_uz }))}
                />
                <p className="text-[10.5px] text-[#8F7E73] mt-1">
                  Kartina qo'shishda bu rassom tanlansa, ota-kategoriya avtomatik shunga o'rnatiladi.
                </p>
              </div>

              {/* Mutaxassislik (3 tilda) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    MUTAXASSISLIGI (UZ)
                  </label>
                  <input
                    type="text"
                    value={specialtyUz}
                    {...tr.bind('specialty', 'uz', fieldGroups.specialty)}
                    onChange={(e) => setSpecialtyUz(e.target.value)}
                    placeholder="Minyatura ustasi"
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[#6B5E55] mb-1">
                    MUTAXASSISLIGI (EN)
                    <TranslateStatus translating={tr.translatingGroup === 'specialty'} canUndo={tr.canUndo('specialty')} onUndo={() => tr.undo('specialty')} />
                  </label>
                  <input
                    type="text"
                    value={specialtyEn}
                    {...tr.bind('specialty', 'en', fieldGroups.specialty)}
                    onChange={(e) => setSpecialtyEn(e.target.value)}
                    placeholder="Miniature master"
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    MUTAXASSISLIGI (RU)
                  </label>
                  <input
                    type="text"
                    value={specialtyRu}
                    {...tr.bind('specialty', 'ru', fieldGroups.specialty)}
                    onChange={(e) => setSpecialtyRu(e.target.value)}
                    placeholder="Мастер миниатюры"
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              {/* Bio (3 tilda) */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    TARJIMAI HOL (UZ)
                  </label>
                  <textarea
                    rows={2}
                    value={bioUz}
                    {...tr.bind('bio', 'uz', fieldGroups.bio)}
                    onChange={(e) => setBioUz(e.target.value)}
                    placeholder="Rassom hayoti va ijodiy yo'li (O'zbekcha)..."
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[#6B5E55] mb-1">
                    TARJIMAI HOL (EN)
                    <TranslateStatus translating={tr.translatingGroup === 'bio'} canUndo={tr.canUndo('bio')} onUndo={() => tr.undo('bio')} />
                  </label>
                  <textarea
                    rows={2}
                    value={bioEn}
                    {...tr.bind('bio', 'en', fieldGroups.bio)}
                    onChange={(e) => setBioEn(e.target.value)}
                    placeholder="Artist biography (English)..."
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B5E55] mb-1">
                    TARJIMAI HOL (RU)
                  </label>
                  <textarea
                    rows={2}
                    value={bioRu}
                    {...tr.bind('bio', 'ru', fieldGroups.bio)}
                    onChange={(e) => setBioRu(e.target.value)}
                    placeholder="Биография художника (Русский)..."
                    className="w-full text-xs px-2.5 py-1.5 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                  Rassom Fotosi
                </label>
                <div className="flex items-center gap-3">
                  {photo && (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#E7E0D8] shrink-0">
                      <Image src={photo} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                  <label className="flex-1 border border-dashed border-[#D2C5BA] rounded p-2 text-center text-xs text-[#554740] hover:bg-[#FAF4EC] cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto ? (
                      <span className="text-[#BA4E25]">Yuklanmoqda...</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{photo ? 'Fotosuratni almashtirish' : 'Rasm yuklash'}</span>
                      </span>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : editingArtist ? 'Saqlash' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
