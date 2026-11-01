'use client';

import React, { useState, useEffect } from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import PaintingCard, { PaintingItem } from '@/components/PaintingCard';
import ChatModal, { ThreadMessage } from '@/components/chat/ChatModal';
import WishlistInquiryModal from '@/components/WishlistInquiryModal';
import PriceAlertsToggle from '@/components/PriceAlertsToggle';
import {
  User,
  Heart,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Shield,
  Palette,
  ExternalLink,
  MessageCircle,
  Star,
  X,
  Send,
} from 'lucide-react';
import { mainImage } from '@/lib/paintingImages';
import { ReviewHoneypot, reviewErrorText, reviewGuardFields, useReviewFormToken } from '@/components/ReviewGuard';
import type { InquiryLine } from '@/lib/inquiryItems';

export default function AccountPage() {
  const router = useRouter();
  const { user, signOut, formatPrice, wishlist, lang, t } = useApp();

  const [activeTab, setActiveTab] = useState<'inquiries' | 'wishlist' | 'profile'>('inquiries');
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [wishlistPaintings, setWishlistPaintings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWishlistInquiry, setShowWishlistInquiry] = useState(false);

  // Active chat state
  const [activeChat, setActiveChat] = useState<{
    type: 'inquiry' | 'service';
    item: any;
  } | null>(null);

  // Review modal state (TZ 8.12)
  const [reviewInquiry, setReviewInquiry] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleOpenReview = (inquiry: any) => {
    setReviewInquiry(inquiry);
    setReviewRating(5);
    setReviewText('');
    setReviewSuccess(null);
    setReviewError(null);
  };

  const reviewToken = useReviewFormToken(!!reviewInquiry);

  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewInquiry?.painting?.id) return;
    const form = e.currentTarget as HTMLFormElement;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painting_id: reviewInquiry.painting.id,
          rating: reviewRating,
          author_name: user?.name || t.reviews.verifiedCollectorBadge,
          text: reviewText.trim(),
          ...reviewGuardFields(form, reviewToken.token),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccess(
          lang === 'uz'
            ? "Sharhingiz qabul qilindi! Moderator tasdiqlagach saytda e'lon qilinadi."
            : lang === 'ru'
            ? 'Ваш отзыв принят! Он будет опубликован после проверки модератором.'
            : 'Your review has been received and will be published once approved by our curator.'
        );
        setTimeout(() => {
          setReviewInquiry(null);
          setReviewSuccess(null);
        }, 2500);
      } else {
        setReviewError(reviewErrorText(data.code, t));
        if (data.code === 'expired') reviewToken.refresh();
      }
    } catch {
      setReviewError(t.reviews.networkError);
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchInquiries = async () => {
    try {
      const inqRes = await fetch('/api/user/inquiries');
      if (inqRes.ok) {
        const inqData = await inqRes.json();
        if (inqData.success) {
          setInquiries(inqData.inquiries || []);
          setServiceRequests(inqData.serviceRequests || []);
          setTotalUnread(inqData.totalUnreadCount || 0);

          // Update activeChat if currently open
          if (activeChat) {
            const updatedItem =
              activeChat.type === 'inquiry'
                ? (inqData.inquiries || []).find((i: any) => i.id === activeChat.item.id)
                : (inqData.serviceRequests || []).find((s: any) => s.id === activeChat.item.id);
            if (updatedItem) {
              setActiveChat({ type: activeChat.type, item: updatedItem });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    }
  };

  // Runs once on mount only — AppContext's wishlist starts as [] and is then
  // replaced with a new array reference read from localStorage right after,
  // so depending on `wishlist` here re-fired this fetch a second time and
  // briefly raced the inquiries list back to empty before the real data
  // arrived. Wishlist-driven painting lookups are handled separately below.
  useEffect(() => {
    async function fetchData() {
      try {
        await fetchInquiries();
      } catch (err) {
        console.error('Error loading account data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetchWishlistPaintings() {
      try {
        const wishRes = await fetch('/api/paintings');
        if (wishRes.ok) {
          const wishData = await wishRes.json();
          if (wishData.success) {
            const allP = wishData.paintings || [];
            setWishlistPaintings(allP.filter((p: any) => wishlist.includes(p.id)));
          }
        }
      } catch (err) {
        console.error('Error loading wishlist paintings:', err);
      }
    }

    fetchWishlistPaintings();
  }, [wishlist]);

  // Handle opening chat
  const handleOpenChat = async (type: 'inquiry' | 'service', item: any) => {
    setActiveChat({ type, item });

    // If there were unread messages, mark as read
    if (item.unreadCount > 0) {
      try {
        await fetch(`/api/${type === 'inquiry' ? 'inquiries' : 'services'}/${item.id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewer: 'CUSTOMER' }),
        });

        // Update local state
        setTotalUnread((prev) => Math.max(0, prev - item.unreadCount));
        if (type === 'inquiry') {
          setInquiries((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    unreadCount: 0,
                    messages: i.messages.map((m: any) =>
                      m.sender === 'ADMIN' ? { ...m, is_read: true } : m
                    ),
                  }
                : i
            )
          );
        } else {
          setServiceRequests((prev) =>
            prev.map((s) =>
              s.id === item.id
                ? {
                    ...s,
                    unreadCount: 0,
                    messages: s.messages.map((m: any) =>
                      m.sender === 'ADMIN' ? { ...m, is_read: true } : m
                    ),
                  }
                : s
            )
          );
        }
      } catch (e) {
        console.error('Error marking messages as read:', e);
      }
    }
  };

  // Handle sending a reply in chat
  const handleSendMessage = async (text: string): Promise<boolean> => {
    if (!activeChat) return false;

    try {
      const url = `/api/${activeChat.type === 'inquiry' ? 'inquiries' : 'services'}/${activeChat.item.id}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'CUSTOMER',
          message: text,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        // Append message to active chat item
        const updatedMessages = [...(activeChat.item.messages || []), data.message];
        const updatedItem = { ...activeChat.item, messages: updatedMessages, status: 'IN_PROGRESS' };
        setActiveChat({ type: activeChat.type, item: updatedItem });

        if (activeChat.type === 'inquiry') {
          setInquiries((prev) =>
            prev.map((i) => (i.id === activeChat.item.id ? updatedItem : i))
          );
        } else {
          setServiceRequests((prev) =>
            prev.map((s) => (s.id === activeChat.item.id ? updatedItem : s))
          );
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    }
  };

  // If not logged in, show prompt
  if (!user && !loading) {
    return (
      <div className="py-20 px-6 flex items-center justify-center min-h-[65vh]">
        <div className="max-w-md w-full bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#BA4E25]/10 text-[#BA4E25] flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#281C18]">
            {t.account.signInPromptTitle}
          </h2>
          <p className="text-xs text-[#726861] leading-relaxed">
            {t.account.signInPromptDesc}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/signin"
              className="bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold py-2.5 rounded-[3px] transition-all"
            >
              {t.nav.signIn}
            </Link>
            <Link
              href="/signup"
              className="border border-[#E7E0D8] text-[#554740] hover:border-[#BA4E25] hover:text-[#BA4E25] text-xs font-semibold py-2.5 rounded-[3px] transition-all"
            >
              {t.account.createAccountBtn}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="bg-[#E0F2FE] text-[#0369A1] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.account.statusUnderReview}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="bg-[#FEF3C7] text-[#B45309] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.account.statusInProgress}
          </span>
        );
      case 'ANSWERED':
        return (
          <span className="bg-[#DCFCE7] text-[#15803D] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.account.statusAnswered}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-[#F3E8FF] text-[#7E22CE] text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
            {t.account.statusCompleted}
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
    <div className="py-12 sm:py-16">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Profile Header Banner */}
        <div className="bg-[#281C18] text-[#FAF4EC] rounded-[4px] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#BA4E25] text-white font-serif font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
              {user?.name?.slice(0, 2).toUpperCase() || 'AQ'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold">
                  {user?.name}
                </h1>
                {user?.email_verified && (
                  <span className="bg-[#429599]/25 text-[#5AB3B7] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border border-[#429599]/40">
                    {t.account.verifiedBadge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#C5B7AD] mt-1">
                {user?.email} {user?.country ? `· ${user.country}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="bg-[#429599] hover:bg-[#337C80] text-white text-xs font-semibold px-4 py-2 rounded-[3px] transition-all flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t.account.adminPanelLink}</span>
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="border border-[#4A3B35] hover:border-[#BA4E25] text-[#FAF4EC] hover:text-[#BA4E25] text-xs font-semibold px-4 py-2 rounded-[3px] transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.nav.signOut}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-[#E7E0D8] mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap px-1 ${
              activeTab === 'inquiries'
                ? 'border-[#BA4E25] text-[#BA4E25]'
                : 'border-transparent text-[#6B5E55] hover:text-[#281C18]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.chat.myInquiries} ({inquiries.length + serviceRequests.length})</span>
            {totalUnread > 0 && (
              <span className="bg-[#BA4E25] text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                {totalUnread} {t.chat.unread}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap px-1 ${
              activeTab === 'wishlist'
                ? 'border-[#BA4E25] text-[#BA4E25]'
                : 'border-transparent text-[#6B5E55] hover:text-[#281C18]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>{t.account.tabWishlist} ({wishlistPaintings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap px-1 ${
              activeTab === 'profile'
                ? 'border-[#BA4E25] text-[#BA4E25]'
                : 'border-transparent text-[#6B5E55] hover:text-[#281C18]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t.account.tabProfile}</span>
          </button>
        </div>

        {/* Tab 1: Inquiries & Service Requests */}
        {activeTab === 'inquiries' && (
          <div className="space-y-8">
            {/* Painting Inquiries */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#281C18] mb-4">
                {t.account.paintingInquiriesTitle}
              </h2>

              {inquiries.length > 0 ? (
                <div className="space-y-4">
                  {inquiries.map((inq) => {
                    const thumb = mainImage(inq.painting?.images);
                    const lines: InquiryLine[] = inq.lines || [];
                    const grouped = lines.length > 1;
                    const lineTitle = (l: InquiryLine) =>
                      (lang === 'ru' ? l.title_ru : lang === 'uz' ? l.title_uz : l.title_en) || t.account.paintingFallback;

                    const messagesCount = inq.messages?.length || 0;
                    const lastMsg = inq.messages?.[messagesCount - 1];
                    const hasUnread = inq.unreadCount > 0;

                    return (
                      <div
                        key={inq.id}
                        className={`bg-[#FDFBF9] border rounded-[3px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition ${
                          hasUnread
                            ? 'border-[#BA4E25] ring-1 ring-[#BA4E25]/20 bg-[#FAF4EC]'
                            : 'border-[#E7E0D8]'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-4 flex-1">
                          <div className="w-16 h-16 rounded-[2px] overflow-hidden relative border border-[#E7E0D8] shrink-0 bg-[#F4ECE1]">
                            <Image
                              src={thumb}
                              alt={inq.painting?.title_en || t.account.paintingFallback}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {grouped ? (
                                <span className="font-serif font-semibold text-lg text-[#281C18]">
                                  {lines.length} {t.account.piecesInOneInquiry}
                                </span>
                              ) : (
                                <Link
                                  href={`/gallery/${inq.painting?.id}`}
                                  className="font-serif font-semibold text-lg text-[#281C18] hover:text-[#BA4E25] flex items-center gap-1.5 truncate"
                                >
                                  <span>
                                    {(lang === 'ru'
                                      ? inq.painting?.title_ru
                                      : lang === 'uz'
                                      ? inq.painting?.title_uz
                                      : inq.painting?.title_en) || t.account.paintingFallback}
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5 text-[#756962]" />
                                </Link>
                              )}
                              {hasUnread && (
                                <span className="bg-[#BA4E25] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {inq.unreadCount} {t.chat.newInquiryBadge}
                                </span>
                              )}
                            </div>
                            {grouped ? (
                              <ul className="text-xs text-[#554740] space-y-1">
                                {lines.map((l, i) => (
                                  <li key={l.itemId || i} className="flex flex-wrap items-center gap-x-1.5">
                                    {l.paintingId && l.painting ? (
                                      <Link href={`/gallery/${l.paintingId}`} className="font-semibold text-[#281C18] hover:text-[#BA4E25]">
                                        {lineTitle(l)}
                                      </Link>
                                    ) : (
                                      <span className="font-semibold text-[#281C18]">{lineTitle(l)}</span>
                                    )}
                                    {/* Once the curator agreed a price for this piece,
                                        it replaces the listed price (+ add-ons). */}
                                    <span className={l.finalPrice != null ? 'line-through text-[#B5A599]' : ''}>
                                      · {formatPrice(l.price)}
                                    </span>
                                    {l.accessories.map((a) => (
                                      <span
                                        key={a.id}
                                        className={l.finalPrice != null ? 'line-through text-[#B5A599]' : 'text-[#756962]'}
                                      >
                                        + {lang === 'ru' ? a.name_ru : lang === 'uz' ? a.name_uz : a.name_en} ({formatPrice(a.price)})
                                      </span>
                                    ))}
                                    {l.finalPrice != null && (
                                      <span className="font-semibold text-[#107B38]">
                                        {t.account.agreedPrice}: {formatPrice(l.finalPrice)}
                                      </span>
                                    )}
                                    {l.paintingId && l.painting && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview({ ...inq, painting: { ...l.painting, id: l.paintingId } })}
                                        className="text-[#BA4E25] hover:underline inline-flex items-center gap-0.5"
                                        title={t.account.reviewBtn}
                                      >
                                        <Star className="w-3 h-3" />
                                      </button>
                                    )}
                                  </li>
                                ))}
                                <li className="font-bold text-[#281C18] pt-0.5">
                                  {t.account.inquiryTotal}:{' '}
                                  {inq.customer_total != null && inq.customer_total !== inq.total ? (
                                    <>
                                      <span className="line-through text-[#B5A599] font-normal">{formatPrice(inq.total || 0)}</span>{' '}
                                      <span className="text-[#107B38]">{formatPrice(inq.customer_total)}</span>
                                    </>
                                  ) : (
                                    formatPrice(inq.total || 0)
                                  )}
                                </li>
                              </ul>
                            ) : (
                              <p className="text-xs text-[#726861]">
                                {t.gallery.byArtist} {inq.painting?.artist?.name} ·{' '}
                                {inq.final_price != null ? (
                                  <>
                                    <span className="line-through text-[#B5A599]">
                                      {formatPrice(inq.total || inq.painting?.price || 0)}
                                    </span>{' '}
                                    <span className="font-semibold text-[#107B38]">
                                      {t.account.agreedPrice}: {formatPrice(inq.final_price)}
                                    </span>
                                  </>
                                ) : (
                                  formatPrice(inq.total || inq.painting?.price || 0)
                                )}
                              </p>
                            )}
                            {lastMsg && (
                              <p className="text-xs text-[#554740] bg-[#F7F3EE] p-2 rounded-[2px] line-clamp-2 max-w-xl border border-[#EFE8DE]">
                                <strong className="text-[#281C18]">
                                  {lastMsg.sender === 'ADMIN' ? `${t.chat.curator}: ` : `${t.chat.you}: `}
                                </strong>
                                {lastMsg.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EFE8DE]">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(inq.status)}
                            <span className="text-[11px] text-[#746A63]">
                              {new Date(inq.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!grouped && (
                              <button
                                onClick={() => handleOpenReview(inq)}
                                className="border border-[#BA4E25] text-[#BA4E25] hover:bg-[#BA4E25] hover:text-white text-xs font-semibold px-3 py-2 rounded-[3px] transition flex items-center gap-1.5 shadow-xs"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>{t.account.reviewBtn}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenChat('inquiry', inq)}
                              className="bg-[#281C18] hover:bg-[#BA4E25] text-white text-xs font-semibold px-4 py-2 rounded-[3px] transition flex items-center gap-1.5 shadow-xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>
                                {t.chat.openChat} ({messagesCount})
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-[#726861] bg-[#FDFBF9] p-6 rounded-[3px] border border-[#E7E0D8] space-y-1.5">
                  <p>{t.account.noInquiriesYet}</p>
                  <Link href="/gallery" className="text-[#BA4E25] underline font-semibold inline-block">
                    {t.account.exploreGalleryCta}
                  </Link>
                </div>
              )}
            </div>

            {/* Service Requests */}
            <div className="pt-4">
              <h2 className="font-serif text-2xl font-semibold text-[#281C18] mb-4">
                {t.account.servicesTitle}
              </h2>

              {serviceRequests.length > 0 ? (
                <div className="space-y-4">
                  {serviceRequests.map((sr) => {
                    const messagesCount = sr.messages?.length || 0;
                    const lastMsg = sr.messages?.[messagesCount - 1];
                    const hasUnread = sr.unreadCount > 0;

                    return (
                      <div
                        key={sr.id}
                        className={`bg-[#FDFBF9] border rounded-[3px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition ${
                          hasUnread
                            ? 'border-[#BA4E25] ring-1 ring-[#BA4E25]/20 bg-[#FAF4EC]'
                            : 'border-[#E7E0D8]'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold tracking-wider uppercase text-[#BA4E25]">
                              {sr.service_type}
                            </span>
                            <span className="text-[#A8988E]">·</span>
                            <span className="text-xs text-[#726861]">
                              {t.account.contactLabel}: {sr.guest_contact}
                            </span>
                            {hasUnread && (
                              <span className="bg-[#BA4E25] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {sr.unreadCount} {t.chat.newInquiryBadge}
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <p className="text-xs text-[#554740] bg-[#F7F3EE] p-2 rounded-[2px] line-clamp-2 max-w-xl border border-[#EFE8DE]">
                              <strong className="text-[#281C18]">
                                {lastMsg.sender === 'ADMIN' ? `${t.chat.curator}: ` : `${t.chat.you}: `}
                              </strong>
                              {lastMsg.message}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EFE8DE]">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(sr.status)}
                            <span className="text-[11px] text-[#746A63]">
                              {new Date(sr.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenChat('service', sr)}
                            className="bg-[#281C18] hover:bg-[#BA4E25] text-white text-xs font-semibold px-4 py-2 rounded-[3px] transition flex items-center gap-1.5 shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>
                              {t.chat.openChat} ({messagesCount})
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-[#726861] bg-[#FDFBF9] p-6 rounded-[3px] border border-[#E7E0D8] space-y-1.5">
                  <p>{t.account.noServiceRequestsYet}</p>
                  <Link href="/services" className="text-[#BA4E25] underline font-semibold inline-block">
                    {t.account.exploreServicesCta}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Saved Artworks (Wishlist) */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlistPaintings.length > 0 && (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <PriceAlertsToggle />
                <button
                  onClick={() => setShowWishlistInquiry(true)}
                  className="bg-[#281C18] hover:bg-[#BA4E25] text-white text-xs font-semibold px-4 py-2.5 rounded-[3px] transition flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.wishlistInquiry.sendAllBtn} ({wishlistPaintings.length})</span>
                </button>
              </div>
            )}
            {wishlistPaintings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
                {wishlistPaintings.map((painting) => (
                  <div key={painting.id}>
                    <PaintingCard painting={painting as PaintingItem} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] space-y-3">
                <Heart className="w-8 h-8 text-[#BA4E25] mx-auto opacity-75" />
                <h3 className="font-serif text-xl font-semibold text-[#281C18]">
                  {t.account.noSavedArtworksTitle}
                </h3>
                <p className="text-xs text-[#726861] max-w-sm mx-auto">
                  {t.account.noSavedArtworksDesc}
                </p>
                <Link
                  href="/gallery"
                  className="inline-block bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold px-5 py-2.5 rounded-[3px] transition-all mt-2"
                >
                  {t.account.exploreGalleryBtn}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Profile Details */}
        {activeTab === 'profile' && (
          <div className="max-w-xl bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-8 space-y-6">
            <h2 className="font-serif text-2xl font-semibold text-[#281C18]">
              {t.account.accountSettingsTitle}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.account.fullNameLabel}
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-[#E7E0D8] rounded-[2px] text-[#4D3F38]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.account.emailAddressLabel}
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-[#E7E0D8] rounded-[2px] text-[#4D3F38]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  {t.account.countryLabel}
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.country || 'Uzbekistan'}
                  className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-[#E7E0D8] rounded-[2px] text-[#4D3F38]"
                />
              </div>

              <div className="pt-2">
                <span className="text-xs text-[#756962]">
                  {t.account.accountRoleLabel}: <strong className="text-[#281C18]">{user?.role}</strong>
                </span>
              </div>
            </div>

            {user?.role === 'USER' && <DeleteAccount />}
          </div>
        )}
      </div>

      {/* Interactive Chat Thread Modal */}
      {activeChat && (
        <ChatModal
          isOpen={Boolean(activeChat)}
          onClose={() => setActiveChat(null)}
          title={
            activeChat.type === 'inquiry'
              ? (activeChat.item.lines || []).length > 1
                ? `${activeChat.item.lines.length} ${t.account.piecesInOneInquiry}`
                : (lang === 'ru'
                  ? activeChat.item.painting?.title_ru
                  : lang === 'uz'
                  ? activeChat.item.painting?.title_uz
                  : activeChat.item.painting?.title_en) || t.account.paintingFallback
              : `${activeChat.item.service_type} ${t.account.serviceRequestSuffix}`
          }
          subtitle={
            activeChat.type === 'inquiry'
              ? (activeChat.item.lines || []).length > 1
                ? (activeChat.item.lines as InquiryLine[])
                    .map((l) => (lang === 'ru' ? l.title_ru : lang === 'uz' ? l.title_uz : l.title_en))
                    .join(', ')
                : `${t.gallery.byArtist} ${activeChat.item.painting?.artist?.name || 'Art Qala Artist'}`
              : `${t.account.contactLabel}: ${activeChat.item.guest_contact}`
          }
          status={activeChat.item.status}
          statusBadge={getStatusBadge(activeChat.item.status)}
          messages={activeChat.item.messages || []}
          onSendMessage={handleSendMessage}
          imageSrc={
            activeChat.type === 'inquiry'
              ? mainImage(activeChat.item.painting?.images)
              : undefined
          }
          priceText={
            activeChat.type === 'inquiry'
              ? formatPrice(
                  activeChat.item.customer_total ?? activeChat.item.total ?? activeChat.item.painting?.price ?? 0
                )
              : undefined
          }
        />
      )}

      {/* TZ 8.12: Write Review Modal in Customer Account */}
      {reviewInquiry && (
        <div className="fixed inset-0 z-50 bg-[#281C18]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setReviewInquiry(null)}
              className="absolute top-5 right-5 text-[#756962] hover:text-[#281C18] p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#347578] uppercase">
                {t.reviews.modalEyebrow}
              </span>
              <h3 className="font-serif text-2xl font-semibold text-[#281C18] mt-1">
                {t.reviews.modalTitleReview.replace(
                  '{title}',
                  (lang === 'ru'
                    ? reviewInquiry.painting?.title_ru
                    : lang === 'uz'
                    ? reviewInquiry.painting?.title_uz
                    : reviewInquiry.painting?.title_en) || t.account.paintingFallback
                )}
              </h3>
              <p className="text-xs text-[#726861] mt-0.5">
                {t.reviews.modalDescShort}
              </p>
            </div>

            {reviewSuccess ? (
              <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-[3px] text-xs text-[#107B38] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSendReview} className="space-y-4 relative">
                <ReviewHoneypot />
                {reviewError && (
                  <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">
                    {reviewError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1.5">
                    {t.reviews.ratingLabel}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`p-2 rounded-[2px] border transition-all ${
                          reviewRating >= star
                            ? 'text-[#DAA932] border-[#DAA932] bg-white shadow-xs'
                            : 'text-gray-300 border-[#E7E0D8] bg-[#FDFBF9]'
                        }`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            reviewRating >= star ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.reviews.yourReviewLabel}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={t.reviews.reviewPlaceholder}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewInquiry(null)}
                    className="px-4 py-2.5 text-xs text-[#726861] hover:text-[#281C18] transition"
                  >
                    {t.reviews.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs px-6 py-2.5 rounded-[3px] transition flex items-center gap-2 shadow-xs"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{submittingReview ? t.reviews.submitting : t.reviews.submitForApproval}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showWishlistInquiry && (
        <WishlistInquiryModal
          paintings={wishlistPaintings}
          onClose={() => setShowWishlistInquiry(false)}
        />
      )}
    </div>
  );
}

// "Delete my account" (/api/user/account): retype the email, plus the
// password when the account has one.
function DeleteAccount() {
  const { user, signOut, t } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        await signOut();
        router.push('/');
        return;
      }
      setError(
        data.code === 'wrong_email'
          ? t.account.deleteWrongEmail
          : data.code === 'wrong_password'
            ? t.account.deleteWrongPassword
            : t.account.deleteError
      );
    } catch {
      setError(t.account.deleteError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-6 border-t border-[#EFE8DE] space-y-3">
      <h3 className="text-sm font-semibold text-[#9B1C1C]">{t.account.deleteTitle}</h3>
      <p className="text-xs text-[#6B5E55] leading-relaxed">{t.account.deleteDesc}</p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-[#9B1C1C] border border-[#E9C3C3] hover:bg-[#FDF2F2] px-3.5 py-2 rounded-[3px]"
        >
          {t.account.deleteBtn}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.account.deleteTypeEmail}
            </label>
            <input
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={user?.email || ''}
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] text-[#281C18]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.account.deletePassword}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] text-[#281C18]"
            />
          </div>
          {error && <p className="text-xs text-[#9B1C1C]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !email}
              className="text-xs font-semibold text-white bg-[#9B1C1C] hover:bg-[#7F1717] px-3.5 py-2 rounded-[3px] disabled:opacity-50"
            >
              {busy ? '…' : t.account.deleteConfirm}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="text-xs font-semibold text-[#4D3F38] border border-[#E7E0D8] px-3.5 py-2 rounded-[3px]"
            >
              {t.account.deleteCancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
