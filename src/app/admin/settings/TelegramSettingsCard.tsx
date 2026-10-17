'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Trash2, Link2, CheckCircle2, AlertCircle, BarChart3, ShieldCheck } from 'lucide-react';

interface TelegramStatus {
  configured: boolean;
  tokenValid: boolean;
  botUsername: string | null;
  webhookActive: boolean;
  webhookError: string | null;
  chats: { chat_id: string; title: string }[];
}

// Admin → Settings → Telegram. New inquiries / service requests / customer
// messages / contact-form messages are also sent to the linked chats, where
// the curator can reply to the customer and change the status.
//
// Linking is secure: "Telegram'ni ulash" makes a signed link valid for 15
// minutes; only whoever opens the bot through it is linked. Lives outside
// the main settings <form> — every action saves at once.
export default function TelegramSettingsCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = () =>
    fetch('/api/admin/telegram')
      .then((res) => res.json())
      .then((data) => (data.success ? (data as TelegramStatus) : null))
      .catch(() => null);

  useEffect(() => {
    let cancelled = false;
    fetchStatus().then((s) => {
      if (!cancelled && s) setStatus(s);
    });
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // After a link is opened, watch for the new chat to appear (3 minutes).
  const watchForNewChat = (before: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let rounds = 0;
    pollRef.current = setInterval(async () => {
      rounds++;
      const s = await fetchStatus();
      if (s) setStatus(s);
      if ((s && s.chats.length > before) || rounds > 60) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (s && s.chats.length > before) {
          setLinkUrl(null);
          setNote({ ok: true, text: 'Ulandi! Bot sizga Telegram\'da "Ulandingiz" deb yozdi.' });
        }
      }
    }, 3000);
  };

  const createLink = async () => {
    setBusy('link');
    setNote(null);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link' }),
      });
      const data = await res.json();
      if (!data.success) {
        setNote({ ok: false, text: data.error || 'Xatolik yuz berdi' });
        return;
      }
      setLinkUrl(data.url);
      window.open(data.url, '_blank', 'noopener,noreferrer');
      watchForNewChat(status?.chats.length ?? 0);
    } catch {
      setNote({ ok: false, text: "Serverga bog'lanishda xatolik yuz berdi" });
    } finally {
      setBusy(null);
    }
  };

  const post = async (action: 'test' | 'report') => {
    setBusy(action);
    setNote(null);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setNote(
        data.success
          ? { ok: true, text: `${action === 'test' ? 'Sinov xabari' : 'Hisobot'} yuborildi (${data.sent} ta chat).` }
          : { ok: false, text: data.error || 'Yuborilmadi. Avval chatni ulang.' }
      );
    } catch {
      setNote({ ok: false, text: "Serverga bog'lanishda xatolik yuz berdi" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (chatId: string, title: string) => {
    if (!confirm(`"${title}" — bu chatga xabar yuborish to'xtatilsinmi?`)) return;
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
        Yangi so&apos;rovlar, xizmat so&apos;rovlari, mijozlarning xabarlari va aloqa formasi Telegram&apos;ga keladi. U yerda
        xabarga <b>Reply</b> qilib mijozga javob yozish, tugmalar bilan holatni o&apos;zgartirish mumkin. Har dushanba haftalik
        hisobot keladi.
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
            <li>
              Vercel → loyiha → Settings → Environment Variables: <b>TELEGRAM_BOT_TOKEN</b> = token (faqat Production).
              Saqlang va qayta deploy qiling.
            </li>
            <li>Shu sahifaga qayting — keyingi qadam shu yerda chiqadi.</li>
          </ol>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#554740] flex items-start gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>
              Bot:{' '}
              <a
                href={`https://t.me/${status.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#229ED9] hover:underline"
              >
                @{status.botUsername}
              </a>
              . Faqat quyidagi tugma bergan <b>maxsus havola</b> orqali kirgan odam ulanadi (havola 15 daqiqa amal qiladi, uni faqat ulanadigan odamga bering).
              Botga begona yozsa — ulanmaydi.
            </span>
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
                    onClick={() => remove(c.chat_id, c.title)}
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
          {status.chats.length > 0 && (
            <p className="text-[10.5px] text-[#8F8178]">Ro&apos;yxatda notanish odam bo&apos;lsa, 🗑 bilan uzing.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={createLink}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 bg-[#229ED9] hover:bg-[#1b8bc0] text-white text-xs font-semibold px-3.5 py-2 rounded-[3px] disabled:opacity-50"
            >
              {busy === 'link' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Telegram&apos;ni ulash
            </button>
            <button
              type="button"
              onClick={() => post('test')}
              disabled={!!busy || status.chats.length === 0}
              className="inline-flex items-center gap-1.5 border border-[#E7E0D8] bg-white text-[#281C18] text-xs font-semibold px-3.5 py-2 rounded-[3px] hover:border-[#229ED9] disabled:opacity-50"
            >
              {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Sinov xabari
            </button>
            <button
              type="button"
              onClick={() => post('report')}
              disabled={!!busy || status.chats.length === 0}
              className="inline-flex items-center gap-1.5 border border-[#E7E0D8] bg-white text-[#281C18] text-xs font-semibold px-3.5 py-2 rounded-[3px] hover:border-[#229ED9] disabled:opacity-50"
            >
              {busy === 'report' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
              Haftalik hisobotni hozir yuborish
            </button>
          </div>

          {linkUrl && (
            <div className="text-xs bg-[#EFF8FD] border border-[#B9E0F3] rounded-[3px] p-3 space-y-1">
              <p>
                Telegram ochildi — u yerda <b>Start</b> tugmasini bosing. Ochilmagan bo&apos;lsa, shu havolani ulanadigan
                odamga yuboring (15 daqiqa amal qiladi):
              </p>
              <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[#229ED9] font-semibold">
                {linkUrl}
              </a>
            </div>
          )}

          {!status.webhookActive && status.chats.length > 0 && (
            <p className="text-[11px] text-[#B45309]">
              Javob berish va tugmalar hali yoqilmagan — &quot;Telegram&apos;ni ulash&quot;ni bir marta bosing (yangi havola
              yaratilganda yoqiladi).
            </p>
          )}
          {status.webhookError && (
            <p className="text-[11px] text-[#B91C1C]">Telegram oxirgi xato: {status.webhookError}</p>
          )}
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
