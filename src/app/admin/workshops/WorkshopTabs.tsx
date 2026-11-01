import React from 'react';
import Link from 'next/link';
import { CalendarCheck, Palette } from 'lucide-react';

export default function WorkshopTabs({
  active,
  newCount,
  children,
}: {
  active: 'bookings' | 'list';
  newCount: number;
  children: React.ReactNode;
}) {
  const tab = (key: 'bookings' | 'list', href: string, label: React.ReactNode, Icon: typeof Palette) => (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
        active === key ? 'border-[#BA4E25] text-[#281C18]' : 'border-transparent text-[#8F8178] hover:text-[#281C18]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
  return (
    <div>
      <div className="px-6 lg:px-10 pt-6 border-b border-[#E7E0D8] flex gap-2">
        {tab(
          'bookings',
          '/admin/workshops',
          <>
            Bronlar
            {newCount > 0 && (
              <span className="text-[10.5px] font-bold bg-[#BA4E25] text-white rounded-full px-1.5 py-0.5">{newCount}</span>
            )}
          </>,
          CalendarCheck
        )}
        {tab('list', '/admin/workshops?tab=list', 'Master-klasslar', Palette)}
      </div>
      {children}
    </div>
  );
}
