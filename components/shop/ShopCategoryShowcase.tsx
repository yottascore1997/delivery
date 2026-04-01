"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import {
  MoodChipThumb,
  WhatsOnYourMindLayout,
} from "@/components/shop/WhatsOnYourMindLayout";

type ShopTreeSub = { id: string; name: string; imageUrl?: string | null };
type ShopTreeMain = { id: string; key: string; name: string; subcategories: ShopTreeSub[] };

const FALLBACK_MAIN_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80";

/** Rotate card styles (from previous static tiles) for visual variety. */
const CARD_STYLES = [
  {
    subtitle: "Browse collection",
    priceLine: "Shop now",
    cardGradient: "linear-gradient(155deg, #ecfdf5 0%, #d1fae5 35%, #a7f3d0 100%)",
    haloGradient: "radial-gradient(circle at 30% 30%, #6ee7b7 0%, #10b981 45%, #047857 100%)",
    priceClass: "text-emerald-800",
    ringClass: "ring-emerald-300/60",
    imgTilt: "-rotate-[7deg]" as const,
    glow: "rgba(16, 185, 129, 0.35)",
  },
  {
    subtitle: "Fresh picks",
    priceLine: "Explore",
    cardGradient: "linear-gradient(155deg, #f7fee7 0%, #ecfccb 40%, #d9f99d 100%)",
    haloGradient: "radial-gradient(circle at 30% 30%, #bef264 0%, #65a30d 50%, #3f6212 100%)",
    priceClass: "text-lime-900",
    ringClass: "ring-lime-300/70",
    imgTilt: "rotate-[8deg]" as const,
    glow: "rgba(101, 163, 13, 0.32)",
  },
  {
    subtitle: "Local favourites",
    priceLine: "Order now",
    cardGradient: "linear-gradient(155deg, #fff7ed 0%, #ffedd5 38%, #fdba74 100%)",
    haloGradient: "radial-gradient(circle at 30% 30%, #fb923c 0%, #ea580c 48%, #9a3412 100%)",
    priceClass: "text-orange-700",
    ringClass: "ring-orange-300/70",
    imgTilt: "-rotate-[6deg]" as const,
    glow: "rgba(234, 88, 12, 0.35)",
  },
  {
    subtitle: "Deals & more",
    priceLine: "View all",
    cardGradient: "linear-gradient(155deg, #eff6ff 0%, #bfdbfe 42%, #93c5fd 100%)",
    haloGradient: "radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)",
    priceClass: "text-blue-800",
    ringClass: "ring-blue-300/70",
    imgTilt: "rotate-[7deg]" as const,
    glow: "rgba(37, 99, 235, 0.32)",
  },
] as const;

const WHATS_ON_MIND = [
  {
    id: "biryani",
    label: "Biryani",
    image:
      "https://images.unsplash.com/photo-1701579231345-d7459c40919b?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "pizza",
    label: "Pizza",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "burger",
    label: "Burger",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "south-indian",
    label: "South Indian",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "chinese",
    label: "Chinese",
    image:
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "dosa",
    label: "Dosa",
    image:
      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "momos",
    label: "Momos",
    image:
      "https://images.unsplash.com/photo-1633945274309-2c16e7d74e7b?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "thali",
    label: "Thali",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "rolls",
    label: "Rolls",
    image:
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop&q=80",
  },
  {
    id: "dessert",
    label: "Dessert",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop&q=80",
  },
] as const;

function encodeMainKey(key: string) {
  return encodeURIComponent(key.trim());
}

function mainCoverImage(main: ShopTreeMain): string {
  const hit = main.subcategories.find((s) => s.imageUrl?.trim());
  if (hit?.imageUrl?.trim()) return hit.imageUrl.trim();
  return FALLBACK_MAIN_IMAGE;
}

