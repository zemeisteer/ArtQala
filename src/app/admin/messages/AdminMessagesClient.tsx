'use client';

import React, { useState } from 'react';
import { Mail, Trash2, CheckCircle2, Clock, Send, Eye, EyeOff, Loader2 } from 'lucide-react';
import FilterSelect from '@/components/FilterSelect';

interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  status: string;
  admin_reply: string | null;
  created_at: Date | string;
}

export default function AdminMessagesClient({
  initialMessages,
  initialSelectedId,
}: {
  initialMessages: ContactMessageItem[];
  initialSelectedId?: string;
}) {
  const [messages, setMessages] = useState<ContactMessageItem[]>(initialMessages);
  // Open the message a link pointed at (?open=), else the newest.
  const [selectedId, setSelectedId] = useState<string | null>(
    (initialMessages.find((m) => m.id === initialSelectedId) || initialMessages[0])?.id || null
  );
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentJustNow, setSentJustNow] = useState(false);

  const selected = messages.find((m) => m.id === selectedId);

  const handleSelect = (m: ContactMessageItem) => {
    setSelectedId(m.id);
    setReplyText('');
    setSentJustNow(false);
    if (!m.is_read) handleToggleRead(m.id, false);
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: !currentRead }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_read: !currentRead } : m))
        );
      }
    } catch {
      alert('Xatolik yuz berdi.');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      }
    } catch {
      alert('Xatolik yuz berdi.');
    }
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/contact/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_reply: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === selected.id
              ? { ...m, admin_reply: replyText.trim(), status: 'ANSWERED', is_read: true }
              : m
          )
        );
        setReplyText('');
        setSentJustNow(true);
        if (!data.emailSent) {
          alert("Javob saqlandi, lekin mijozga email yuborishda xatolik yuz berdi. Emailni qo'lda yuborishingiz kerak bo'lishi mumkin.");
        }
      } else {
        alert(data.error || 'Javobni yuborishda xatolik yuz berdi');
      }
    } catch {
      alert("Serverga bog'lanishda xatolik yuz berdi");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ushbu xabarni o\'chirishni tasdiqlaysizmi?')) return;
    try {
      const res = await fetch(`/api/contact/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedId === id) {
          const remaining = messages.filter((m) => m.id !== id);
          setSelectedId(remaining[0]?.id || null);
        }
      }
    } catch {
      alert('Xatolik yuz berdi.');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ANSWERED':
        return (
          <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full">
            Javob berilgan
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-[#F3E8FF] text-[#9333EA] text-[10px] font-bold px-2 py-0.5 rounded-full">
            Yakunlangan
          </span>
        );
      default:
        return (
          <span className="bg-[#E0F2FE] text-[#0284C7] text-[10px] font-bold px-2 py-0.5 rounded-full">
            Yangi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
            Kontakt Xabarlari
          </h2>
          <p className="text-xs text-[#726861] mt-0.5">
            Mijozlar tomonidan /contact sahifasidan yuborilgan murojaat va xabarlar
          </p>
        </div>

        <div className="text-xs text-[#8F7E73] bg-white border border-[#E7E0D8] px-3 py-1.5 rounded-[3px]">
          Jami xabarlar: <strong className="text-[#281C18]">{messages.length}</strong>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-12 text-center space-y-2">
          <Mail className="w-8 h-8 text-[#BA4E25]/50 mx-auto" />
          <h3 className="font-serif text-lg font-semibold text-[#281C18]">
            Hozircha xabarlar yo'q
          </h3>
          <p className="text-xs text-[#726861]">
            Kontakt sahifasidan yangi xabar yuborilganda shu yerda paydo bo'ladi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Messages List */}
          <div className="lg:col-span-5 space-y-3">
            {messages.map((m) => {
              const isCurrent = m.id === selectedId;
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className={`p-4 rounded-[4px] border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#FAF4EC] border-[#BA4E25] shadow-xs'
                      : 'bg-[#FDFBF9] border-[#E7E0D8] hover:border-[#BA4E25]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${!m.is_read ? 'text-[#BA4E25]' : 'text-[#281C18]'}`}>
                      {m.name}
                    </span>
                    {statusBadge(m.status)}
                  </div>

                  <p className="text-xs font-medium text-[#554740] truncate">
                    {m.subject || 'Mavzusiz xabar'}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0EAE1] text-[10.5px] text-[#8F8178]">
                    <span>{m.email}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(m.created_at).toLocaleDateString('uz-UZ', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Message Detail Pane */}
          <div className="lg:col-span-7 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-5 shadow-xs">
            {selected ? (
              <>
                <div className="flex items-start justify-between border-b pb-4 border-[#E7E0D8] gap-3 flex-wrap">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#281C18]">
                      {selected.name}
                    </h3>
                    <p className="text-xs text-[#726861] mt-0.5">
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-[#BA4E25] hover:underline font-medium"
                      >
                        {selected.email}
                      </a>{' '}
                      ·{' '}
                      {new Date(selected.created_at).toLocaleString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <FilterSelect
                      value={selected.status}
                      onChange={(v) => handleStatusChange(selected.id, v)}
                      className="w-40"
                      buttonClassName="!rounded-[3px] !py-1.5"
                      options={[
                        { value: 'NEW', label: 'Yangi' },
                        { value: 'ANSWERED', label: 'Javob berilgan' },
                        { value: 'COMPLETED', label: 'Yakunlangan' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleRead(selected.id, selected.is_read)}
                      className="p-1.5 text-[#726861] hover:text-[#281C18] border border-[#E7E0D8] bg-white rounded cursor-pointer transition-colors"
                      title={selected.is_read ? "O'qilmagan qilish" : "O'qilgan qilish"}
                    >
                      {selected.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selected.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded cursor-pointer transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    MAVZU
                  </label>
                  <div className="text-sm font-semibold text-[#281C18] bg-white p-3 rounded border border-[#E7E0D8]">
                    {selected.subject || 'Mavzusiz'}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    XABAR MATNI
                  </label>
                  <div className="bg-white border border-[#E7E0D8] rounded-[4px] p-4 text-sm text-[#281C18] leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>

                {selected.admin_reply && (
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#429599] uppercase mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>YUBORILGAN JAVOB</span>
                    </label>
                    <div className="bg-[#281C18] text-[#FAF4EC] rounded-[4px] p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {selected.admin_reply}
                    </div>
                  </div>
                )}

                {/* Reply Input — sends via Resend instead of a mailto: link,
                    which only worked if the admin's own device happened to
                    have a default mail client configured. */}
                <div className="pt-2 border-t border-[#F0EAE1] space-y-3">
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                    {selected.admin_reply ? 'YANA JAVOB YOZISH' : 'MIJOZGA JAVOB YOZISH'}
                  </label>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Mijozga javobingizni yozing... Yuborilganda unga email orqali yetkaziladi."
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] resize-none"
                  />

                  {sentJustNow && (
                    <div className="p-3 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[3px] text-xs text-[#1B5E20] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                      <span>Javob mijozga email orqali yuborildi!</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {sending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{sending ? 'Yuborilmoqda...' : 'Javobni yuborish'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#8F7E73]">Ko'rish uchun chapdagi xabarlardan birini tanlang.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
