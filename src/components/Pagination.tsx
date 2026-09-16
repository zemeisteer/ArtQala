'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

// Shared pagination bar for admin list pages — kept as one component so
// every list paginates the same way instead of each page reinventing it.
export default function Pagination({ page, totalPages, onChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E7E0D8] bg-[#FAF4EC]/40 text-xs">
      <span className="text-[#8F7E73]">
        {startItem}–{endItem} / {totalItems}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-[3px] border border-[#E7E0D8] bg-white text-[#554740] hover:border-[#BA4E25]/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Oldingi sahifa"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2 font-semibold text-[#281C18]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-[3px] border border-[#E7E0D8] bg-white text-[#554740] hover:border-[#BA4E25]/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Keyingi sahifa"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
