'use client';

import React, { useState } from 'react';
import { Star, Send, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ReviewHoneypot, reviewErrorText, reviewGuardFields, useReviewFormToken } from '@/components/ReviewGuard';

// A review of the gallery itself (no painting) — anyone can send one; it
// shows on the Reviews page once a curator approves it.
export default function GeneralReviewForm() {
  const { user, t } = useApp();
  const [rating, setRating] = useState(5);
  // Prefilled with a signed-in visitor's name until they type their own.
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? user?.name ?? '';
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const token = useReviewFormToken(!sent);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, author_name: name.trim(), text: text.trim(), ...reviewGuardFields(form, token.token) }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setText('');
      } else {
        setError(reviewErrorText(data.code, t));
        if (data.code === 'expired') token.refresh();
      }
    } catch {
      setError(t.reviews.networkError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="write-review" className="scroll-mt-24 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
      <div>
        <div className="flex items-center gap-2 text-[#BA4E25]">
          <MessageSquarePlus className="w-5 h-5" />
          <h3 className="font-serif text-xl font-semibold text-[#281C18]">{t.reviews.generalFormTitle}</h3>
        </div>
        <p className="text-xs text-[#6B5E55] leading-relaxed mt-1.5">{t.reviews.generalFormDesc}</p>
      </div>

      {sent ? (
        <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-[3px] text-xs text-[#107B38] flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{t.reviews.thanksModerated}</span>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5 relative">
          <ReviewHoneypot />
          {error && (
            <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">{error}</div>
          )}
          <div className="flex gap-1.5" role="radiogroup" aria-label={t.reviews.ratingLabel}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star}`}
                onClick={() => setRating(star)}
                className={`p-1.5 rounded-[2px] border transition-all ${
                  rating >= star ? 'text-[#DAA932] border-[#DAA932] bg-white' : 'text-gray-300 border-[#E7E0D8] bg-[#FDFBF9]'
                }`}
              >
                <Star className={`w-5 h-5 ${rating >= star ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.reviews.yourNameLabel}
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              {t.reviews.yourReviewLabel}
            </label>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.reviews.reviewPlaceholder}
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-60 text-white font-semibold text-xs py-3 rounded-[3px] transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? t.reviews.submitting : t.reviews.submitForApproval}</span>
          </button>
        </form>
      )}
    </div>
  );
}
