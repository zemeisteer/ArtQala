'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { TRANSLATE_PROBLEM_EVENT, type TranslateProblem } from '@/lib/useAutoTranslate';

// Shows why an admin form's UZ→EN/RU auto-translation didn't fill the other
// languages (quota exhausted, service blocked, timeout...). Mounted once in
// AdminShell; requestTranslation() dispatches the event.
export default function TranslateProblemToast() {
  const [problem, setProblem] = useState<TranslateProblem | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onProblem = (e: Event) => {
      setProblem((e as CustomEvent<TranslateProblem>).detail);
      setShowDetails(false);
      clearTimeout(timer);
      timer = setTimeout(() => setProblem(null), 15000);
    };
    window.addEventListener(TRANSLATE_PROBLEM_EVENT, onProblem);
    return () => {
      window.removeEventListener(TRANSLATE_PROBLEM_EVENT, onProblem);
      clearTimeout(timer);
    };
  }, []);

  if (!problem) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[420px] z-[200] bg-[#FFF7ED] border border-[#FDBA74] rounded-[4px] shadow-lg p-4 text-xs text-[#7C2D12]"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#EA580C]" />
        <div className="flex-1 space-y-1.5">
          <p className="font-semibold">Tarjima</p>
          <p className="leading-relaxed">{problem.message}</p>
          {problem.details && problem.details.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-[#BA4E25] font-semibold hover:underline cursor-pointer"
              >
                {showDetails ? 'Tafsilotlarni yashirish' : 'Tafsilotlar'}
              </button>
              {showDetails && (
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#9A3412]">
                  {problem.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setProblem(null)}
          aria-label="Yopish"
          className="text-[#9A3412] hover:text-[#7C2D12] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
