'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, Shield, User, Clock, Loader2, Mail, Gem, DollarSign, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import FilterSelect from '@/components/FilterSelect';

interface AdminInquiriesClientProps {
  initialInquiries: any[];
}

export default function AdminInquiriesClient({ initialInquiries }: AdminInquiriesClientProps) {
  const { t, formatPrice } = useApp();
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [selectedId, setSelectedId] = useState(initialInquiries[0]?.id || null);

  // Permanently delete the selected thread (spam, test submissions) —
  // after confirming, then select the next one in the list.
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" — bu so\'rovni butunlay o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "O'chirishda xatolik yuz berdi");
        return;
      }
      const remaining = inquiries.filter((x: any) => x.id !== id);
      setInquiries(remaining);
      setSelectedId(remaining[0]?.id || null);
    } catch {
      alert("Serverga bog'lanishda xatolik yuz berdi");
    } finally {
      setDeleting(false);
    }
  };
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [finalPrice, setFinalPrice] = useState<string>(
    initialInquiries[0]?.final_price != null ? String(initialInquiries[0].final_price) : ''
  );
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingSold, setSavingSold] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Bumped on every successful mutation so an in-flight poll started before
  // it (and therefore reflecting pre-mutation data) gets discarded instead
  // of clobbering the fresher local state — this was causing the status
  // shown in the list to occasionally revert right after answering.
  const pollGuardRef = useRef(0);

  const selected = inquiries.find((i) => i.id === selectedId);
  // The status dropdown is derived directly from `inquiries` (no separate
  // state) so it can never drift out of sync with the list's own badge.
  const selectedStatus = selected?.status || 'NEW';

  const selectedAccessories: { id: string; name_en: string; name_ru: string; name_uz: string; price: number }[] =
    (() => {
      if (!selected?.selected_accessories) return [];
      try {
        return JSON.parse(selected.selected_accessories);
      } catch {
        return [];
      }
    })();
  const accessoriesTotal = selectedAccessories.reduce((sum, a) => sum + a.price, 0);

  const getPaintingThumb = (painting: any): string | null => {
    if (!painting?.images) return null;
    try {
      const parsed = JSON.parse(painting.images);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  // Auto scroll messages to bottom — scrolls only the message thread itself,
  // never the page (scrollIntoView would also drag the whole admin page down).
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedId, selected?.messages]);

  // Poll for new inquiries/messages (e.g. a customer's own reply) so they
  // show up here without the admin having to manually reload the page.
  useEffect(() => {
    const interval = setInterval(async () => {
      const versionAtStart = pollGuardRef.current;
      try {
        const res = await fetch('/api/admin/inquiries');
        const data = await res.json();
        if (data.success && pollGuardRef.current === versionAtStart) {
          setInquiries(data.inquiries);
        }
      } catch (err) {
        console.error('Failed to refresh inquiries:', err);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const handleSelect = async (inq: any) => {
    setSelectedId(inq.id);
    setReplyText('');
    setSuccess(false);
    setFinalPrice(inq.final_price != null ? String(inq.final_price) : '');

    // Mark customer messages as read by admin
    const hasUnreadCustomer = (inq.messages || []).some(
      (m: any) => m.sender === 'CUSTOMER' && !m.is_read
    );

    if (hasUnreadCustomer) {
      try {
        await fetch(`/api/inquiries/${inq.id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewer: 'ADMIN' }),
        });

        pollGuardRef.current++;
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === inq.id
              ? {
                  ...item,
                  messages: (item.messages || []).map((m: any) =>
                    m.sender === 'CUSTOMER' ? { ...m, is_read: true } : m
                  ),
                }
              : item
          )
        );
      } catch (err) {
        console.error('Error marking read:', err);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim() || saving) return;
    setSaving(true);
    const targetStatus = selectedStatus === 'NEW' || selectedStatus === 'IN_PROGRESS'
      ? 'ANSWERED'
      : selectedStatus;

    try {
      const res = await fetch(`/api/inquiries/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'ADMIN',
          message: replyText.trim(),
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        pollGuardRef.current++;
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  status: targetStatus,
                  messages: [...(item.messages || []), data.message],
                  admin_reply: replyText.trim(),
                }
              : item
          )
        );
        setReplyText('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        alert(data.error || 'Javobni saqlashda xatolik yuz berdi');
      }
    } catch {
      alert('Serverga bog\'lanishda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinalPrice = async () => {
    if (!selected) return;
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_price: finalPrice === '' ? null : finalPrice }),
      });
      const data = await res.json();
      if (data.success) {
        pollGuardRef.current++;
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === selected.id ? { ...item, final_price: data.inquiry.final_price } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to save final price:', err);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleToggleSold = async (nextIsSold: boolean) => {
    if (!selected?.painting?.id) return;
    setSavingSold(true);
    try {
      const res = await fetch(`/api/admin/paintings/${selected.painting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_sold: nextIsSold }),
      });
      const data = await res.json();
      if (data.success) {
        pollGuardRef.current++;
        // Other inquiries pointing at the same painting show the same badge.
        setInquiries((prev) =>
          prev.map((item) =>
            item.painting?.id === selected.painting.id
              ? { ...item, painting: { ...item.painting, is_sold: nextIsSold } }
              : item
          )
        );

        // Marking the painting sold means this specific deal is done —
        // reflect that on the inquiry's own status too, otherwise it stays
        // stuck on whatever it was (e.g. "In progress") even though the
        // sale card right above it says "Kartina sotilgan deb belgilangan".
        if (nextIsSold && selectedStatus !== 'COMPLETED') {
          await handleStatusChange('COMPLETED');
        }
      } else {
        alert(data.error || "Kartinani sotilgan deb belgilashda xatolik yuz berdi");
      }
    } catch (err) {
      console.error('Failed to toggle sold status:', err);
      alert("Serverga bog'lanishda xatolik yuz berdi");
    } finally {
      setSavingSold(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;

    try {
      await fetch(`/api/admin/inquiries/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      pollGuardRef.current++;
      setInquiries((prev) =>
        prev.map((item) => (item.id === selected.id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="bg-[#E0F2FE] text-[#0284C7] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.new}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="bg-[#FEF3C7] text-[#D97706] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.inProgress}
          </span>
        );
      case 'ANSWERED':
        return (
          <span className="bg-[#DCFCE7] text-[#16A34A] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.answered}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-[#F3E8FF] text-[#9333EA] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.admin.completed}
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
          {t.admin.inquiries}
        </h2>
        <span className="text-xs text-[#726861]">
          {inquiries.length} {t.admin.all.toLowerCase()}
        </span>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Inquiries List */}
        <div className="lg:col-span-5 space-y-3">
          {inquiries.map((inq) => {
            const isCurrent = inq.id === selectedId;
            const messages = inq.messages || [];
            const unreadCustomerMsgs = messages.filter(
              (m: any) => m.sender === 'CUSTOMER' && !m.is_read
            ).length;
            const lastMessage = messages[messages.length - 1];

            return (
              <div
                key={inq.id}
                onClick={() => handleSelect(inq)}
                className={`p-4 rounded-[4px] border cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-[#FAF4EC] border-[#BA4E25] shadow-xs'
                    : 'bg-[#FDFBF9] border-[#E7E0D8] hover:border-[#BA4E25]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#281C18]">
                      {inq.guest_name || 'Guest Customer'}
                    </span>
                    {unreadCustomerMsgs > 0 && (
                      <span className="bg-[#BA4E25] text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCustomerMsgs} yangi
                      </span>
                    )}
                  </div>
                  {getStatusBadge(inq.status)}
                </div>

                <div className="flex items-center gap-2 mb-1">
                  {getPaintingThumb(inq.painting) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPaintingThumb(inq.painting)!}
                      alt=""
                      className="w-7 h-7 rounded-[2px] object-cover border border-[#E7E0D8] shrink-0"
                    />
                  )}
                  <div className="text-xs text-[#726861] truncate">
                    {inq.painting?.title_en || 'Artwork inquiry'} ·{' '}
                    {inq.painting?.discount_price ? (
                      <>
                        <span className="line-through text-[#B5A599]">${inq.painting.price}</span>{' '}
                        <span className="text-[#BA4E25] font-semibold">${inq.painting.discount_price}</span>
                      </>
                    ) : inq.painting?.price ? (
                      `$${inq.painting.price}`
                    ) : (
                      ''
                    )}
                  </div>
                </div>

                {lastMessage && (
                  <p className="text-[11.5px] text-[#554740] line-clamp-1 italic bg-[#F7F3EE] p-1.5 rounded-[2px]">
                    <strong>{lastMessage.sender === 'ADMIN' ? 'Kurator: ' : 'Mijoz: '}</strong>
                    {lastMessage.message}
                  </p>
                )}

                <div className="text-[10px] text-[#8F8178] mt-1 text-right">
                  {new Date(inq.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Message & Reply Thread Pane */}
        <div className="lg:col-span-7 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-5 shadow-xs">
          {selected ? (
            <>
              {/* Customer & Painting Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0EAE1] gap-3">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-[#281C18]">
                    {selected.guest_name}
                  </h3>
                  <p className="text-xs text-[#726861] mt-0.5">
                    {selected.guest_email} {selected.guest_phone ? `· ${selected.guest_phone}` : ''}
                  </p>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDelete(selected.id, selected.guest_name || selected.id)}
                    disabled={deleting}
                    title="O'chirish"
                    aria-label="O'chirish"
                    className="p-2 rounded-[3px] border border-[#E7E0D8] text-[#8F7E73] hover:text-[#C62828] hover:border-[#C62828]/40 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                  <label className="text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                    STATUS:
                  </label>
                  <FilterSelect
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    className="w-40"
                    buttonClassName="!rounded-[3px] !py-1.5"
                    options={[
                      { value: 'NEW', label: t.admin.new },
                      { value: 'IN_PROGRESS', label: t.admin.inProgress },
                      { value: 'ANSWERED', label: t.admin.answered },
                      { value: 'COMPLETED', label: t.admin.completed },
                    ]}
                  />
                </div>
              </div>

              {/* Which painting this inquiry is about — image, price, discount */}
              {selected.painting && (
                <a
                  href={`/gallery/${selected.painting.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white border border-[#E7E0D8] rounded-[4px] p-3 hover:border-[#BA4E25]/50 transition-colors"
                >
                  {getPaintingThumb(selected.painting) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPaintingThumb(selected.painting)!}
                      alt=""
                      className="w-14 h-14 rounded-[3px] object-cover border border-[#E7E0D8] shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#281C18] truncate flex items-center gap-1.5">
                      {selected.painting.title_en}
                      {selected.painting.is_sold && (
                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          SOTILGAN
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5">
                      {selected.painting.discount_price ? (
                        <>
                          <span className="line-through text-[#B5A599]">${selected.painting.price}</span>{' '}
                          <span className="text-[#BA4E25] font-bold">${selected.painting.discount_price}</span>
                          <span className="text-[#8F8178]"> (skidkadagi narx)</span>
                        </>
                      ) : (
                        <span className="text-[#554740] font-semibold">${selected.painting.price}</span>
                      )}
                    </p>
                  </div>
                </a>
              )}

              {/* Requested accessories + curator's final agreed price */}
              <div className="bg-[#FAF4EC] border border-[#EBE4DA] rounded-[4px] p-4 space-y-3">
                {selectedAccessories.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5 flex items-center gap-1.5">
                      <Gem className="w-3.5 h-3.5 text-[#BA4E25]" />
                      <span>Mijoz so'ragan qo'shimcha mahsulotlar</span>
                    </div>
                    <ul className="space-y-1">
                      {selectedAccessories.map((a) => (
                        <li key={a.id} className="flex items-center justify-between text-xs text-[#4D3F38]">
                          <span>{a.name_uz}</span>
                          <span className="font-semibold text-[#BA4E25]">+${a.price}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between text-xs font-bold text-[#281C18] pt-1.5 mt-1.5 border-t border-[#E7E0D8]">
                      <span>Kartina + tanlangan mahsulotlar:</span>
                      <span>
                        ${(selected.painting?.discount_price || selected.painting?.price || 0) + accessoriesTotal}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#429599]" />
                    <span>Yakuniy kelishilgan narx (ixtiyoriy)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(e.target.value)}
                      placeholder="Masalan: 270"
                      className="flex-1 text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveFinalPrice}
                      disabled={savingPrice}
                      className="px-3.5 py-2 bg-[#281C18] hover:bg-[#3D2C26] text-white text-xs font-semibold rounded-[3px] transition-all disabled:opacity-50 shrink-0"
                    >
                      {savingPrice ? '...' : 'Saqlash'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-[#8F8178] mt-1">
                    Telegram/WhatsApp'da kelishilgan yakuniy summani shu yerga yozib qo'ying — faqat ichki hisobot uchun.
                  </p>
                </div>

                {selected.painting?.id && (
                  <div className="flex items-center justify-between pt-3 border-t border-[#E7E0D8]">
                    <div className="text-xs text-[#4D3F38]">
                      {selected.painting.is_sold ? (
                        <span className="inline-flex items-center gap-1.5 text-[#16A34A] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Kartina sotilgan deb belgilangan
                        </span>
                      ) : (
                        'Kelishuv yakunlansa, kartinani shu yerdan sotilgan deb belgilashingiz mumkin.'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSold(!selected.painting.is_sold)}
                      disabled={savingSold}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-[3px] transition-all disabled:opacity-50 shrink-0 ${
                        selected.painting.is_sold
                          ? 'bg-white border border-[#E7E0D8] text-[#726861] hover:bg-gray-50'
                          : 'bg-[#16A34A] hover:bg-[#128038] text-white'
                      }`}
                    >
                      {savingSold
                        ? '...'
                        : selected.painting.is_sold
                        ? 'Sotilganini bekor qilish'
                        : 'Sotildi deb belgilash'}
                    </button>
                  </div>
                )}
              </div>

              {/* Thread History */}
              <div ref={messagesContainerRef} className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {(selected.messages || []).length === 0 ? (
                  <div className="bg-[#FAF4EC] border border-[#EBE4DA] rounded-[4px] p-5 text-sm text-[#3E332E] italic">
                    "{selected.message}"
                  </div>
                ) : (
                  (selected.messages || []).map((msg: any) => {
                    const isCustomer = msg.sender === 'CUSTOMER';
                    const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const dateStr = new Date(msg.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`flex items-center gap-1.5 text-[10.5px] mb-1 font-medium ${
                            isCustomer ? 'text-[#726861]' : 'text-[#8F8178] flex-row-reverse'
                          }`}
                        >
                          {isCustomer ? (
                            <>
                              <User className="w-3 h-3 text-[#BA4E25]" />
                              <span>{selected.guest_name || 'Customer'}</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 text-[#DAA932]" />
                              <span className="text-[#DAA932] font-semibold">Art Qala Curator (Siz)</span>
                            </>
                          )}
                          <span className="text-[#B5A599]">· {dateStr}, {timeStr}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-[4px] px-4 py-3 text-xs leading-relaxed shadow-xs ${
                            isCustomer
                              ? 'bg-[#FAF4EC] text-[#281C18] border border-[#E7E0D8] rounded-tl-none'
                              : 'bg-[#281C18] text-[#FAF4EC] rounded-tr-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Form */}
              <div className="pt-2 border-t border-[#F0EAE1] space-y-3">
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                  KURATOR JAVOBI (CHAT ORQALI)
                </label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Mijozga javob yozing... Yuborilganda mijoz shaxsiy kabinetida darhol ko'radi va email xabarnoma oladi."
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] resize-none"
                />

                {success && (
                  <div className="p-3 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[3px] text-xs text-[#1B5E20] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                    <span>Javob chatga qo'shildi va mijozga Resend orqali email xabarnoma yuborildi!</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8F8178] flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#429599]" />
                    <span>Resend email xabarnoma avtomatik jo'natiladi</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={saving || !replyText.trim()}
                    className="bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{saving ? 'Yuborilmoqda...' : 'Javobni yuborish'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-[#8F8178]">Tafsilotlarni ko'rish uchun so'rovni tanlang.</p>
          )}
        </div>
      </div>
    </div>
  );
}
