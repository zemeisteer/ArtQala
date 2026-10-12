'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

interface ServiceImageCarouselProps {
  images: string[];
  fallbackSrc: string;
  alt: string;
}

// Rotates through real gallery photos for a service category; falls back to
// a static placeholder when no matching artwork images exist yet.
export default function ServiceImageCarousel({ images, fallbackSrc, alt }: ServiceImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const hasImages = images.length > 0;

  useEffect(() => {
    if (!hasImages || images.length < 2) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [hasImages, images.length]);

  const src = hasImages ? images[index] : fallbackSrc;

  return (
    <div className="w-full h-full relative">
      <AnimatePresence mode="sync">
        <motion.div
          key={src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image
            src={src}
            alt={alt}
            fill
            // full width on phones, half the 1240px container from md up
            sizes="(max-width: 768px) 100vw, 620px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
