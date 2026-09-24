'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Pencil, X, Layers, CornerDownRight, ChevronDown } from 'lucide-react';
import FilterSelect from '@/components/FilterSelect';
import TranslateStatus from '@/components/TranslateStatus';
import { fillMissingTranslations, useAutoTranslate } from '@/lib/useAutoTranslate';

interface CategoryItem {
  id: string;
  slug: string;
  name_en: string;
  name_ru: string;
  name_uz: string;
  parent_id?: string | null;
  parent?: { id: string; name_uz: string } | null;
  _count?: { paintings: number };
}

type FormMode = 'create-parent' | 'create-child' | 'edit';

export default function AdminCategoriesClient({
  initialCategories,
}: {
  initialCategories: CategoryItem[];
}) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);

  // Accordion — only one parent's children are shown at a time; opening a
  // different one closes whichever was open.
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create-parent');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [nameUz, setNameUz] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManualEdited, setSlugManualEdited] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Edit the name in any language — the other two are translated from it
  // (see src/lib/useAutoTranslate.ts). reset() on every form open keeps a
  // late response for one category from landing in the next one's fields.
  const tr = useAutoTranslate();
  const nameFields = {
    uz: [nameUz, setNameUz] as const,
    en: [nameEn, setNameEn] as const,
    ru: [nameRu, setNameRu] as const,
  };

  // Only a top-level category (no parent of its own) can be picked as a
  // parent — only one level of nesting is used, and a category can't be a
  // parent of one being edited.
  const topLevelOptions = categories.filter(
    (c) => !c.parent_id && c.id !== editingCategory?.id
  );

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[ʻʼ'`]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNameUzChange = (val: string) => {
    setNameUz(val);
    if (!slugManualEdited) {
      setSlug(slugify(val));
    }
  };

  const resetForm = () => {
    tr.reset();
    setEditingCategory(null);
    setNameUz('');
    setNameEn('');
    setNameRu('');
    setSlug('');
    setSlugManualEdited(false);
    setParentId('');
  };

  // Ota kategoriya — mustaqil mahsulot turi (masalan "Kartina", "Kulolchilik").
  // Hech qanday ota-kategoriyaga bog'lanmaydi.
  const openCreateParentModal = () => {
    resetForm();
    setFormMode('create-parent');
    setIsModalOpen(true);
  };

  // Bola kategoriya — mavjud ota-kategoriyaning ichidagi mavzu (masalan
  // "Kartina" ostidagi "Tabiat"). Ota-kategoriyani tanlash SHART.
  const openCreateChildModal = () => {
    resetForm();
    setFormMode('create-child');
    setParentId(topLevelOptions[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    tr.reset();
    setEditingCategory(cat);
    setFormMode('edit');
    setNameUz(cat.name_uz || '');
    setNameEn(cat.name_en || '');
    setNameRu(cat.name_ru || '');
    setSlug(cat.slug || '');
    setSlugManualEdited(true);
    setParentId(cat.parent_id || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameUz.trim() && !nameEn.trim() && !nameRu.trim()) return;
    if (formMode === 'create-child' && !parentId) {
      alert("Bola kategoriya uchun ota-kategoriyani tanlash shart");
      return;
    }

    setLoading(true);
    try {
      // Safety net if the admin saved (e.g. pressed Enter) before the blur
      // translation finished: fill any empty language from one that isn't.
      const names = await fillMissingTranslations({ uz: nameUz, en: nameEn, ru: nameRu });
      const firstName = names.uz || names.en || names.ru;

      const payload = {
        name_uz: names.uz || firstName,
        name_en: names.en || firstName,
        name_ru: names.ru || firstName,
        slug: slug.trim() || undefined,
        parent_id: formMode === 'create-parent' ? null : parentId || null,
      };

      if (editingCategory) {
        const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.category) {
          setCategories((prev) =>
            prev.map((c) => (c.id === editingCategory.id ? { ...c, ...data.category } : c))
          );
          setIsModalOpen(false);
        } else {
          alert(data.error || 'Kategoriyani yangilashda xatolik');
        }
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.category) {
          setCategories((prev) => [
            ...prev,
            { ...data.category, _count: { paintings: 0 } },
          ]);
          setIsModalOpen(false);
        } else {
          alert(data.error || "Kategoriya qo'shishda xatolik yuz berdi");
        }
      }
    } catch {
      alert("Serverga bog'lanishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" kategoriyasini o'chirishni tasdiqlaysizmi?`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert("O'chirishda xatolik yuz berdi.");
      }
    } catch {
      alert("Serverga bog'lanishda xatolik.");
    }
  };

  // Group for display: each top-level category followed by its children.
  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // A single row's cells (shared markup between the parent header row and
  // child rows — only the container styling around it differs). A parent
  // row with children gets a chevron toggle instead of a plain label.
  const renderCells = (
    c: CategoryItem,
    isChild: boolean,
    expandToggle?: { childCount: number; isExpanded: boolean; onToggle: () => void }
  ) => (
    <>
      <td className={`py-3 px-4 ${isChild ? 'text-[#554740]' : 'font-semibold text-[#281C18]'}`}>
        {expandToggle ? (
          <button
            type="button"
            onClick={expandToggle.onToggle}
            className="flex items-center gap-1.5 cursor-pointer hover:text-[#BA4E25] transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#8F7E73] shrink-0 transition-transform ${
                expandToggle.isExpanded ? 'rotate-180' : ''
              }`}
            />
            <span>{c.name_uz}</span>
            <span className="text-[10.5px] font-normal text-[#8F7E73]">
              ({expandToggle.childCount})
            </span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5">
            {isChild && <CornerDownRight className="w-3.5 h-3.5 text-[#C8B8AB] shrink-0" />}
            {c.name_uz}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-[#554740]">{c.name_en}</td>
      <td className="py-3 px-4 text-[#554740]">{c.name_ru}</td>
      <td className="py-3 px-4 font-mono text-[#8F8178]">{c.slug}</td>
      <td className="py-3 px-4 text-center font-bold text-[#BA4E25]">
        {c._count?.paintings || 0}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditModal(c)}
            className="p-1.5 text-[#554740] hover:text-[#BA4E25] hover:bg-white rounded transition-colors cursor-pointer"
            title="Tahrirlash"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(c.id, c.name_uz || c.name_en)}
            className="p-1.5 text-[#8F7E73] hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
            title="O'chirish"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
              Kategoriyalar Boshqaruvi
            </h2>
            <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
              {categories.length}
            </span>
          </div>
          <p className="text-xs text-[#726861] mt-0.5">
            <strong>Ota kategoriya</strong> — mahsulot turi (Kartina, Kulolchilik...). <strong>Bola kategoriya</strong> — shu turdagi mavzu (Tabiat, Portretlar...).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateParentModal}
            className="px-4 py-2 bg-[#281C18] hover:bg-[#3A2A22] text-white text-xs font-semibold rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Ota kategoriya qo'shish</span>
          </button>
          <button
            onClick={openCreateChildModal}
            disabled={topLevelOptions.length === 0}
            className="px-4 py-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={topLevelOptions.length === 0 ? 'Avval kamida bitta ota-kategoriya yarating' : ''}
          >
            <Plus className="w-4 h-4" />
            <span>Bola kategoriya qo'shish</span>
          </button>
        </div>
      </div>

      {/* One continuous table, like before — a parent row with children is
          a collapsible accordion row: clicking it drops its children down
          right below, and only one parent's children are shown at a time
          (opening another closes it). */}
      {parents.length === 0 ? (
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs py-10 px-4 text-center text-[#8F8178] text-xs">
          Hali kategoriya yo'q. Avval "Ota kategoriya qo'shish" bilan boshlang.
        </div>
      ) : (
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF4EC] border-b border-[#E7E0D8] text-[#8F8178] font-bold tracking-wider uppercase text-[10.5px]">
                <th className="py-2.5 px-4">NOMI (UZ)</th>
                <th className="py-2.5 px-4">NOMI (EN)</th>
                <th className="py-2.5 px-4">NOMI (RU)</th>
                <th className="py-2.5 px-4">SLUG</th>
                <th className="py-2.5 px-4 text-center">ASARLAR SONI</th>
                <th className="py-2.5 px-4 text-right">AMALLAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE1]">
              {parents.map((parent) => {
                const children = childrenOf(parent.id);
                const isExpanded = expandedParentId === parent.id;
                return (
                  <React.Fragment key={parent.id}>
                    <tr className="bg-white hover:bg-[#FAF4EC]/60 transition-colors">
                      {renderCells(
                        parent,
                        false,
                        children.length > 0
                          ? {
                              childCount: children.length,
                              isExpanded,
                              onToggle: () =>
                                setExpandedParentId((prev) => (prev === parent.id ? null : parent.id)),
                            }
                          : undefined
                      )}
                    </tr>
                    {isExpanded &&
                      children.map((child) => (
                        <tr key={child.id} className="bg-[#FAF4EC]/40 hover:bg-[#FAF4EC]/70 transition-colors">
                          {renderCells(child, true)}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create (parent/child) or Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b pb-3 border-[#E7E0D8]">
              <h3 className="font-serif text-lg font-bold text-[#281C18]">
                {formMode === 'edit'
                  ? 'Kategoriyani Tahrirlash'
                  : formMode === 'create-parent'
                  ? "Yangi Ota Kategoriya"
                  : 'Yangi Bola Kategoriya'}
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
                  Kategoriya Nomi (O'zbekcha)
                </label>
                <input
                  type="text"
                  required={!nameUz.trim() && !nameEn.trim() && !nameRu.trim()}
                  value={nameUz}
                  {...tr.bind('name', 'uz', nameFields)}
                  onChange={(e) => handleNameUzChange(e.target.value)}
                  placeholder={formMode === 'create-parent' ? 'Kartina' : "Ipak yo'li manzaralari"}
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#6B5E55] mb-1">
                  Kategoriya Nomi (Inglizcha - EN)
                  <TranslateStatus translating={tr.translatingGroup === 'name'} canUndo={tr.canUndo('name')} onUndo={() => tr.undo('name')} />
                </label>
                <input
                  type="text"
                  value={nameEn}
                  {...tr.bind('name', 'en', nameFields)}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={formMode === 'create-parent' ? 'Paintings' : 'Silk Road Landscapes'}
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#6B5E55] mb-1">
                  Kategoriya Nomi (Ruscha - RU)
                </label>
                <input
                  type="text"
                  value={nameRu}
                  {...tr.bind('name', 'ru', nameFields)}
                  onChange={(e) => setNameRu(e.target.value)}
                  placeholder={formMode === 'create-parent' ? 'Картины' : 'Пейзажи Шелкового пути'}
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              {formMode === 'create-parent' && (
                <p className="text-[10.5px] text-[#8F7E73] bg-[#FAF4EC] border border-[#E7E0D8] rounded px-3 py-2">
                  Bu — mustaqil mahsulot turi bo'ladi (ota-kategoriyasi yo'q). Masalan: Kartina, Kulolchilik, Somon ishlari.
                </p>
              )}

              {(formMode === 'create-child' || formMode === 'edit') && (
                <div>
                  <label className="block text-xs font-bold text-[#6B5E55] mb-1">
                    Ota-kategoriya {formMode === 'create-child' && '*'}
                  </label>
                  <FilterSelect
                    value={parentId}
                    onChange={setParentId}
                    buttonClassName="!rounded !py-2"
                    {...(formMode === 'edit' ? { allValue: '', allLabel: '— Yuqori daraja (o\'zi mahsulot turi) —' } : {})}
                    options={topLevelOptions.map((c) => ({ value: c.id, label: c.name_uz }))}
                  />
                  {formMode === 'create-child' && (
                    <p className="text-[10.5px] text-[#8F7E73] mt-1">
                      Bu kategoriya shu ota-kategoriyaning mavzusi/ichidagi bo'limi bo'ladi.
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#6B5E55]">
                    Slug (URL identifikatori)
                  </label>
                  {!slugManualEdited ? (
                    <span className="text-[10px] text-[#429599] font-medium">
                      (Avtomatik yaratilmoqda)
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#BA4E25] font-medium">
                      (Qo'lda tahrirlangan)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugManualEdited(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="ipak-yoli-manzaralari"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25] font-mono text-[#281C18]"
                />
                <p className="text-[10.5px] text-[#8F7E73] mt-1">
                  Default holatda O'zbekcha nomidan avtomatik generatsiya qilinadi. Xohlasangiz qo'lda o'zgartirishingiz mumkin.
                </p>
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
                  {loading ? 'Saqlanmoqda...' : editingCategory ? 'Saqlash' : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
