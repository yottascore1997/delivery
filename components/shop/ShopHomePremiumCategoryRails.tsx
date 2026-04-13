"use client";

import Image from "next/image";
import Link from "next/link";
import { shopCategoryPathKeyFromMainKey } from "@/lib/shop-category-path";

type MainSub = { id: string; name: string; imageUrl?: string | null };
type MainBrief = { id: string; key: string; name: string; subcategories: MainSub[] };

const SUBTITLES = [
  "Handpicked seasonal finds",
  "Neighbourhood favourites",
  "Quick restock picks",
  "Top-rated nearby",
  "Fresh picks today",
  "Popular right now",
  "Curated for you",
  "Stores nearby",
];

const THEMES = [
  {
    shell:
      "bg-gradient-to-br from-emerald-200 via-teal-200 to-cyan-200 [background-size:200%_200%]",
    border: "border-emerald-400/80 ring-1 ring-emerald-100/70",
    kicker: "text-emerald-900",
    decorBar: "from-emerald-600 via-teal-500 to-cyan-500",
    title: "text-emerald-950",
    sub: "text-emerald-900/70",
    spotlight:
      "border-emerald-200/90 bg-gradient-to-br from-white/95 to-emerald-50/95 shadow-[0_16px_40px_-12px_rgba(5,80,60,0.28)] backdrop-blur-sm ring-1 ring-white/80",
    add: "border-2 border-emerald-600 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50",
    bar: "bg-emerald-950/[0.06] text-emerald-950 ring-1 ring-emerald-900/10",
    meta: "text-emerald-800/80",
    pill: "border-emerald-200/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(5,80,60,0.22)] ring-1 ring-white/80 backdrop-blur-sm",
    cardRing: "ring-emerald-900/[0.06] shadow-[0_14px_36px_-18px_rgba(15,23,42,0.2)]",
  },
  {
    shell:
      "bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 [background-size:200%_200%]",
    border: "border-orange-400/80 ring-1 ring-amber-100/70",
    kicker: "text-orange-950",
    decorBar: "from-amber-600 via-orange-500 to-rose-500",
    title: "text-[#7c2d12]",
    sub: "text-amber-900/68",
    spotlight:
      "border-amber-200/90 bg-gradient-to-br from-white/95 to-amber-50/95 shadow-[0_16px_40px_-12px_rgba(180,83,9,0.28)] backdrop-blur-sm ring-1 ring-white/80",
    add: "border-2 border-orange-600 bg-white text-orange-700 shadow-sm hover:bg-orange-50",
    bar: "bg-orange-950/[0.06] text-orange-950 ring-1 ring-orange-900/10",
    meta: "text-orange-900/75",
    pill: "border-amber-200/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(180,83,9,0.2)] ring-1 ring-white/80 backdrop-blur-sm",
    cardRing: "ring-orange-900/[0.06] shadow-[0_14px_36px_-18px_rgba(124,45,18,0.18)]",
  },
  {
    shell:
      "bg-gradient-to-br from-sky-200 via-blue-200 to-indigo-200 [background-size:200%_200%]",
    border: "border-blue-400/80 ring-1 ring-sky-100/70",
    kicker: "text-indigo-950",
    decorBar: "from-sky-600 via-blue-600 to-indigo-500",
    title: "text-indigo-950",
    sub: "text-indigo-900/65",
    spotlight:
      "border-sky-200/90 bg-gradient-to-br from-white/95 to-sky-50/95 shadow-[0_16px_40px_-12px_rgba(30,58,138,0.22)] backdrop-blur-sm ring-1 ring-white/80",
    add: "border-2 border-blue-600 bg-white text-blue-700 shadow-sm hover:bg-blue-50",
    bar: "bg-indigo-950/[0.06] text-indigo-950 ring-1 ring-indigo-900/10",
    meta: "text-sky-800/80",
    pill: "border-sky-200/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(30,64,175,0.18)] ring-1 ring-white/80 backdrop-blur-sm",
    cardRing: "ring-indigo-900/[0.06] shadow-[0_14px_36px_-18px_rgba(30,27,75,0.2)]",
  },
  {
    shell:
      "bg-gradient-to-br from-violet-200 via-fuchsia-200 to-purple-200 [background-size:200%_200%]",
    border: "border-violet-400/80 ring-1 ring-violet-100/70",
    kicker: "text-violet-950",
    decorBar: "from-violet-600 via-fuchsia-600 to-purple-500",
    title: "text-violet-950",
    sub: "text-violet-900/65",
    spotlight:
      "border-violet-200/90 bg-gradient-to-br from-white/95 to-violet-50/95 shadow-[0_16px_40px_-12px_rgba(91,33,182,0.22)] backdrop-blur-sm ring-1 ring-white/80",
    add: "border-2 border-violet-600 bg-white text-violet-700 shadow-sm hover:bg-violet-50",
    bar: "bg-violet-950/[0.06] text-violet-950 ring-1 ring-violet-900/10",
    meta: "text-violet-800/75",
    pill: "border-violet-200/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(91,33,182,0.18)] ring-1 ring-white/80 backdrop-blur-sm",
    cardRing: "ring-violet-900/[0.06] shadow-[0_14px_36px_-18px_rgba(76,29,149,0.2)]",
  },
  {
    shell:
      "bg-gradient-to-br from-rose-200 via-pink-200 to-orange-200 [background-size:200%_200%]",
    border: "border-rose-400/80 ring-1 ring-rose-100/70",
    kicker: "text-rose-950",
    decorBar: "from-rose-600 via-pink-600 to-orange-500",
    title: "text-rose-950",
    sub: "text-rose-900/65",
    spotlight:
      "border-rose-200/90 bg-gradient-to-br from-white/95 to-rose-50/95 shadow-[0_16px_40px_-12px_rgba(190,18,60,0.18)] backdrop-blur-sm ring-1 ring-white/80",
    add: "border-2 border-rose-600 bg-white text-rose-700 shadow-sm hover:bg-rose-50",
    bar: "bg-rose-950/[0.06] text-rose-950 ring-1 ring-rose-900/10",
    meta: "text-rose-900/72",
    pill: "border-rose-200/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(190,18,60,0.15)] ring-1 ring-white/80 backdrop-blur-sm",
    cardRing: "ring-rose-900/[0.06] shadow-[0_14px_36px_-18px_rgba(136,19,55,0.16)]",
  },
  {
    shell:
      "bg-gradient-to-br from-slate-300 via-zinc-200 to-slate-400 [background-size:200%_200%]",
    border: "border-slate-500/60 ring-1 ring-slate-200/70",
    kicker: "text-slate-900",
    decorBar: "from-slate-700 via-zinc-700 to-slate-800",
    title: "text-slate-900",
    sub: "text-slate-600",
    spotlight:
      "border-slate-200/90 bg-gradient-to-br from-white/95 to-slate-50/95 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)] backdrop-blur-sm ring-1 ring-white/80",
    add: "border-2 border-slate-800 bg-white text-slate-900 shadow-sm hover:bg-slate-50",
    bar: "bg-slate-900/[0.06] text-slate-900 ring-1 ring-slate-900/10",
    meta: "text-slate-600",
    pill: "border-slate-200/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.14)] ring-1 ring-white/80 backdrop-blur-sm",
    cardRing: "ring-slate-900/[0.08] shadow-[0_14px_36px_-18px_rgba(15,23,42,0.18)]",
  },
] as const;

