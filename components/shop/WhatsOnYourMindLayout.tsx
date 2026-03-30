"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

/**
 * Same visual shell as shop home “What’s on your mind?” (ShopCategoryShowcase).
 */
export function WhatsOnYourMindLayout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white via-slate-50/95 to-orange-50/40 p-5 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-900/[0.04] backdrop-blur-[2px] sm:p-7 ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-amber-200/25 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              id="whats-on-your-mind"
              className="font-display text-xl font-black tracking-tight text-slate-900 sm:text-2xl"
            >
              What&apos;s on your mind?
            </h3>
            <p className="mt-1.5 text-sm font-medium text-slate-600">
              India&apos;s most ordered —{" "}
              <span className="font-bold text-orange-600">tap &amp; explore</span>
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Square mood image — same behavior as home static chips; supports remote product photos. */
export function MoodChipThumb({
  src,
  label,
}: {
  src: string | null | undefined;
  label: string;
}) {
  const [broken, setBroken] = useState(false);
  const clean = src?.trim();
  if (!clean || broken) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-200 font-display text-3xl font-black text-orange-900/70 sm:text-4xl"
        aria-hidden
      >
        {label.charAt(0) || "?"}
      </div>
    );
  }
  return (
    <Image
      src={clean}
      alt=""
      fill
      sizes="(max-width: 640px) 128px, (max-width: 1024px) 144px, 160px"
      className="object-cover transition duration-300 group-hover:scale-110"
      onError={() => setBroken(true)}
    />
  );
}
