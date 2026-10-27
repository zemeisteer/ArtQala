'use client';

import React from 'react';
import Link from '@/components/LocalizedLink';
import { Printer, Gift } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function GiftCertificateView({
  gift,
}: {
  gift: { code: string; amount: number; recipient: string; from: string; message: string | null; redeemed: boolean; issued: string };
}) {
  const { t } = useApp();
  const g = t.gift;
  return (
    <div className="py-12 sm:py-16 px-6">
      <style>{`@media print { header, footer, .print\\:hidden { display: none !important; } @page { size: A4 landscape; margin: 10mm; } }`}</style>
      <div className="max-w-[880px] mx-auto space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/gallery" className="text-xs font-semibold text-[#BA4E25] hover:underline">
            {g.browse} →
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-[#281C18] hover:bg-[#BA4E25] text-white text-xs font-semibold px-4 py-2 rounded-[3px] flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> {g.print}
          </button>
        </div>
        {gift.redeemed && (
          <p className="text-center text-sm font-semibold text-[#4338CA] bg-[#E0E7FF] border border-[#C7D2FE] rounded-[3px] py-2">
            {g.certRedeemed}
          </p>
        )}
        <div className="bg-[#FFFDF9] border-[6px] border-[#DAA932] p-3 shadow-2xl">
          <div className="border border-[#DAA932]/60 px-6 py-10 sm:px-14 sm:py-14 text-center space-y-5">
            <Gift className="w-10 h-10 text-[#BA4E25] mx-auto" />
            <div>
              <div className="text-xs font-bold tracking-[4px] text-[#BA4E25] uppercase">Art Qala Gallery</div>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18] mt-2">{g.certTitle}</h1>
            </div>
            <div className="font-serif text-6xl font-bold text-[#BA4E25]">${Math.round(gift.amount).toLocaleString('en-US')}</div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left sm:text-center">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#8F8178]">{g.certFor}</div>
                <div className="font-serif text-xl text-[#281C18]">{gift.recipient}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#8F8178]">{g.certFrom}</div>
                <div className="font-serif text-xl text-[#281C18]">{gift.from}</div>
              </div>
            </div>
            {gift.message && <p className="font-serif italic text-lg text-[#4D3F38] max-w-xl mx-auto">&ldquo;{gift.message}&rdquo;</p>}
            <div className="inline-block border border-dashed border-[#BA4E25] px-5 py-2 rounded-[3px]">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8F8178] mr-2">{g.certCode}</span>
              <span className="font-mono text-xl font-bold text-[#281C18]">{gift.code}</span>
            </div>
            <p className="text-xs text-[#6B5E55] max-w-xl mx-auto leading-relaxed">{g.certUse}</p>
            <p className="text-[11px] text-[#9E9086]">
              {new Date(gift.issued).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · artqala.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
