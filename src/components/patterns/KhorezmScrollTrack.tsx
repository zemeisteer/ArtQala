'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { usePathname } from 'next/navigation';

// Xiva Ustun Buramasi (to'lqinsimon spiral) — footer usti / bo'lim chegarasi.
// Pastga scroll qilganda lenta chapdan o'ngga uzluksiz oqadi.
export default function KhorezmScrollTrack() {
  const pathname = usePathname();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], [-140, 70]);

  // Purely decorative, sits right above the public footer — the admin
  // panel has neither.
  if (pathname.startsWith('/admin')) return null;

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden py-3 opacity-40 pointer-events-none select-none border-y border-[#dfd7c5]/50"
    >
      <motion.div style={{ x }} className="flex whitespace-nowrap">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="inline-flex items-center mx-4">
            <svg width="220" height="26" viewBox="0 0 220 26" fill="none">
              <path d="M0 13 Q 27 2, 55 13 T 110 13 T 165 13 T 220 13" stroke="#14201e" strokeWidth="1.2" fill="none" />
              <path d="M0 13 Q 27 24, 55 13 T 110 13 T 165 13 T 220 13" stroke="#c59b27" strokeWidth="0.8" fill="none" />
              <circle cx="55" cy="13" r="2.2" fill="#14201e" />
              <circle cx="110" cy="13" r="2.2" fill="#c59b27" />
              <circle cx="165" cy="13" r="2.2" fill="#14201e" />
            </svg>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
