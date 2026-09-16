'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Search, Pencil, Trash2, Palette } from 'lucide-react';
import FilterSelect from '@/components/FilterSelect';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

interface AdminPaintingsClientProps {
  initialPaintings: any[];
  categories: any[];
  artists: any[];
}

export default function AdminPaintingsClient({
  initialPaintings,
  categories,
  artists,
}: AdminPaintingsClientProps) {
  const [paintings, setPaintings] = useState(initialPaintings);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [artistFilter, setArtistFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // The filter dropdown only lists product types (ota kategoriya) — a
  // painting's own category can be a theme underneath one, so matching
  // must check both the exact category and its parent, not just an exact
  // id match against a flat list that mixed ota and bola together.
  const topLevelCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  // Scope the artist dropdown to whichever product type is selected —
  // otherwise picking "Somon" still offered every artist, including ones
  // whose default category is a completely different product type
  // (Artist.category_id, the same field the Paintings form auto-fills
  // from). Artists with no category set stay visible everywhere, since
  // nothing rules them out of any product type.
  const artistOptions = useMemo(() => {
    if (categoryFilter === 'ALL') return artists;
    return artists.filter((a) => !a.category_id || a.category_id === categoryFilter);
  }, [artists, categoryFilter]);

  // If switching category makes the current artist selection invalid,
  // reset it instead of silently filtering everything to zero results.
  useEffect(() => {
    if (artistFilter !== 'ALL' && !artistOptions.some((a) => a.id === artistFilter)) {
      setArtistFilter('ALL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const filtered = useMemo(() => {
    return paintings.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category_id !== categoryFilter && p.category?.parent_id !== categoryFilter) {
        return false;
      }
      if (artistFilter !== 'ALL' && p.artist_id !== artistFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = p.title_en.toLowerCase().includes(q);
        const matchesArtist = p.artist?.name.toLowerCase().includes(q);
        return matchesTitle || matchesArtist;
      }
      return true;
    });
  }, [paintings, search, categoryFilter, artistFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, artistFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/paintings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPaintings((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      alert('Failed to delete painting');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
              Paintings
            </h2>
            <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
              {paintings.length}
            </span>
          </div>
          <p className="text-xs text-[#726861] mt-0.5">
            Manage your gallery collection, prices, and availability
          </p>
        </div>
        <Link
          href="/admin/paintings/new"
          className="inline-flex items-center gap-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs px-4 py-2.5 rounded-[3px] transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Painting</span>
        </Link>
      </div>

      {/* Filter and Search Bar matching AdminPaintings.png */}
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8F8178] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or artist..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] text-xs text-[#281C18] focus:outline-none focus:border-[#BA4E25]"
          />
        </div>

        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          allValue="ALL"
          allLabel="All categories"
          className="w-44"
          buttonClassName="!rounded-[3px] !py-2"
          options={topLevelCategories.map((c) => ({ value: c.id, label: c.name_en }))}
        />

        <FilterSelect
          value={artistFilter}
          onChange={setArtistFilter}
          allValue="ALL"
          allLabel="All artists"
          searchable
          className="w-44"
          buttonClassName="!rounded-[3px] !py-2"
          options={artistOptions.map((a) => ({ value: a.id, label: a.name }))}
        />
      </div>

      {/* Paintings Table matching AdminPaintings.png */}
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF4EC] border-b border-[#E7E0D8] text-[#8F8178] font-bold tracking-wider uppercase text-[10.5px]">
                <th className="py-3 px-4">TITLE</th>
                <th className="py-3 px-4">ARTIST</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">PRICE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE1]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#8F8178]">
                      <Palette className="w-8 h-8 text-[#D2C5BA]" />
                      <p className="text-sm font-medium text-[#726861]">
                        {paintings.length === 0
                          ? "Hali kartina qo'shilmagan"
                          : 'Bu qidiruv/filtrga mos kartina topilmadi'}
                      </p>
                      {paintings.length === 0 && (
                        <p className="text-xs">
                          Yuqoridagi "+ Add Painting" tugmasi bilan birinchi kartinangizni qo'shing.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {paged.map((p) => {
                let thumb = '/assets/p-arch.svg';
                try {
                  const imgs = JSON.parse(p.images);
                  if (imgs.length > 0) thumb = imgs[0];
                } catch {}

                const hasDiscount = !!p.discount_price && p.discount_price < p.price;

                return (
                  <tr key={p.id} className="hover:bg-[#FAF4EC]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[2px] overflow-hidden relative border border-[#E7E0D8] shrink-0 bg-[#F4ECE1]">
                          <Image src={thumb} alt={p.title_en} fill className="object-cover" />
                        </div>
                        <span className="font-semibold text-[#281C18] text-sm">
                          {p.title_en}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#554740]">{p.artist?.name}</td>
                    <td className="py-3 px-4 text-[#726861]">{p.category?.name_en}</td>
                    <td className="py-3 px-4">
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="line-through text-[#9E9086] text-[11px]">
                            ${p.price}
                          </span>
                          <span className="font-bold text-[#BA4E25] text-xs">
                            ${p.discount_price}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-[#BA4E25]">${p.price}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {p.is_sold ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="bg-[#E7DFD9] text-[#7A6B62] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full self-start">
                            Sold
                          </span>
                          {p.inquiries?.[0]?.final_price != null && (
                            <span className="text-[10.5px] text-[#8F7E73]">
                              Sotilgan narx: <strong className="text-[#281C18]">${p.inquiries[0].final_price}</strong>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/paintings/${p.id}`}
                          className="p-1.5 text-[#554740] hover:text-[#BA4E25] transition-colors rounded hover:bg-[#FAF4EC]"
                          title="Edit painting"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.title_en)}
                          className="p-1.5 text-[#554740] hover:text-[#C62828] transition-colors rounded hover:bg-[#FAF4EC]"
                          title="Delete painting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onChange={setPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
