'use client';

import React, { useState } from 'react';
import { Gem, Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import TranslateStatus from '@/components/TranslateStatus';
import { fillMissingTranslations, useAutoTranslate } from '@/lib/useAutoTranslate';

interface Accessory {
  id: string;
  name_en: string;
  name_ru: string;
  name_uz: string;
  price_small: number;
  price_medium: number | null;
  price_large: number | null;
  is_active: boolean;
  product_types: string[];
}

interface Category {
  id: string;
  slug: string;
  name_uz: string;
}

interface AdminAccessoriesClientProps {
  initialAccessories: Accessory[];
  categories: Category[];
}

interface FormState {
  name_en: string;
  name_ru: string;
  name_uz: string;
  price_small: string;
  price_medium: string;
  price_large: string;
  is_active: boolean;
  product_types: string[];
}

// Services (mural/ceramics/custom commissions) aren't backed by a DB table —
// these three literal codes are what ServicesClient sends as productTypes.
// Painting-side options come from the Category table (see productTypeOptions
// below), so gallery categories added later in the Categories tab show up
// here automatically without a code change.
const SERVICE_TYPES: { value: string; label: string }[] = [
  { value: 'MURAL', label: 'Xizmat: Devoriy rasm (Mural)' },
  { value: 'CERAMICS', label: 'Xizmat: Kulolchilik buyurtmasi' },
  { value: 'CUSTOM', label: 'Xizmat: Maxsus buyurtma' },
];

const emptyForm: FormState = {
  name_en: '',
  name_ru: '',
  name_uz: '',
  price_small: '',
  price_medium: '',
  price_large: '',
  is_active: true,
  product_types: [],
};

export default function AdminAccessoriesClient({ initialAccessories, categories }: AdminAccessoriesClientProps) {
  const [accessories, setAccessories] = useState<Accessory[]>(initialAccessories);

  const productTypeOptions = [
    ...categories.map((c) => ({ value: c.slug, label: c.name_uz })),
    ...SERVICE_TYPES,
  ];
  const productTypeLabel = (value: string) =>
    productTypeOptions.find((p) => p.value === value)?.label || value;
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Edit the name in any language — the other two are translated from it
  // (see src/lib/useAutoTranslate.ts).
  const tr = useAutoTranslate();
  const setName = (lang: 'uz' | 'en' | 'ru') => (value: string) =>
    setForm((prev) => ({ ...prev, [`name_${lang}`]: value }));
  const nameFields = {
    uz: [form.name_uz, setName('uz')] as const,
    en: [form.name_en, setName('en')] as const,
    ru: [form.name_ru, setName('ru')] as const,
  };

  const openAddModal = () => {
    tr.reset();
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (a: Accessory) => {
    tr.reset();
    setEditingId(a.id);
    setForm({
      name_en: a.name_en,
      name_ru: a.name_ru,
      name_uz: a.name_uz,
      price_small: String(a.price_small),
      price_medium: a.price_medium !== null ? String(a.price_medium) : '',
      price_large: a.price_large !== null ? String(a.price_large) : '',
      is_active: a.is_active,
      product_types: a.product_types || [],
    });
    setShowModal(true);
  };

  const toggleProductType = (value: string) => {
    setForm((prev) => ({
      ...prev,
      product_types: prev.product_types.includes(value)
        ? prev.product_types.filter((t) => t !== value)
        : [...prev.product_types, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/accessories/${editingId}` : '/api/admin/accessories';
      const method = editingId ? 'PUT' : 'POST';
      // Safety net if saved before the blur translation finished.
      const names = await fillMissingTranslations({ uz: form.name_uz, en: form.name_en, ru: form.name_ru });
      const firstName = names.uz || names.en || names.ru;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name_uz: names.uz || firstName,
          name_en: names.en || firstName,
          name_ru: names.ru || firstName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (editingId) {
          setAccessories((prev) => prev.map((a) => (a.id === editingId ? data.accessory : a)));
        } else {
          setAccessories((prev) => [data.accessory, ...prev]);
        }
        setShowModal(false);
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Serverga bog\'lanishda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    try {
      const res = await fetch(`/api/admin/accessories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAccessories((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      alert("O'chirishda xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-[#281C18] flex items-center gap-2.5">
            <Gem className="w-6 h-6 text-[#BA4E25]" />
            Qo'shimcha mahsulotlar (Aksessuarlar)
            <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
              {accessories.length}
            </span>
          </h2>
          <p className="text-xs text-[#726861] mt-1">
            Mijozlar so'rov yuborayotganda tanlashi mumkin bo'lgan ixtiyoriy qo'shimcha xizmatlar (futlyar va h.k.).
            Qaysi kategoriya yoki xizmat turiga tegishli ekanini belgilaysiz.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi qo'shish</span>
        </button>
      </div>

      {accessories.length === 0 ? (
        <div className="text-center py-16 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] text-sm text-[#8F8178]">
          Hali qo'shimcha mahsulot qo'shilmagan.
        </div>
      ) : (
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E7E0D8] bg-[#FAF4EC]">
                <th className="px-5 py-3 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase">Nomi</th>
                <th className="px-5 py-3 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase">Narxi</th>
                <th className="px-5 py-3 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase">Mahsulot turi</th>
                <th className="px-5 py-3 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase">Holati</th>
                <th className="px-5 py-3 text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((a) => (
                <tr key={a.id} className="border-b border-[#F2ECE4] last:border-0">
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#281C18]">{a.name_uz}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-[#BA4E25]">
                    {a.price_medium === null && a.price_large === null
                      ? `$${a.price_small}`
                      : `$${a.price_small} – $${a.price_large ?? a.price_medium}`}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6E6057]">
                    {!a.product_types || a.product_types.length === 0
                      ? 'Barcha turlar'
                      : a.product_types.map(productTypeLabel).join(', ')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {a.is_active ? 'Faol' : "O'chirilgan"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openEditModal(a)}
                      className="p-1.5 text-[#726861] hover:text-[#429599] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-[#726861] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-[#E7E0D8]">
              <h3 className="font-serif text-lg font-bold text-[#281C18]">
                {editingId ? 'Mahsulotni tahrirlash' : "Yangi qo'shimcha mahsulot"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#8F8178] hover:text-[#281C18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B5E55] mb-1">
                    Nomi (UZ)
                    <TranslateStatus translating={tr.translatingGroup === 'name'} canUndo={tr.canUndo('name')} onUndo={() => tr.undo('name')} />
                  </label>
                  <input
                    type="text"
                    required={!form.name_uz.trim() && !form.name_en.trim() && !form.name_ru.trim()}
                    value={form.name_uz}
                    {...tr.bind('name', 'uz', nameFields)}
                    onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
                    placeholder="Himoya futlyari"
                    className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B5E55] mb-1">
                    Nomi (EN)
                  </label>
                  <input
                    type="text"
                    value={form.name_en}
                    {...tr.bind('name', 'en', nameFields)}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="Protective Case"
                    className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B5E55] mb-1">
                    Nomi (RU)
                  </label>
                  <input
                    type="text"
                    value={form.name_ru}
                    {...tr.bind('name', 'ru', nameFields)}
                    onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
                    placeholder="Защитный чехол"
                    className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B5E55] mb-1.5">
                  Narxi (USD) — o'lchamiga qarab
                </label>
                <p className="text-[10.5px] text-[#8F8178] mb-2">
                  O'rta/Katta uchun bo'sh qoldirsangiz, Kichik narxdan foydalaniladi.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#8F8178] mb-1">Kichik *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.price_small}
                      onChange={(e) => setForm({ ...form, price_small: e.target.value })}
                      placeholder="25"
                      className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8F8178] mb-1">O'rta</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price_medium}
                      onChange={(e) => setForm({ ...form, price_medium: e.target.value })}
                      placeholder="50"
                      className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8F8178] mb-1">Katta</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price_large}
                      onChange={(e) => setForm({ ...form, price_large: e.target.value })}
                      placeholder="85"
                      className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B5E55] mb-1.5">
                  Qaysi mahsulot turiga tegishli
                </label>
                <p className="text-[10.5px] text-[#8F8178] mb-2">
                  Hech birini belgilamasangiz — barcha turlarga tegishli bo'ladi.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {productTypeOptions.map((pt) => {
                    const selected = form.product_types.includes(pt.value);
                    return (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => toggleProductType(pt.value)}
                        className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded border transition-all text-left cursor-pointer ${
                          selected
                            ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                            : 'bg-white text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25]'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{pt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#BA4E25]"
                />
                <span className="text-xs font-semibold text-[#281C18]">Faol (mijozlarga ko'rsatiladi)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
