"use client";

import Image from "next/image";
import Link from "next/link";
import { isShopVerticalSlug, type ShopVerticalSlug } from "@/lib/shop-verticals";

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
      imageUrl: "/images/electro.PNG",
      gradient: "linear-gradient(105deg, #dbeafe 0%, #3b82f6 48%, #1e3a8a 48.5%, #172554 100%)",
      href: "#category-products",
    },
    {
      id: "e2",
      headline: "Smart picks",
      subline: "Cables, audio & daily tech",
      cta: "Browse",
      imageUrl: "/images/electro.PNG",
      gradient: "linear-gradient(135deg, #fff7ed 0%, #fb923c 52%, #c2410c 100%)",
      href: "#category-products",
    },
    {
      id: "e3",
      headline: "Flash offers",
      subline: "Limited stock — check prices",
      cta: "View deals",
      imageUrl: "/images/electro.PNG",
      gradient: "linear-gradient(120deg, #2a0a16 0%, #831843 52%, #f472b6 100%)",
      accent: "#f0f9ff",
      href: "#category-products",
    },
  ],
  fashion: [
    {
      id: "fa1",
      headline: "Style that fits",
      subline: "Trending apparel from nearby stores",
      cta: "Shop now",
      gradient: "linear-gradient(105deg, #fce7f3 0%, #f472b6 48%, #9d174d 48.5%, #4c0519 100%)",
      href: "#category-products",
    },
    {
      id: "fa2",
      headline: "New season drops",
      subline: "Dresses, tops & everyday wear",
      cta: "Browse",
      gradient: "linear-gradient(135deg, #faf5ff 0%, #c084fc 50%, #6b21a8 100%)",
      href: "#category-products",
    },
    {
      id: "fa3",
      headline: "Wardrobe refresh",
      subline: "Curated looks · quick delivery",
      cta: "Explore",
      gradient: "linear-gradient(120deg, #fff1f2 0%, #fb7185 45%, #9f1239 100%)",
      accent: "#fff1f2",
      href: "#category-products",
    },
  ],
  footwear: [
    {
      id: "fw1",
      headline: "Step in style",
      subline: "Sneakers, sandals & more near you",
      cta: "Shop now",
      gradient: "linear-gradient(105deg, #e0e7ff 0%, #6366f1 48%, #312e81 48.5%, #1e1b4b 100%)",
      href: "#category-products",
    },
    {
      id: "fw2",
      headline: "Comfort first",
      subline: "Daily pairs for work & weekend",
      cta: "Browse",
      gradient: "linear-gradient(135deg, #fef3c7 0%, #d97706 50%, #78350f 100%)",
      href: "#category-products",
    },
    {
      id: "fw3",
      headline: "Fresh soles",
      subline: "Sports & casual footwear deals",
      cta: "View all",
      gradient: "linear-gradient(120deg, #ecfdf5 0%, #14b8a6 45%, #134e4a 100%)",
      href: "#category-products",
    },
  ],
};

function PromoCard({ slide }: { slide: CategoryPromoSlide }) {
  const fg = slide.accent ?? "#0f172a";
  const fgMuted = slide.accent ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.85)";
  const wantsLightText = Boolean(slide.accent);

  const inner = slide.imageUrl ? (
    <div className="grid h-[9.25rem] w-full grid-cols-2 sm:h-[10rem] saturate-150">
      {/* Left: text (half) */}
      <div
        className="relative flex min-w-0 flex-col justify-between p-3 sm:p-4"
        style={{ background: slide.gradient }}
      >
        {/* Contrast layer (keeps text readable on bright gradients) */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/20 via-black/5 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-full bg-white/15 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_45%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-3 top-3 h-px w-16 bg-gradient-to-r from-white/40 via-white/10 to-transparent"
          aria-hidden
        />

        <div className="relative z-[1] min-w-0">
          <span
            className="inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] shadow-sm ring-1 ring-white/30 backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
              color: wantsLightText ? "rgba(255,255,255,0.9)" : "#ffffff",
            }}
          >
            Featured
          </span>
          <p className="mt-2 text-sm font-black leading-tight text-white drop-shadow-sm sm:text-base">
            {slide.headline}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-white/85 drop-shadow-sm sm:text-[12px]">
            {slide.subline}
          </p>
        </div>
        <div className="min-w-0">
        </div>
        <div className="relative z-[1]">
          <span className="inline-flex rounded-lg bg-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md ring-1 ring-white/25 backdrop-blur-sm sm:text-[11px]">
            {slide.cta}
          </span>
        </div>
      </div>

      {/* Right: image (half) */}
      <div className="relative h-full w-full">
        <Image
          src={slide.imageUrl}
          alt={slide.headline}
          fill
          className="object-cover contrast-110 saturate-125"
          sizes="(max-width: 640px) 44vw, 180px"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/0 via-transparent to-black/25" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-black/[0.06]" aria-hidden />
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

export function ShopCategoryPromoCarousel({ slug }: { slug: string }) {
  const v: ShopVerticalSlug = isShopVerticalSlug(slug) ? slug : "grocery";
  const slides = PROMOS_BY_VERTICAL[v];

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
