'use client';

import React from 'react';
import { Languages, Undo2 } from 'lucide-react';

// Label adornment for a trilingual field group (see useAutoTranslate):
// a pulsing icon while a translation is in flight, and a one-click undo
// after it replaced text that was already there.
export default function TranslateStatus({
  translating,
  canUndo,
  onUndo,
}: {
  translating: boolean;
  canUndo: boolean;
  onUndo: () => void;
}) {
  if (translating) {
    return <Languages className="w-3 h-3 text-[#BA4E25] animate-pulse" aria-label="Tarjima qilinmoqda" />;
  }
  if (canUndo) {
    return (
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-0.5 normal-case tracking-normal font-semibold text-[10px] text-[#429599] hover:underline cursor-pointer"
        title="Avvalgi tarjimani qaytarish"
      >
        <Undo2 className="w-3 h-3" />
        <span>qaytarish</span>
      </button>
    );
  }
  return null;
}
