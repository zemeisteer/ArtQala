'use client';

import React, { useEffect, useState } from 'react';
import { Send, Loader2, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface TelegramStatus {
  configured: boolean;
  tokenValid: boolean;
  botUsername: string | null;
  chats: { chat_id: string; title: string }[];
}

// Admin → Settings → Telegram: new inquiries / service requests / customer
// messages / contact-form messages are also sent to these Telegram chats.
// Lives outside the main settings <form> — every action saves at once.
export default function TelegramSettingsCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState<'link' | 'test' | string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/telegram')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) setStatus(data);
      })
      .catch(() => {
        // the card just stays in its loading state
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const post = async (action: 'link' | 'test') => {
    setBusy(action);
    setNote(null);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === 'link') {
        if (data.success) {
          setStatus((s) => (s ? { ...s, chats: data.chats } : s));
          setNote(
            data.found > 0
              ? { ok: true, text: `${data.found} ta chat ulandi.` }
              : { ok: false, text: "Hech kim topilmadi. Botga Telegram'da /start yoki istalgan xabar yozing, keyin qayta bosing." }
          );
        } else setNote({ ok: false, text: data.error || 'Xatolik yuz berdi' });
      } else {
        setNote(
          data.success
            ? { ok: true, text: `Sinov xabari yuborildi (${data.sent} ta chat).` }
            : { ok: false, text: data.error || "Xabar yuborilmadi. Avval chatni ulang." }
        );
      }
    } catch {
      setNote({ ok: false, text: "Serverga bog'lanishda xatolik yuz berdi" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (chatId: string) => {
    setBusy(chatId);
    await fetch(`/api/admin/telegram?chat_id=${encodeURIComponent(chatId)}`, { method: 'DELETE' }).catch(() => {});
    setStatus((s) => (s ? { ...s, chats: s.chats.filter((c) => c.chat_id !== chatId) } : s));
    setBusy(null);
  };

  return (
    <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-[#229ED9]" />
        <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase">Telegram xabarnomalari</h3>
      </div>
      <p className="text-xs text-[#726861]">
        Yangi so&apos;rovlar, xizmat so&apos;rovlari, mijozlarning xabarlari va aloqa formasi Telegram&apos;ga ham keladi.
      </p>

      {!status ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#8F8178]" />
      ) : !status.configured || !status.tokenValid ? (
        <div className="text-xs text-[#554740] bg-[#FFFBEB] border border-[#FDE68A] rounded-[3px] p-3 space-y-1.5">
          <p className="font-semibold text-[#B45309]">
            {status.configured ? "Bot token noto'g'ri — Telegram uni qabul qilmadi." : 'Bot hali ulanmagan.'}
          </p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Telegram&apos;da @BotFather&apos;ga yozing → /newbot → botga nom bering. U bergan token&apos;ni nusxalang.</li>
            <li>Vercel → loyiha → Settings → Environment Variables: <b>TELEGRAM_BOT_TOKEN</b> = token. Saqlang va qayta deploy qiling.</li>
            <li>Shu sahifaga qayting — keyingi qadam shu yerda chiqadi.</li>
          </ol>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#554740]">
            Bot:{' '}
            <a
              href={`https://t.me/${status.botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#229ED9] hover:underline"
            >
              @{status.botUsername}
            </a>
            . Xabar olishi kerak bo&apos;lgan har bir kishi botni ochib <b>/start</b> bossin (yoki botni guruhga qo&apos;shing),
            keyin &quot;Ulash&quot; tugmasini bosing.
          </p>

          {status.chats.length > 0 ? (
            <ul className="space-y-1.5">
              {status.chats.map((c) => (
                <li
                  key={c.chat_id}
                  className="flex items-center justify-between text-xs bg-white border border-[#E7E0D8] rounded-[3px] px-3 py-2"
                >
                  <span className="flex items-center gap-1.5 text-[#281C18]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    {c.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(c.chat_id)}
                    disabled={busy === c.chat_id}
                    title="Uzish"
                    className="text-[#8F7E73] hover:text-[#C62828] disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#B45309]">Hali hech qanday chat ulanmagan.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => post('link')}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 bg-[#229ED9] hover:bg-[#1b8bc0] text-white text-xs font-semibold px-3.5 py-2 rounded-[3px] disabled:opacity-50"
            >
              {busy === 'link' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Ulash (botga yozganlarni topish)
            </button>
            <button
              type="button"
              onClick={() => post('test')}
              disabled={!!busy || status.chats.length === 0}
              className="inline-flex items-center gap-1.5 border border-[#E7E0D8] bg-white text-[#281C18] text-xs font-semibold px-3.5 py-2 rounded-[3px] hover:border-[#229ED9] disabled:opacity-50"
            >
              {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Sinov xabari yuborish
            </button>
          </div>
        </div>
      )}

      {note && (
        <p className={`text-xs flex items-start gap-1.5 ${note.ok ? 'text-[#16A34A]' : 'text-[#B91C1C]'}`}>
          {note.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5" />}
          {note.text}
        </p>
      )}
    </div>
  );
}