function encodeCategorySlug(key: string) {
  return encodeURIComponent(key.trim());
}

function normMainKey(key: string) {
  return key.toLowerCase().replace(/\s+/g, "-").trim();
}

/** Theme + subtitle by catalog key so Beverages / Food / … each feel distinct (not random by index). */
function themeIndexForMain(mainKey: string): number {
  const k = normMainKey(mainKey);
  if (k.includes("beverage") || k.includes("drink") || k === "beverages") return 2;
  if (k.includes("food") || k.includes("meal") || k === "food-beverages") return 1;
  if (k.includes("grocery") || k.includes("essential") || k.includes("daily") || k.includes("pantry"))
    return 0;
  if (k.includes("fruit") || k.includes("vegetable") || k.includes("produce") || k.includes("sabzi"))
    return 0;
  if (k.includes("electronic") || k.includes("mobile") || k.includes("gadget")) return 5;
  if (k.includes("house") || k.includes("clean") || k.includes("laundry")) return 3;
  if (k.includes("personal") || k.includes("beauty") || k.includes("care") || k.includes("cosmetic"))
    return 4;
  if (k.includes("snack") || k.includes("frozen") || k.includes("dairy")) return 1;
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return h % THEMES.length;
}

function subtitleForMain(mainKey: string, fallbackIdx: number): string {
  const k = normMainKey(mainKey);
  if (k.includes("beverage") || k.includes("drink")) return "Chilled drinks & more";
  if (k.includes("food") || k.includes("meal") || k === "food-beverages")
    return "Handpicked seasonal finds";
  if (k.includes("grocery") || k.includes("essential") || k.includes("daily"))
    return "Pantry staples & daily needs";
  if (k.includes("fruit") || k.includes("vegetable")) return "Farm-fresh picks";
  if (k.includes("electronic")) return "Smart gadgets & accessories";
  if (k.includes("house")) return "Home care essentials";
  return SUBTITLES[fallbackIdx % SUBTITLES.length];
}

