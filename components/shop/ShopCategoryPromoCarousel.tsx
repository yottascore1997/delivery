"use client";

import Image from "next/image";
import Link from "next/link";
import type { ShopVerticalSlug } from "@/lib/shop-verticals";

export type CategoryPromoSlide = {
  id: string;
  headline: string;
  subline: string;
  cta: string;
  /** Future: set to CDN path; when set, gradient is ignored */
  imageUrl?: string | null;
  href?: string;
  /** CSS linear-gradient when no image */
  gradient: string;
  accent?: string;
};

const PROMOS_BY_VERTICAL: Record<ShopVerticalSlug, CategoryPromoSlide[]> = {
  grocery: [
    {
      id: "g1",
      headline: "Grab India's loved taste",
      subline: "Stock up on packs · limited time",
      cta: "Shop now",
      gradient: "linear-gradient(105deg, #ffdc00 0%, #ffdc00 52%, #e41e26 52.5%, #c41e3a 100%)",
      href: "#category-products",
    },
    {
      id: "g2",
      headline: "Daily essentials",
      subline: "Milk, bread & more from nearby stores",
      cta: "Explore",
      gradient: "linear-gradient(135deg, #fef3c7 0%, #f59e0b 45%, #ea580c 100%)",
      href: "#category-products",
    },
    {
      id: "g3",
      headline: "Big savings week",
      subline: "Combo deals on pantry favourites",
      cta: "View offers",
      gradient: "linear-gradient(120deg, #1e293b 0%, #334155 40%, #0f172a 100%)",
      accent: "#fff",
      href: "#category-products",
    },
  ],
  "fruits-vegetables": [
    {
      id: "fv1",
      headline: "Farm fresh today",
      subline: "Seasonal picks delivered quick",
      cta: "Shop now",
      gradient: "linear-gradient(105deg, #bbf7d0 0%, #4ade80 48%, #166534 48.5%, #14532d 100%)",
      href: "#category-products",
    },
    {
      id: "fv2",
      headline: "Greens & more",
      subline: "Wash-ready veggies from trusted sellers",
      cta: "Browse",
      gradient: "linear-gradient(135deg, #ecfccb 0%, #84cc16 50%, #3f6212 100%)",
      href: "#category-products",
    },
    {
      id: "fv3",
      headline: "Juicy fruits",
      subline: "Sweet deals on seasonal fruit",
      cta: "See all",
      gradient: "linear-gradient(120deg, #fef08a 0%, #facc15 45%, #ca8a04 100%)",
      href: "#category-products",
    },
  ],
  food: [
    {
      id: "f1",
      headline: "Cravings sorted",
      subline: "Hot meals & snacks near you",
      cta: "Order now",
      gradient: "linear-gradient(105deg, #ffedd5 0%, #fb923c 50%, #7c2d12 50.5%, #431407 100%)",
      href: "#category-products",
    },
    {
      id: "f2",
      headline: "Comfort food",
      subline: "Curated picks from local kitchens",
      cta: "Shop now",
      gradient: "linear-gradient(135deg, #fecaca 0%, #dc2626 55%, #7f1d1d 100%)",
      href: "#category-products",
    },
    {
      id: "f3",
      headline: "Beverages & more",
      subline: "Thirst quenchers on the way",
      cta: "Explore",
      gradient: "linear-gradient(120deg, #422006 0%, #92400e 50%, #fcd34d 100%)",
      accent: "#fffbeb",
      href: "#category-products",
    },
  ],
  electronics: [
    {
      id: "e1",
      headline: "Tech that fits",
      subline: "Gadgets & accessories · nearby stores",
      cta: "Shop now",
      gradient: "linear-gradient(105deg, #dbeafe 0%, #3b82f6 48%, #1e3a8a 48.5%, #172554 100%)",
      href: "#category-products",
    },
    {
      id: "e2",
      headline: "Smart picks",
      subline: "Cables, audio & daily tech",
      cta: "Browse",
      gradient: "linear-gradient(135deg, #e0e7ff 0%, #6366f1 50%, #312e81 100%)",
      href: "#category-products",
    },
    {
      id: "e3",
      headline: "Flash offers",
      subline: "Limited stock — check prices",
      cta: "View deals",
      gradient: "linear-gradient(120deg, #0f172a 0%, #1e293b 55%, #0ea5e9 100%)",
      accent: "#f0f9ff",
      href: "#category-products",
    },
  ],
};

function PromoCard({ slide }: { slide: CategoryPromoSlide }) {
  const fg = slide.accent ?? "#0f172a";
  const fgMuted = slide.accent ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.85)";

  const inner = slide.imageUrl ? (
    <div className="relative h-[9.25rem] w-full sm:h-[10rem]">
      <Image
        src={slide.imageUrl}
        alt={slide.headline}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 88vw, 360px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-3 right-16 z-[1] text-white">
        <p className="text-sm font-black leading-tight drop-shadow-sm sm:text-base">{slide.headline}</p>
        <p className="mt-0.5 text-[11px] font-semibold opacity-95 drop-shadow-sm">{slide.subline}</p>
      </div>
    </div>
  ) : (
    <div
      className="relative flex h-[9.25rem] w-full flex-col justify-between p-3 sm:h-[10rem] sm:p-4"
      style={{ background: slide.gradient }}
    >
      <div className="max-w-[58%] pr-1">
        <p className="text-[13px] font-black leading-snug sm:text-[15px]" style={{ color: fg }}>
          {slide.headline}
        </p>
        <p className="mt-1 text-[10px] font-bold leading-snug sm:text-[11px]" style={{ color: fgMuted }}>
          {slide.subline}
        </p>
      </div>
      <div>
        <span
          className="inline-flex rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md sm:text-[11px]"
          style={{
            backgroundColor: slide.accent ? "rgba(0,0,0,0.55)" : "#0f172a",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
          }}
        >
          {slide.cta}
        </span>
      </div>
      {/* Decorative “product” placeholder (dummy) */}
      <div
        className="pointer-events-none absolute bottom-2 right-3 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl opacity-95 shadow-lg sm:right-4 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-4xl"
        style={{
          background: "rgba(255,255,255,0.25)",
          border: "1px solid rgba(255,255,255,0.35)",
        }}
        aria-hidden
      >
        🛍️
      </div>
    </div>
  );

  const body = (
    <div className="relative overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.06]">
      {inner}
      <span className="absolute bottom-2 right-2 z-[2] rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        Ad
      </span>
    </div>
  );

  if (slide.href) {
    return (
      <Link href={slide.href} className="block w-full active:scale-[0.99]">
        {body}
      </Link>
    );
  }
  return body;
}

export function ShopCategoryPromoCarousel({ slug }: { slug: ShopVerticalSlug }) {
  const slides = PROMOS_BY_VERTICAL[slug];

  return (
    <section aria-label="Promotions" className="mb-4">
      <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-0.5 pt-0.5">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="w-[min(88vw,22rem)] shrink-0 snap-center sm:w-[min(72vw,24rem)]"
          >
            <PromoCard slide={slide} />
          </div>
        ))}
      </div>
    </section>
  );
}
