'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

// Painting form: post this work to the gallery's Telegram channel (new works
// are posted automatically when they're created).
export default function ChannelPostButton({ paintingId }: { paintingId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const post = async () => {
    if (!confirm("Bu asar Telegram kanalga joylansinmi?")) return;
    setState('busy');
    try {
      const res = await fetch(`/api/admin/paintings/${paintingId}/channel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) setState('done');
      else {
        setError(data.error || 'Xatolik');
        setState('error');
      }
    } catch {
      setError("Serverga bog'lanib bo'lmadi");
      setState('error');
    }
  };

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={post}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-1.5 font-semibold text-[#229ED9] hover:underline disabled:opacity-50"
      >
        {state === 'busy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Telegram kanalga joylash
      </button>
      {state === 'done' && <span className="ml-2 text-[#16A34A]">Joylandi ✓</span>}
      {state === 'error' && <span className="ml-2 text-[#B91C1C]">{error} (Sozlamalar → Telegram)</span>}
    </div>
  );
}
