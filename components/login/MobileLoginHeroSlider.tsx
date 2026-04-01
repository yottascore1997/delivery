"use client";

import { useEffect, useState } from "react";

/** PNGs in `public/images/` — bg1.png … bg4.png (URLs /images/bg1.png …) */
const DEFAULT_SLIDES = [
  "/images/bg1.png",
  "/images/bg2.png",
  "/images/bg3.png",
  "/images/bg4.png",
] as const;

const INTERVAL_MS = 4200;

type Props = {
  slides?: readonly string[];
};

export function MobileLoginHeroSlider({ slides = DEFAULT_SLIDES }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [slides.length]);

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div
        className="relative aspect-[5/4] w-full overflow-hidden rounded-[1.75rem]"
        aria-hidden
      >
        {slides.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-700 ease-out"
            style={{ opacity: i === index ? 1 : 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="max-h-full max-w-full object-contain object-center"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/55"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
