'use client';

import React from 'react';
import Link from '@/components/LocalizedLink';
import { ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Renders in the viewer's chosen language; the crawlable BreadcrumbList
// JSON-LD (English) is emitted separately by each server page component —
// see src/lib/breadcrumbJsonLd.ts.
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useApp();
  const allItems: BreadcrumbItem[] = [{ label: t.nav.home, href: '/' }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14 pt-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8F8178]">
        {allItems.map((item, i) => {
          const isLast = i === allItems.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
              {!isLast && item.href ? (
                <Link href={item.href} className="hover:text-[#BA4E25] transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#554740] font-medium" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
