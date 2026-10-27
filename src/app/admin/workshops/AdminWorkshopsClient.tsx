'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, Pencil, Trash2, Loader2, ImagePlus, X, Eye, EyeOff } from 'lucide-react';
import { fillMissingTranslations, useAutoTranslate } from '@/lib/useAutoTranslate';
import TranslateStatus from '@/components/TranslateStatus';

interface Workshop {
  id: string;
  title_uz: string;
  title_en: string;
  title_ru: string;
  description_uz: string | null;
  description_en: string | null;
  description_ru: string | null;
  duration_minutes: number;
  price: number;
  max_people: number | null;
  location: string | null;
  image: string | null;
  is_active: boolean;
  sort: number;
}

const EMPTY = {
  title_uz: '',
  title_en: '',
  title_ru: '',
  description_uz: '',
  description_en: '',
  description_ru: '',
  duration_minutes: '120',
  price: '',
  max_people: '',
  location: '',
  image: '',
  is_active: true,
  sort: '0',
};
type Form = typeof EMPTY;

const input = 'w-full text-sm px-3 py-2 border border-[#E7E0D8] rounded-[3px] bg-white focus:outline-none focus:border-[#BA4E25]';
const label = 'flex items-center gap-1.5 text-[11px] font-bold text-[#6B5E55] mb-1';