export function ShopHomePremiumCategoryRails({ mains }: { mains: MainBrief[] }) {
  if (mains.length === 0) return null;

  return (
    <div className="mt-10 space-y-8 sm:space-y-10">
      {mains.map((row, idx) => {
        const ti = themeIndexForMain(row.key);
        const th = THEMES[ti];
        const pathSlug = shopCategoryPathKeyFromMainKey(row.key);
        const href = `/shop/category/${encodeCategorySlug(pathSlug)}`;
        const subs = row.subcategories.slice(0, 10);
        const subtitle = subtitleForMain(row.key, idx);

        return (
          <div
            key={row.id}
            className={`relative overflow-hidden rounded-[1.85rem] border p-4 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.28)] transition-[box-shadow] duration-500 hover:shadow-[0_32px_90px_-30px_rgba(15,23,42,0.32)] sm:rounded-[2rem] sm:p-6 ${th.shell} ${th.border}`}
          >
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-white/40 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-white/25 blur-3xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3 sm:gap-6">
              <div className="min-w-0 flex-1 pr-1">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${th.kicker}`}>
                  Premium collection
                </p>
                <div className={`mt-2.5 h-1 w-14 rounded-full bg-gradient-to-r ${th.decorBar} shadow-sm`} />
                <h3
                  className={`font-display mt-3 text-[1.38rem] font-black leading-[1.1] tracking-tight sm:mt-3.5 sm:text-[1.65rem] ${th.title}`}
                >
                  {row.name}
                </h3>
                <p className={`mt-1.5 font-serif text-[13px] font-medium leading-snug sm:text-[0.95rem] ${th.sub}`}>
                  {subtitle}
                </p>
              </div>
            </div>

            {subs.length === 0 ? (
              <div className="relative z-[1] mt-6 rounded-[1.35rem] border border-dashed border-slate-300/70 bg-gradient-to-br from-white/70 via-white/40 to-white/20 px-4 py-12 text-center shadow-inner backdrop-blur-sm">
                <p className="text-sm font-semibold text-slate-600">No subcategories added yet.</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">Open this main category to browse all items.</p>
                <Link
                  href={href}
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black underline-offset-2 ring-1 transition hover:underline ${th.pill}`}
                >
                  Browse {row.name}
                </Link>
              </div>
            ) : (
              <div className="scrollbar-hide relative z-[1] mt-6 flex gap-3 overflow-x-auto pb-1.5 pt-0.5 [-webkit-overflow-scrolling:touch]">
                {subs.map((sub, pi) => {
                  const subHref = `${href}/sub/${encodeCategorySlug(sub.id)}`;
                return (
                  <div
                    key={sub.id}
                    className="group/card relative w-[126px] shrink-0 sm:w-[136px]"
                  >
                    <div
                      className={`relative overflow-hidden rounded-[1.25rem] border border-white/95 bg-white ring-1 transition-shadow duration-300 hover:shadow-xl ${th.cardRing}`}
                    >
                      <div className="relative aspect-square w-full bg-gradient-to-br from-slate-50 to-slate-100/80">
                        <Link
                          href={subHref}
                          className="block h-full w-full overflow-hidden"
                        >
                            {sub.imageUrl ? (
                              <Image
                                src={sub.imageUrl}
                                alt={sub.name}
                                fill
                                sizes="(max-width: 640px) 126px, 136px"
                                className="object-cover transition duration-500 ease-out group-hover/card:scale-[1.06]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white to-slate-100 text-4xl font-black text-slate-400">
                                {sub.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                        </Link>
                        {pi < 2 ? (
                          <span className="pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded-md bg-white/95 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-slate-900 shadow-md ring-1 ring-black/[0.06] sm:text-[8px]">
                            Must try
                          </span>
                        ) : null}
                        <div className="absolute bottom-2 right-2 z-[4] rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
                          Open
                        </div>
                      </div>
                      <div className="space-y-1.5 px-2.5 pb-2.5 pt-1.5">
                        <p className={`truncate text-[10px] font-bold uppercase tracking-wide ${th.meta}`}>
                          Subcategory
                        </p>
                        <Link
                          href={subHref}
                          className="line-clamp-2 min-h-[2.25rem] text-[11px] font-extrabold leading-tight text-slate-900"
                        >
                          {sub.name}
                        </Link>
                        <p className="text-[10px] font-semibold text-slate-500">
                          Explore products in this lane
                        </p>
                      </div>
                    </div>
                    <Link
                      href={subHref}
                      className="mt-2.5 flex w-full items-center justify-between rounded-xl bg-red-600 px-2.5 py-2 text-left text-[10px] font-extrabold text-white transition hover:bg-red-700"
                    >
                      <span>Browse products</span>
                      <svg className="h-3.5 w-3.5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
              </div>
            )}

            <Link
              href={href}
              className="relative z-[1] mt-6 flex w-full items-center justify-between gap-2.5 rounded-full border border-emerald-600/80 bg-emerald-500 px-3 py-2.5 text-white shadow-md transition duration-300 hover:bg-emerald-600 active:scale-[0.99] sm:px-4"
            >
              <div className="flex -space-x-2">
                {row.subcategories.slice(0, 3).map((t, ti) => (
                  <div
                    key={t.id}
                    className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md ring-1 ring-black/[0.07]"
                    style={{ zIndex: 3 - ti }}
                  >
                    {t.imageUrl ? (
                      <Image
                        src={t.imageUrl}
                        alt={t.name}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-slate-500">
                        {t.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="flex flex-1 items-center justify-end gap-1.5 text-xs font-black tracking-tight text-white sm:text-[13px]">
                See all subcategories
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
