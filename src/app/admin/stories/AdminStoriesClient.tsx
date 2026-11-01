'use client';

import React, { useRef, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Loader2, ImagePlus, X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { fillMissingTranslations } from '@/lib/useAutoTranslate';
import { storyHtml } from '@/lib/storyMarkdown';
import { detectLang } from '@/lib/detectLang';

interface Story {
  id: string;
  slug: string;
  title_uz: string;
  title_en: string;
  title_ru: string;
  excerpt_uz: string | null;
  excerpt_en: string | null;
  excerpt_ru: string | null;
  body_uz: string;
  body_en: string;
  body_ru: string;
  cover: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const EMPTY = {
  title_uz: '',
  title_en: '',
  title_ru: '',
  excerpt_uz: '',
  excerpt_en: '',
  excerpt_ru: '',
  body_uz: '',
  body_en: '',
  body_ru: '',
  cover: '',
  published: false,
};
type Form = typeof EMPTY;
type L = 'uz' | 'en' | 'ru';
// What the admin types: one title / excerpt / body, in any of the three
// languages; the other two are translated on save.
interface Draft {
  title: string;
  excerpt: string;
  body: string;
}
const LANG_LABEL: Record<L, string> = { uz: "O'zbekcha", en: 'Inglizcha', ru: 'Ruscha' };

const input = 'w-full text-sm px-3 py-2 border border-[#E7E0D8] rounded-[3px] bg-white focus:outline-none focus:border-[#BA4E25]';
const label = 'flex items-center gap-1.5 text-[11px] font-bold text-[#6B5E55] mb-1';

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json().catch(() => null);
  return data?.success && data.url ? data.url : null;
}

// Admin → Hikoyalar: articles for /stories. The admin writes once, in
// Uzbek, English or Russian (detected — src/lib/detectLang.ts — or picked);
// the other two are translated on save, the other site languages by AI after
// saving (src/lib/translateContent.ts).
export default function AdminStoriesClient({ initial }: { initial: Story[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [draft, setDraft] = useState<Draft>({ title: '', excerpt: '', body: '' });
  // The version loaded into the draft (editing), and the language the admin
  // picked by hand (null = detect from the text).
  const [loaded, setLoaded] = useState<L>('uz');
  const [picked, setPicked] = useState<L | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setD = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const versionOf = (f: Form, l: L): Draft => ({ title: f[`title_${l}`], excerpt: f[`excerpt_${l}`], body: f[`body_${l}`] });
  const sameAs = (a: Draft, b: Draft) => a.title === b.title && a.excerpt === b.excerpt && a.body === b.body;
  const detected = detectLang(`${draft.title}\n${draft.excerpt}\n${draft.body}`);
  const lang: L = picked || detected || loaded;

  // Editing: show another language's version (only while nothing is changed).
  const loadVersion = (l: L) => {
    setLoaded(l);
    setPicked(null);
    setDraft(versionOf(form, l));
  };

  const open = (s?: Story) => {
    setError(null);
    setPreview(false);
    setPicked(null);
    setLoaded('uz');
    setDraft(s ? { title: s.title_uz, excerpt: s.excerpt_uz || '', body: s.body_uz } : { title: '', excerpt: '', body: '' });
    setEditing(s ? s.id : 'new');
    setForm(
      s
        ? {
            title_uz: s.title_uz,
            title_en: s.title_en,
            title_ru: s.title_ru,
            excerpt_uz: s.excerpt_uz || '',
            excerpt_en: s.excerpt_en || '',
            excerpt_ru: s.excerpt_ru || '',
            body_uz: s.body_uz,
            body_en: s.body_en,
            body_ru: s.body_ru,
            cover: s.cover || '',
            published: s.published,
          }
        : EMPTY
    );
  };

  const insertImage = async (file: File) => {
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (!url) return setError('Rasm yuklanmadi');
    const el = bodyRef.current;
    const text = draft.body;
    const at = el ? el.selectionStart : text.length;
    const snippet = `\n\n![](${url})\n\n`;
    setD('body')(text.slice(0, at) + snippet + text.slice(at));
  };

  const save = async (publish?: boolean) => {
    setSaving(true);
    setError(null);
    try {
      if (!draft.title.trim() || !draft.body.trim()) {
        setError('Sarlavha va matnni yozing');
        return;
      }
      // Unchanged since loading: keep every language as it is. Changed (or
      // new): the draft is the source, the other two are translated afresh.
      const unchanged = editing !== 'new' && sameAs(draft, versionOf(form, loaded)) && lang === loaded;
      const only = (v: string) => ({ uz: '', en: '', ru: '', [lang]: v }) as Record<L, string>;
      const t = unchanged
        ? { uz: form.title_uz, en: form.title_en, ru: form.title_ru }
        : await fillMissingTranslations(only(draft.title.trim()), lang, 'title');
      const e = unchanged
        ? { uz: form.excerpt_uz, en: form.excerpt_en, ru: form.excerpt_ru }
        : draft.excerpt.trim()
          ? await fillMissingTranslations(only(draft.excerpt.trim()), lang, 'description')
          : { uz: '', en: '', ru: '' };
      const b = unchanged
        ? { uz: form.body_uz, en: form.body_en, ru: form.body_ru }
        : await fillMissingTranslations(only(draft.body), lang, 'description');
      if (!t.uz || !t.en || !t.ru || !b.uz || !b.en || !b.ru) {
        setError("Tarjima qilib bo'lmadi — birozdan keyin qayta saqlab ko'ring.");
        return;
      }
      const body = {
        ...form,
        published: publish ?? form.published,
        title_uz: t.uz,
        title_en: t.en,
        title_ru: t.ru,
        excerpt_uz: e.uz,
        excerpt_en: e.en,
        excerpt_ru: e.ru,
        body_uz: b.uz,
        body_en: b.en,
        body_ru: b.ru,
      };
      const res = await fetch(editing === 'new' ? '/api/admin/stories' : `/api/admin/stories/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) return setError(data.error || 'Saqlanmadi');
      setList((l) => (editing === 'new' ? [data.story, ...l] : l.map((x) => (x.id === editing ? data.story : x))));
      setEditing(null);
    } catch {
      setError("Serverga bog'lanib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Story) => {
    if (!confirm(`"${s.title_uz}" o'chirilsinmi?`)) return;
    await fetch(`/api/admin/stories/${s.id}`, { method: 'DELETE' }).catch(() => {});
    setList((l) => l.filter((x) => x.id !== s.id));
  };


  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#BA4E25]" /> Hikoyalar
          </h1>
          <p className="text-sm text-[#6B5E55] mt-1 max-w-3xl">
            Galereya, rassomlar, hunarmandchilik va shahar haqida maqolalar — Google va ChatGPT qidiruvida topilishga
            yordam beradi. O&apos;zbekcha yozing: inglizcha va ruschasi avtomatik tarjima qilinadi, qolgan 5 til esa
            saqlagandan keyin AI tomonidan.
          </p>
        </div>
        <button
          onClick={() => open()}
          className="shrink-0 inline-flex items-center gap-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs px-4 py-2.5 rounded-[3px]"
        >
          <Plus className="w-4 h-4" /> Yangi hikoya
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-[#E7E0D8] rounded-[4px] p-10 text-center text-sm text-[#8F8178]">
          Hali hikoya yo&apos;q. Masalan: &laquo;Xiva naqshlari nimani anglatadi&raquo; yoki &laquo;Rassom bilan bir kun&raquo;.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <div key={s.id} className="bg-white border border-[#E7E0D8] rounded-[4px] p-4 flex items-center gap-4">
              {s.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.cover} alt="" className="w-24 h-16 object-cover rounded-[3px] shrink-0" />
              ) : (
                <div className="w-24 h-16 bg-[#F0E6DA] rounded-[3px] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-serif text-lg font-semibold text-[#281C18] truncate">{s.title_uz}</div>
                <div className="text-xs text-[#8F8178]">
                  {s.published ? (
                    <span className="text-[#16A34A] font-semibold">Chop etilgan</span>
                  ) : (
                    <span className="text-[#B45309] font-semibold">Qoralama</span>
                  )}
                  {s.published_at && ` · ${new Date(s.published_at).toLocaleDateString('uz-UZ')}`}
                </div>
              </div>
              {s.published && (
                <a href={`/uz/stories/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-[#8F7E73] hover:text-[#BA4E25]" title="Saytda ko'rish">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={() => open(s)} className="text-xs font-semibold text-[#BA4E25] hover:underline flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> Tahrirlash
              </button>
              <button onClick={() => remove(s)} className="text-[#8F7E73] hover:text-[#C62828]" title="O'chirish">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#FDFBF9] rounded-[4px] w-full max-w-4xl p-6 space-y-4 my-6 relative">
            <button type="button" onClick={() => setEditing(null)} className="absolute top-4 right-4 text-[#8F8178] hover:text-[#281C18]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-serif text-2xl font-semibold">{editing === 'new' ? 'Yangi hikoya' : 'Tahrirlash'}</h2>

            {/* One set of fields, in any language — the rest is translated on save. */}
            <div className="flex flex-wrap items-center gap-2 text-xs bg-[#FAF4EC] border border-[#E7E0D8] rounded-[3px] px-3 py-2">
              <span className="text-[#554740]">
                O&apos;zbek, ingliz yoki rus tilida yozing — qolgan tillarga saqlashda o&apos;zi tarjima qilinadi.
              </span>
              <span className="ml-auto flex items-center gap-1">
                <span className="text-[#6B5E55]">Til:</span>
                {(['uz', 'en', 'ru'] as L[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => (editing !== 'new' && sameAs(draft, versionOf(form, loaded)) ? loadVersion(l) : setPicked(l))}
                    title={editing !== 'new' ? "Shu tildagi variantni ochish" : "Tilni qo'lda tanlash"}
                    className={`px-2 py-0.5 rounded-full border font-semibold ${
                      lang === l ? 'bg-[#281C18] text-white border-[#281C18]' : 'bg-white text-[#554740] border-[#E7E0D8]'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
                <span className="text-[11px] text-[#756962] ml-1">
                  {picked ? "(qo'lda)" : detected ? `(${LANG_LABEL[detected]} — aniqlandi)` : ''}
                </span>
              </span>
            </div>

            <div>
              <label className={label}>Sarlavha *</label>
              <input value={draft.title} onChange={(e) => setD('title')(e.target.value)} className={`${input} font-serif text-lg`} />
            </div>
            <div>
              <label className={label}>Qisqa tavsif (ro&apos;yxatda va Google&apos;da ko&apos;rinadi)</label>
              <textarea rows={2} value={draft.excerpt} onChange={(e) => setD('excerpt')(e.target.value)} className={`${input} resize-none`} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={label}>Matn *</label>
                <div className="flex items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-1 font-semibold text-[#554740] cursor-pointer hover:text-[#BA4E25]">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    Rasm qo&apos;shish
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && insertImage(e.target.files[0])} />
                  </label>
                  <button type="button" onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1 font-semibold text-[#554740] hover:text-[#BA4E25]">
                    {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {preview ? 'Tahrirlash' : "Ko'rib chiqish"}
                  </button>
                </div>
              </div>
              {preview ? (
                <div className="story-body bg-white border border-[#E7E0D8] rounded-[3px] p-4 min-h-[280px]" dangerouslySetInnerHTML={{ __html: storyHtml(draft.body) }} />
              ) : (
                <textarea
                  ref={bodyRef}
                  rows={14}
                  value={draft.body}
                  onChange={(e) => setD('body')(e.target.value)}
                  className={`${input} font-mono text-[13px] leading-relaxed`}
                />
              )}
              <p className="text-[11px] text-[#8F8178] mt-1">
                Oddiy matn yozing. Bo&apos;sh qator — yangi xatboshi. <code>## Sarlavha</code>, <code>- ro&apos;yxat</code>,{' '}
                <code>**qalin**</code>, <code>[havola matni](https://...)</code>.
              </p>
            </div>
            <div>
              <label className={label}>Muqova rasmi</label>
              <div className="flex items-center gap-3">
                {form.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.cover} alt="" className="w-28 h-18 object-cover rounded-[3px] border border-[#E7E0D8]" />
                )}
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#E7E0D8] bg-white px-3 py-2 rounded-[3px] cursor-pointer hover:border-[#BA4E25]">
                  <ImagePlus className="w-3.5 h-3.5" /> {form.cover ? 'Almashtirish' : 'Yuklash'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      const url = await uploadImage(f);
                      setUploading(false);
                      if (url) set('cover')(url);
                      else setError('Rasm yuklanmadi');
                    }}
                  />
                </label>
              </div>
            </div>
            {error && <p className="text-sm text-[#B91C1C]">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="text-xs px-4 py-2.5 text-[#726861]">
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => save(false)}
                disabled={saving || uploading}
                className="border border-[#E7E0D8] bg-white text-[#281C18] font-semibold text-xs px-5 py-2.5 rounded-[3px] disabled:opacity-50"
              >
                Qoralama sifatida saqlash
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                disabled={saving || uploading}
                className="bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-50 text-white font-semibold text-xs px-6 py-2.5 rounded-[3px] flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {saving ? 'Tarjima qilinmoqda…' : 'Chop etish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