// Admin → Master-klasslar: what /experiences offers. Bookings arrive in
// Service Requests (type "Master-klass") and on Telegram.
export default function AdminWorkshopsClient({ initial }: { initial: Workshop[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tr = useAutoTranslate();

  const setField = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const titleFields = {
    uz: [form.title_uz, setField('title_uz')] as const,
    en: [form.title_en, setField('title_en')] as const,
    ru: [form.title_ru, setField('title_ru')] as const,
  };
  const descFields = {
    uz: [form.description_uz, setField('description_uz')] as const,
    en: [form.description_en, setField('description_en')] as const,
    ru: [form.description_ru, setField('description_ru')] as const,
  };

  const open = (w?: Workshop) => {
    tr.reset();
    setError(null);
    setEditing(w ? w.id : 'new');
    setForm(
      w
        ? {
            title_uz: w.title_uz,
            title_en: w.title_en,
            title_ru: w.title_ru,
            description_uz: w.description_uz || '',
            description_en: w.description_en || '',
            description_ru: w.description_ru || '',
            duration_minutes: String(w.duration_minutes),
            price: String(w.price),
            max_people: w.max_people ? String(w.max_people) : '',
            location: w.location || '',
            image: w.image || '',
            is_active: w.is_active,
            sort: String(w.sort),
          }
        : EMPTY
    );
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.url) setForm((f) => ({ ...f, image: data.url }));
      else setError(data.error || 'Rasm yuklanmadi');
    } catch {
      setError('Rasm yuklanmadi');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const titles = await fillMissingTranslations({ uz: form.title_uz, en: form.title_en, ru: form.title_ru }, 'uz', 'title');
      const descs = form.description_uz.trim() || form.description_en.trim() || form.description_ru.trim()
        ? await fillMissingTranslations({ uz: form.description_uz, en: form.description_en, ru: form.description_ru }, 'uz', 'description')
        : { uz: '', en: '', ru: '' };
      const body = {
        ...form,
        title_uz: titles.uz,
        title_en: titles.en,
        title_ru: titles.ru,
        description_uz: descs.uz,
        description_en: descs.en,
        description_ru: descs.ru,
      };
      const res = await fetch(editing === 'new' ? '/api/admin/workshops' : `/api/admin/workshops/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Saqlanmadi');
        return;
      }
      setList((l) =>
        (editing === 'new' ? [...l, data.workshop] : l.map((w) => (w.id === editing ? data.workshop : w))).sort(
          (a, b) => a.sort - b.sort
        )
      );
      setEditing(null);
    } catch {
      setError("Serverga bog'lanib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (w: Workshop) => {
    if (!confirm(`"${w.title_uz}" o'chirilsinmi?`)) return;
    await fetch(`/api/admin/workshops/${w.id}`, { method: 'DELETE' }).catch(() => {});
    setList((l) => l.filter((x) => x.id !== w.id));
  };

  const toggleActive = async (w: Workshop) => {
    const res = await fetch(`/api/admin/workshops/${w.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...w, is_active: !w.is_active }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.success) setList((l) => l.map((x) => (x.id === w.id ? res.workshop : x)));
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-[#BA4E25]" /> Master-klasslar
          </h1>
          <p className="text-sm text-[#6B5E55] mt-1 max-w-3xl">
            Saytdagi{' '}
            <a href="/experiences" target="_blank" className="text-[#BA4E25] hover:underline">
              &laquo;Master-klasslar&raquo;
            </a>{' '}
            sahifasida ko&apos;rinadi. Mehmon sana, vaqt va kishilar sonini tanlab yoziladi — so&apos;rov{' '}
            <Link href="/admin/services" className="text-[#BA4E25] hover:underline">
              Service Requests
            </Link>{' '}
            ga va Telegram&apos;ga keladi. Nom va tavsifni o&apos;zbekcha yozing, EN/RU avtomatik tarjima qilinadi.
          </p>
        </div>
        <button
          onClick={() => open()}
          className="shrink-0 inline-flex items-center gap-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs px-4 py-2.5 rounded-[3px]"
        >
          <Plus className="w-4 h-4" /> Master-klass qo&apos;shish
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-[#E7E0D8] rounded-[4px] p-10 text-center text-sm text-[#8F8178]">
          Hali master-klass qo&apos;shilmagan. Masalan: &laquo;Rassom bilan 2 soatlik akvarel darsi&raquo;.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((w) => (
            <div key={w.id} className={`bg-white border border-[#E7E0D8] rounded-[4px] overflow-hidden ${w.is_active ? '' : 'opacity-60'}`}>
              {w.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.image} alt="" className="w-full h-36 object-cover" />
              )}
              <div className="p-4 space-y-1.5">
                <div className="font-serif text-lg font-semibold text-[#281C18]">{w.title_uz}</div>
                <div className="text-xs text-[#6B5E55]">
                  ${w.price} / kishi · {w.duration_minutes} daqiqa{w.max_people ? ` · ${w.max_people} kishigacha` : ''}
                </div>
                {w.location && <div className="text-xs text-[#8F8178]">{w.location}</div>}
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => open(w)} className="text-xs font-semibold text-[#BA4E25] hover:underline flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Tahrirlash
                  </button>
                  <button onClick={() => toggleActive(w)} className="text-xs font-semibold text-[#554740] hover:underline flex items-center gap-1">
                    {w.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {w.is_active ? 'Yashirish' : "Ko'rsatish"}
                  </button>
                  <button onClick={() => remove(w)} className="ml-auto text-[#8F7E73] hover:text-[#C62828]" title="O'chirish">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={save} className="bg-[#FDFBF9] rounded-[4px] w-full max-w-2xl p-6 space-y-4 my-8 relative">
            <button type="button" onClick={() => setEditing(null)} className="absolute top-4 right-4 text-[#8F8178] hover:text-[#281C18]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-serif text-2xl font-semibold">{editing === 'new' ? "Yangi master-klass" : 'Tahrirlash'}</h2>

            <div className="grid sm:grid-cols-3 gap-2">
              {(['uz', 'en', 'ru'] as const).map((l) => (
                <div key={l}>
                  <label className={label}>
                    Nomi ({l.toUpperCase()}){l === 'uz' && ' *'}
                    {l === 'uz' && (
                      <TranslateStatus translating={tr.translatingGroup === 'title'} canUndo={tr.canUndo('title')} onUndo={() => tr.undo('title')} />
                    )}
                  </label>
                  <input
                    value={titleFields[l][0]}
                    required={l === 'uz'}
                    {...tr.bind('title', l, titleFields)}
                    onChange={(e) => titleFields[l][1](e.target.value)}
                    className={input}
                  />
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {(['uz', 'en', 'ru'] as const).map((l) => (
                <div key={l}>
                  <label className={label}>
                    Tavsif ({l.toUpperCase()})
                    {l === 'uz' && (
                      <TranslateStatus
                        translating={tr.translatingGroup === 'description'}
                        canUndo={tr.canUndo('description')}
                        onUndo={() => tr.undo('description')}
                      />
                    )}
                  </label>
                  <textarea
                    rows={4}
                    value={descFields[l][0]}
                    {...tr.bind('description', l, descFields)}
                    onChange={(e) => descFields[l][1](e.target.value)}
                    className={`${input} resize-none`}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className={label}>Narx (USD, 1 kishi) *</label>
                <input type="number" min={0} step="1" required value={form.price} onChange={(e) => setField('price')(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Davomiyligi (daqiqa)</label>
                <input type="number" min={15} step="15" value={form.duration_minutes} onChange={(e) => setField('duration_minutes')(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Ko&apos;pi bilan necha kishi</label>
                <input type="number" min={1} value={form.max_people} onChange={(e) => setField('max_people')(e.target.value)} placeholder="cheksiz" className={input} />
              </div>
              <div>
                <label className={label}>Tartib raqami</label>
                <input type="number" value={form.sort} onChange={(e) => setField('sort')(e.target.value)} className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Joyi (manzil)</label>
              <input value={form.location} onChange={(e) => setField('location')(e.target.value)} placeholder="Ichan Qal'a, Xiva" className={input} />
            </div>
            <div>
              <label className={label}>Rasm</label>
              <div className="flex items-center gap-3">
                {form.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="" className="w-24 h-16 object-cover rounded-[3px] border border-[#E7E0D8]" />
                )}
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#E7E0D8] bg-white px-3 py-2 rounded-[3px] cursor-pointer hover:border-[#BA4E25]">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                  {form.image ? 'Almashtirish' : 'Rasm yuklash'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {form.image && (
                  <button type="button" onClick={() => setField('image')('')} className="text-xs text-[#8F7E73] hover:text-[#C62828]">
                    Olib tashlash
                  </button>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Saytda ko&apos;rinsin
            </label>
            {error && <p className="text-sm text-[#B91C1C]">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="text-xs px-4 py-2.5 text-[#726861]">
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-50 text-white font-semibold text-xs px-6 py-2.5 rounded-[3px] flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Saqlash
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
