'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PublicPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  labels: { previous: string; next: string; page: string };
}

// Numbered pagination for the public site (gallery, artists) — the admin
// panel's compact table-footer Pagination doesn't fit a browsing page.
// Shows first/last, the current page and its neighbours, with "…" gaps.
export default function PublicPagination({ page, totalPages, onChange, labels }: PublicPaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'gap')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  const go = (p: number) => {
    onChange(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const base =
    'min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-full text-xs font-semibold border transition-colors';

  return (
    <nav aria-label={labels.page} className="flex items-center justify-center gap-1.5 mt-12">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label={labels.previous}
        className={`${base} bg-[#FDFBF9] text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25] hover:text-[#BA4E25] disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-[#8F7E73]">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-label={`${labels.page} ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={`${base} cursor-pointer ${
              p === page
                ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
                : 'bg-[#FDFBF9] text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25] hover:text-[#BA4E25]'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label={labels.next}
        className={`${base} bg-[#FDFBF9] text-[#554740] border-[#E7E0D8] hover:border-[#BA4E25] hover:text-[#BA4E25] disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
