'use client';

import React, { useState } from 'react';
import { Gift, CheckCircle2, Mail, ExternalLink, XCircle, Ticket, Loader2 } from 'lucide-react';

interface GiftRow {
  id: string;
  code: string;
  amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  recipient_name: string;
  recipient_email: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  paid_at: string | null;
  redeemed_at: string | null;
  url: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: "Yangi — to'lov kutilmoqda", cls: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' },
  PAID: { label: "To'langan — amal qiladi", cls: 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]' },
  REDEEMED: { label: 'Ishlatilgan', cls: 'bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]' },
  CANCELLED: { label: 'Bekor qilingan', cls: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]' },
};
const FILTERS = ['ALL', 'NEW', 'PAID', 'REDEEMED', 'CANCELLED'] as const;
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Admin → Sovg'a sertifikatlari: requests from /gift-card. "To'landi" emails
// the certificate; "Ishlatildi" once it's spent on a purchase.
export default function GiftCardsClient({ initial, openId }: { initial: GiftRow[]; openId: string | null }) {
  const [gifts, setGifts] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = async (g: GiftRow, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(g.id);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/gift-cards/${g.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.gift) {
        setGifts((list) =>
          list.map((x) =>
            x.id === g.id
              ? {
                  ...x,
                  status: data.gift.status,
                  admin_notes: data.gift.admin_notes,
                  paid_at: data.gift.paid_at,
                  redeemed_at: data.gift.redeemed_at,
                }
              : x
          )
        );
      }
      setNote(
        data.success
          ? { ok: true, text: data.emailed ? `Saqlandi. Sertifikat ${data.emailed} ga yuborildi.` : 'Saqlandi.' }
          : { ok: false, text: data.error || 'Xatolik' }
      );
    } catch {
      setNote({ ok: false, text: "Serverga bog'lanib bo'lmadi" });
    } finally {
      setBusy(null);
    }
  };

  const shown = gifts.filter((g) => filter === 'ALL' || g.status === filter);
  const paidTotal = gifts.filter((g) => g.status === 'PAID').reduce((s, g) => s + g.amount, 0);

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold flex items-center gap-2">
          <Gift className="w-7 h-7 text-[#BA4E25]" /> Sovg&apos;a sertifikatlari
        </h1>
        <p className="text-sm text-[#6B5E55] mt-1 max-w-3xl">
          Saytdagi &laquo;Sovg&apos;a sertifikati&raquo; sahifasidan kelgan so&apos;rovlar. Xaridor bilan to&apos;lovni
          kelishing, keyin <b>To&apos;landi</b> ni bosing — sertifikat (kod va chop etiladigan sahifa) emailga o&apos;zi
          yuboriladi. Mijoz kodni ishlatganda <b>Ishlatildi</b> ni bosing.
        </p>
        {paidTotal > 0 && (
          <p className="text-xs text-[#554740] mt-2">
            Amaldagi (to&apos;langan, hali ishlatilmagan) sertifikatlar: <b>{usd(paidTotal)}</b>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              filter === f ? 'bg-[#281C18] text-white border-[#281C18]' : 'bg-white text-[#554740] border-[#E7E0D8]'
            }`}
          >
            {f === 'ALL' ? 'Hammasi' : STATUS[f].label.split(' — ')[0]} (
            {f === 'ALL' ? gifts.length : gifts.filter((g) => g.status === f).length})
          </button>
        ))}
      </div>

      {note && (
        <p className={`text-sm ${note.ok ? 'text-[#16A34A]' : 'text-[#B91C1C]'}`}>{note.text}</p>
      )}

      {shown.length === 0 ? (
        <div className="bg-white border border-[#E7E0D8] rounded-[4px] p-10 text-center text-sm text-[#8F8178]">
          Hozircha so&apos;rov yo&apos;q.
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((g) => {
            const st = STATUS[g.status] || STATUS.NEW;
            const isBusy = busy === g.id;
            return (
              <div
                key={g.id}
                className={`bg-white border rounded-[4px] p-5 space-y-3 ${openId === g.id ? 'border-[#BA4E25]' : 'border-[#E7E0D8]'}`}
              >
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-2xl font-bold text-[#BA4E25]">{usd(g.amount)}</span>
                    <span className="font-mono text-sm text-[#281C18]">{g.code}</span>
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                  </div>
                  <span className="text-[11px] text-[#9E9086]">
                    So&apos;ralgan: {date(g.created_at)}
                    {g.paid_at && ` · To'langan: ${date(g.paid_at)}`}
                    {g.redeemed_at && ` · Ishlatilgan: ${date(g.redeemed_at)}`}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#554740]">
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#8F8178]">Xaridor</div>
                    <div className="text-sm text-[#281C18]">{g.buyer_name}</div>
                    <div>
                      <a href={`mailto:${g.buyer_email}`} className="text-[#BA4E25] hover:underline">{g.buyer_email}</a>
                      {g.buyer_phone && <> · <a href={`tel:${g.buyer_phone}`} className="hover:underline">{g.buyer_phone}</a></>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#8F8178]">Kim uchun</div>
                    <div className="text-sm text-[#281C18]">{g.recipient_name}</div>
                    <div>{g.recipient_email ? `Sertifikat shu emailga boradi: ${g.recipient_email}` : 'Sertifikat xaridorning emailiga boradi'}</div>
                  </div>
                </div>
                {g.message && <p className="text-sm italic text-[#4D3F38] bg-[#FAF4EC] p-3 rounded-[3px]">&ldquo;{g.message}&rdquo;</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {g.status === 'NEW' && (
                    <button
                      onClick={() => patch(g, { status: 'PAID' }, `${usd(g.amount)} to'landimi? Sertifikat emailga yuboriladi.`)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold px-3.5 py-2 rounded-[3px] disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      To&apos;landi — sertifikatni yuborish
                    </button>
                  )}
                  {g.status === 'PAID' && (
                    <>
                      <button
                        onClick={() => patch(g, { status: 'REDEEMED' }, `${g.code} ishlatildimi?`)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-semibold px-3.5 py-2 rounded-[3px] disabled:opacity-50"
                      >
                        <Ticket className="w-3.5 h-3.5" /> Ishlatildi
                      </button>
                      <button
                        onClick={() => patch(g, { resend: true })}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 border border-[#E7E0D8] bg-white text-[#281C18] text-xs font-semibold px-3.5 py-2 rounded-[3px] disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" /> Emailni qayta yuborish
                      </button>
                    </>
                  )}
                  {(g.status === 'PAID' || g.status === 'REDEEMED') && (
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BA4E25] hover:underline px-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Sertifikatni ochish / chop etish
                    </a>
                  )}
                  {g.status === 'NEW' && (
                    <button
                      onClick={() => patch(g, { status: 'CANCELLED' }, "So'rov bekor qilinsinmi?")}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8F7E73] hover:text-[#B91C1C] px-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Bekor qilish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