function CategoryFeaturedCard({
  title,
  subtitle,
  priceLine,
  cardGradient,
  haloGradient,
  priceClass,
  ringClass,
  imgTilt,
  glow,
  image,
  imageAlt,
  href,
}: {
  title: string;
  subtitle: string;
  priceLine: string;
  cardGradient: string;
  haloGradient: string;
  priceClass: string;
  ringClass: string;
  imgTilt: string;
  glow: string;
  image: string;
  imageAlt: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`shop-category-showcase-card group relative block min-h-[184px] min-w-0 max-w-full snap-center overflow-hidden rounded-2xl border border-slate-200/90 shadow-md max-sm:w-[min(100%,calc(100vw-2rem))] max-sm:shrink-0 sm:min-h-[208px] sm:w-full ${ringClass}`}
      style={{
        background: cardGradient,
        boxShadow: `0 12px 32px -16px ${glow}, 0 4px 16px -6px rgba(0,0,0,0.08)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative z-10 grid min-h-[184px] min-w-0 grid-cols-[minmax(0,1fr)_minmax(7.25rem,36%)] sm:min-h-[208px] sm:grid-cols-[minmax(0,1fr)_minmax(8.5rem,38%)]">
        <div className="flex min-w-0 flex-col justify-center px-3 py-4 pb-11 pr-2 sm:px-4 sm:py-5 sm:pb-12">
          <span className="mb-1 inline-flex w-fit rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm ring-1 ring-black/5 sm:text-[10px]">
            Main category
          </span>
          <h3 className="font-display text-base font-black leading-tight tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-600 sm:text-sm">{subtitle}</p>
          <p
            className={`mt-1.5 inline-flex w-fit max-w-full rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-black shadow-sm ring-1 ring-black/5 sm:mt-2 sm:px-2.5 sm:py-1 sm:text-xs ${priceClass}`}
          >
            {priceLine}
          </p>
        </div>
        <div className="relative z-0 flex min-h-0 min-w-0 items-center justify-center px-1 py-3 sm:px-2 sm:py-4">
          <div
            className="flex aspect-square w-full max-w-[7.25rem] shrink-0 items-center justify-center rounded-full shadow-lg ring-4 ring-white/90 sm:max-w-[8.75rem]"
            style={{
              background: haloGradient,
              boxShadow: `inset 0 2px 16px rgba(255,255,255,0.3), 0 12px 28px -10px ${glow}`,
            }}
          >
            <div
              className={`relative aspect-square w-[70%] overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white transition-transform duration-500 ease-out group-hover:rotate-0 group-hover:scale-105 ${imgTilt}`}
            >
              <Image
                src={image}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) 112px, 132px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
      <span className="absolute bottom-2.5 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-md ring-1 ring-white/40 sm:bottom-3 sm:left-3.5 sm:px-3 sm:py-1.5 sm:text-[10px]">
        Open
        <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}

export function ShopCategoryShowcase() {
  const featuredRef = useRef<HTMLDivElement>(null);
  const [mains, setMains] = useState<ShopTreeMain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await api<{ mains: ShopTreeMain[] }>("/api/master/shop-tree");
      setLoading(false);
      if (res.ok && res.data?.mains) setMains(res.data.mains);
      else setMains([]);
    })();
  }, []);

  function scrollByDir(dir: -1 | 1) {
    const el = featuredRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 280) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="shop-categories-heading">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2
            id="shop-categories-heading"
            className="font-display mt-2 bg-gradient-to-r from-[#b91c2c] via-[#ea580c] to-[#d97706] bg-clip-text text-[1.35rem] font-black tracking-tight text-transparent sm:text-[1.65rem]"
          >
            Shop by category
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
            Main categories from your catalog — tap a subcategory to see products.
          </p>
        </div>
        <div className="hidden shrink-0 gap-1.5 sm:flex">
          <button
            type="button"
            aria-label="Scroll categories left"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => scrollByDir(-1)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll categories right"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] backdrop-blur-sm transition hover:border-orange-200 hover:bg-orange-50/90 hover:text-orange-600"
            onClick={() => scrollByDir(1)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200/90" />
          ))}
        </div>
      ) : mains.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm font-medium text-slate-600">
          No main categories yet. Add them in Admin → master catalog, then subcategories under each.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            {mains.map((m, i) => (
              <Link
                key={m.id}
                href={`/shop/category/${encodeMainKey(m.key)}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={mainCoverImage(m)}
                    alt={m.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 240px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="truncate text-xs font-black text-white">{m.name}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-white/85">
                      {m.subcategories.length} subcategor{m.subcategories.length === 1 ? "y" : "ies"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div
            ref={featuredRef}
            className="scrollbar-hide -mx-1 hidden snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 pt-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&>*]:min-w-0"
          >
            {mains.map((m, i) => {
              const st = CARD_STYLES[i % CARD_STYLES.length];
              return (
                <CategoryFeaturedCard
                  key={m.id}
                  href={`/shop/category/${encodeMainKey(m.key)}`}
                  title={m.name}
                  subtitle={st.subtitle}
                  priceLine={`${m.subcategories.length} sub · ${st.priceLine}`}
                  cardGradient={st.cardGradient}
                  haloGradient={st.haloGradient}
                  priceClass={st.priceClass}
                  ringClass={st.ringClass}
                  imgTilt={st.imgTilt}
                  glow={st.glow}
                  image={mainCoverImage(m)}
                  imageAlt={m.name}
                />
              );
            })}
          </div>

          <div className="mt-10 space-y-8">
            {mains.map((main) => (
              <div key={main.id} className="rounded-2xl border border-slate-200/90 bg-white/60 p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="font-display text-lg font-black text-slate-900 sm:text-xl">{main.name}</h3>
                  <Link
                    href={`/shop/category/${encodeMainKey(main.key)}`}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 sm:text-sm"
                  >
                    See all →
                  </Link>
                </div>
                {main.subcategories.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-slate-500">No subcategories under this main yet.</p>
                ) : (
                  <div className="scrollbar-hide mt-4 flex gap-2.5 overflow-x-auto pb-1 pt-0.5">
                    {main.subcategories.map((s) => (
                      <Link
                        key={s.id}
                        href={`/shop/category/${encodeMainKey(main.key)}/sub/${s.id}?subname=${encodeURIComponent(s.name)}`}
                        className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 p-2 transition hover:border-emerald-300 hover:bg-emerald-50/50 sm:w-[5.5rem]"
                      >
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 sm:h-16 sm:w-16">
                          {s.imageUrl?.trim() ? (
                            <Image src={s.imageUrl.trim()} alt="" fill className="object-cover" sizes="64px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl">🛍️</div>
                          )}
                        </div>
                        <span className="line-clamp-2 w-full text-center text-[10px] font-extrabold leading-tight text-slate-800 sm:text-[11px]">
                          {s.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <WhatsOnYourMindLayout className="mt-12">
        <div className="mt-6 grid grid-cols-5 gap-2.5 sm:gap-4">
          {WHATS_ON_MIND.slice(0, 10).map((item) => (
            <Link
              key={item.id}
              href="#stores-near-you"
              className="shop-mood-chip group flex w-full flex-col items-center gap-2"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/90 shadow-md ring-1 ring-black/10">
                <MoodChipThumb src={item.image} label={item.label} />
              </div>
              <span className="max-w-full text-center text-[11px] font-extrabold leading-tight text-slate-800 sm:text-sm">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </WhatsOnYourMindLayout>
    </section>
  );
}
