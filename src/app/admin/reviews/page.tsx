'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Star,
  Check,
  X,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { mainImage } from '@/lib/paintingImages';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reviews');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
          setPendingCount(data.pendingCount || 0);
          setApprovedCount(data.approvedCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load reviews for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateStatus = async (id: string, is_approved: boolean) => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_approved } : r))
        );
        if (is_approved) {
          setPendingCount((c) => Math.max(0, c - 1));
          setApprovedCount((c) => c + 1);
          showToast('Review approved successfully and published to website.');
        } else {
          setPendingCount((c) => c + 1);
          setApprovedCount((c) => Math.max(0, c - 1));
          showToast('Review rejected and removed from public view.');
        }
      } else {
        alert(data.error || 'Failed to update review status');
      }
    } catch {
      alert('Error updating review status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        const target = reviews.find((r) => r.id === id);
        if (target) {
          if (target.is_approved) setApprovedCount((c) => Math.max(0, c - 1));
          else setPendingCount((c) => Math.max(0, c - 1));
        }
        setReviews((prev) => prev.filter((r) => r.id !== id));
        showToast('Review permanently deleted.');
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch {
      alert('Error deleting review');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#281C18] text-white px-4 py-3 rounded-[3px] text-xs shadow-xl flex items-center gap-2 border border-[#DAA932]">
          <CheckCircle2 className="w-4 h-4 text-[#DAA932]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
            Customer Reviews Moderation
          </h2>
          <p className="text-xs text-[#726861] mt-0.5">
            TZ 8.12: Approve or reject collector testimonials before they appear publicly on painting pages
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-[#FAF4EC] p-1 border border-[#E7E0D8] rounded-[3px]">
          <button
            onClick={() => setFilter('pending')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[2px] transition flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-[#BA4E25] text-white shadow-xs'
                : 'text-[#6B5E55] hover:text-[#281C18]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Moderation</span>
            {pendingCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  filter === 'pending'
                    ? 'bg-white text-[#BA4E25]'
                    : 'bg-[#BA4E25] text-white'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[2px] transition flex items-center gap-1.5 ${
              filter === 'approved'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#6B5E55] hover:text-[#281C18]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approved ({approvedCount})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-[2px] transition ${
              filter === 'all'
                ? 'bg-[#281C18] text-white shadow-xs'
                : 'text-[#6B5E55] hover:text-[#281C18]'
            }`}
          >
            All ({reviews.length})
          </button>
        </div>
      </div>

      {/* Reviews Table / Cards */}
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8F8178]">
            Loading reviews from database...
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="divide-y divide-[#F0EAE1]">
            {filteredReviews.map((rev) => {
              const thumb = mainImage(rev.painting?.images);

              const isPending = !rev.is_approved;
              const isActionRunning = actionLoading === rev.id;

              return (
                <div
                  key={rev.id}
                  className={`p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition ${
                    isPending ? 'bg-[#FAF4EC]/40' : 'hover:bg-[#FAF4EC]/20'
                  }`}
                >
                  {/* Review Content & Painting Info */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-semibold text-base text-[#281C18]">
                          {rev.author_name}
                        </span>
                        {rev.user?.email && (
                          <span className="text-xs text-[#8F8178]">
                            ({rev.user.email})
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      {isPending ? (
                        <span className="bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-[#FDE68A]">
                          <Clock className="w-3 h-3" />
                          Pending Moderation
                        </span>
                      ) : (
                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-[#BBF7D0]">
                          <Check className="w-3 h-3" />
                          Approved &amp; Live
                        </span>
                      )}

                      <span className="text-[11px] text-[#9E9086] ml-auto sm:ml-0">
                        {new Date(rev.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex text-[#DAA932]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-[#6B5E55]">
                        {rev.rating} / 5 Stars
                      </span>
                    </div>

                    {/* Review Text */}
                    <p className="text-xs sm:text-sm text-[#4D3F38] leading-relaxed bg-white/70 p-3 rounded-[3px] border border-[#EFE8DE] italic">
                      "{rev.text}"
                    </p>

                    {/* Artwork Reference */}
                    {rev.painting && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-[#8F8178]">Artwork:</span>
                        <a
                          href={`/gallery/${rev.painting.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#BA4E25] hover:underline flex items-center gap-1"
                        >
                          <span>{rev.painting.title_en}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                    {isPending ? (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, true)}
                        disabled={isActionRunning}
                        className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold px-4 py-2 rounded-[3px] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, false)}
                        disabled={isActionRunning}
                        className="bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold px-4 py-2 rounded-[3px] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(rev.id)}
                      disabled={isActionRunning}
                      className="border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] text-xs font-semibold p-2 rounded-[3px] transition disabled:opacity-50"
                      title="Delete review permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[#8F8178] space-y-1">
            <AlertCircle className="w-8 h-8 text-[#8F8178] mx-auto opacity-40 mb-2" />
            <p className="font-semibold text-[#4D3F38]">
              No {filter === 'all' ? '' : filter} reviews found.
            </p>
            <p className="text-[11px]">
              {filter === 'pending'
                ? 'All submitted reviews have been moderated!'
                : 'No reviews match the selected filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
