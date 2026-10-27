'use client';

import React, { useEffect, useState } from 'react';
import { Languages, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Admin → Settings: the site also speaks German, French, Korean, Japanese
// and Chinese. Catalogue texts (works, artists, categories, masterclasses)
// are translated by AI right after each save and by the daily cron; this
// card shows what is left and translates the next batch now.
export default function TranslationsCard() {
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch('/api/admin/translations')
      .then((r) => r.json())
      .then((d) => d.success && setPending(d.pending))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/admin/translations', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        setPending(d.remaining);
        setNote({ ok: true, text: `${d.done} ta tarjima qilindi.${d.remaining ? ` Yana ${d.remaining} ta qoldi — tugmani yana bosing.` : ' Hammasi tayyor.'}` });
      } else {
        setNote({ ok: false, text: d.error || "Tarjima bo'lmadi (AI limiti tugagan bo'lishi mumkin — ertaga o'zi davom etadi)." });
      }
    } catch {
      setNote({ ok: false, text: "Serverga bog'lanib bo'lmadi" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-[#429599]" />
        <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase">Saytning boshqa tillari</h3>
      </div>
      <p className="text-xs text-[#726861]">
        Sayt inglizcha, ruscha va o&apos;zbekchadan tashqari <b>nemis, fransuz, koreys, yapon va xitoy</b> tillarida ham
        ochiladi. Asarlar, rassomlar, kategoriyalar va master-klasslar matnini AI har saqlashdan keyin o&apos;zi tarjima
        qiladi (inglizcha matndan); qolganlarini har kuni tunda davom ettiradi. Siz hech narsa yozmaysiz.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[#281C18]">
          {pending === null ? <Loader2 className="w-4 h-4 animate-spin inline" /> : pending === 0 ? (
            <span className="text-[#16A34A] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Hammasi tarjima qilingan
            </span>
          ) : (
            <>Tarjima kutayotganlar: <b>{pending}</b></>
          )}
        </span>
        {!!pending && (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex items-center gap-1.5 bg-[#429599] hover:bg-[#357A7E] text-white text-xs font-semibold px-3.5 py-2 rounded-[3px] disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
            Hozir tarjima qilish
          </button>
        )}
      </div>
      {note && (
        <p className={`text-xs flex items-start gap-1.5 ${note.ok ? 'text-[#16A34A]' : 'text-[#B91C1C]'}`}>
          {note.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5" />}
          {note.text}
        </p>
      )}
    </div>
  );
}
