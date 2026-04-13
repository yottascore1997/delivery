"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getToken } from "@/lib/client-api";
import { addToShopCart, getShopCart, updateShopLineQty } from "@/lib/shop-cart";
import { ProductThumb } from "@/components/shop/shop-visual";
import { shopCategoryPathKeyFromMainKey } from "@/lib/shop-category-path";
import { DELIVERY_ADDRESS_UPDATED_EVENT } from "@/lib/shop-delivery-address";

const DEFAULT_LAT = 28.4595;
const DEFAULT_LNG = 77.0266;

/** Every main from catalog gets a rail (no cap). */
const PRODUCTS_PER_RAIL = 8;

type MainBrief = { id: string; key: string; name: string };

type RailProduct = {
  id: string;
  name: string;
  price: number;
  mrp?: number | null;
  discountPercent?: number | null;
  stock: number;
  imageUrl?: string | null;
  unitLabel?: string | null;
  store: {
    id: string;
    name: string;
    distanceKm: number;
    etaMin: number;
    openingHours?: { enabled: boolean; isOpenNow: boolean };
  };
};

type RailRow = { main: MainBrief; products: RailProduct[] };

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
      "bg-gradient-to-br from-emerald-50/95 via-teal-50 to-cyan-50/80 [background-size:200%_200%]",
    border: "border-emerald-200/80 ring-1 ring-white/70",
    kicker: "text-emerald-800/65",
    decorBar: "from-emerald-400 via-teal-400 to-cyan-300",
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
      "bg-gradient-to-br from-amber-50/95 via-orange-50 to-rose-50/70 [background-size:200%_200%]",
    border: "border-amber-200/80 ring-1 ring-white/70",
    kicker: "text-amber-900/60",
    decorBar: "from-amber-400 via-orange-400 to-rose-300",
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
      "bg-gradient-to-br from-sky-50/95 via-blue-50 to-indigo-100/75 [background-size:200%_200%]",
    border: "border-sky-200/80 ring-1 ring-white/70",
    kicker: "text-indigo-800/60",
    decorBar: "from-sky-400 via-blue-500 to-indigo-400",
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
      "bg-gradient-to-br from-violet-50/95 via-fuchsia-50 to-purple-100/70 [background-size:200%_200%]",
    border: "border-violet-200/75 ring-1 ring-white/70",
    kicker: "text-violet-800/60",
    decorBar: "from-violet-400 via-fuchsia-500 to-purple-400",
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
      "bg-gradient-to-br from-rose-50/95 via-pink-50 to-orange-50/75 [background-size:200%_200%]",
    border: "border-rose-200/75 ring-1 ring-white/70",
    kicker: "text-rose-800/58",
    decorBar: "from-rose-400 via-pink-400 to-orange-300",
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
      "bg-gradient-to-br from-slate-100/95 via-zinc-50 to-slate-200/80 [background-size:200%_200%]",
    border: "border-slate-200/85 ring-1 ring-white/80",
    kicker: "text-slate-600",
    decorBar: "from-slate-400 via-zinc-500 to-slate-600",
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
  const [rails, setRails] = useState<RailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});

  const sliceMains = useMemo(() => mains, [mains]);

  const syncCart = useCallback(() => {
    const m: Record<string, number> = {};
    for (const l of getShopCart()) m[l.productId] = l.quantity;
    setCartQty(m);
  }, []);

  useEffect(() => {
    syncCart();
    window.addEventListener("dlf-cart", syncCart);
    return () => window.removeEventListener("dlf-cart", syncCart);
  }, [syncCart]);

  const loadRails = useCallback(
    async (lat: number, lng: number) => {
      if (sliceMains.length === 0) {
        setRails([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const rows = await Promise.all(
        sliceMains.map(async (main) => {
          const mk = main.key.trim();
          const q = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            radiusKm: "60",
            limit: String(PRODUCTS_PER_RAIL + 4),
            vertical: mk,
            mainKey: mk,
          });
          const r = await api<{ products: RailProduct[] }>(`/api/shop/category-quick?${q}`);
          const products =
            r.ok && r.data?.products ? r.data.products.slice(0, PRODUCTS_PER_RAIL) : [];
          return { main, products };
        }),
      );
      setRails(rows);
      setLoading(false);
    },
    [sliceMains],
  );

  useEffect(() => {
    async function boot() {
      const token = getToken();
      if (!token) {
        await loadRails(DEFAULT_LAT, DEFAULT_LNG);
        return;
      }
      const addr = await api<{ address: { latitude: number; longitude: number } | null }>(
        "/api/user/address",
      );
      const la =
        addr.ok && addr.data?.address ? addr.data.address.latitude : DEFAULT_LAT;
      const ln =
        addr.ok && addr.data?.address ? addr.data.address.longitude : DEFAULT_LNG;
      await loadRails(la, ln);
    }
    void boot();
    function onAddr() {
      void boot();
    }
    window.addEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddr);
    return () => window.removeEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddr);
  }, [loadRails]);

  function qty(id: string) {
    return cartQty[id] ?? 0;
  }

  function addOne(p: RailProduct) {
    const closed =
      Boolean(p.store.openingHours?.enabled) && p.store.openingHours?.isOpenNow === false;
    if (closed || p.stock < 1) return;
    addToShopCart({
      productId: p.id,
      storeId: p.store.id,
      name: p.name,
      imageUrl: p.imageUrl ?? null,
      price: p.price,
      quantity: 1,
      ...(p.unitLabel?.trim() ? { unitLabel: p.unitLabel.trim() } : {}),
    });
  }

  if (sliceMains.length === 0) return null;

  if (loading) {
    return (
      <div className="mt-10 space-y-7">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-[1.85rem] border border-slate-200/70 bg-gradient-to-br from-slate-100 via-white to-slate-50 p-5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.2)] ring-1 ring-white/80 sm:p-6"
          >
            <div className="h-2.5 w-24 rounded-full bg-slate-200/90" />
            <div className="mt-3 h-7 w-48 max-w-[70%] rounded-lg bg-slate-200/85" />
            <div className="mt-2 h-3.5 w-40 rounded-md bg-slate-200/70" />
            <div className="mt-6 flex gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="h-48 w-[148px] shrink-0 rounded-[1.25rem] bg-gradient-to-b from-slate-200/90 to-slate-100/80 shadow-inner sm:w-[158px]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8 sm:space-y-10">
      {rails.map((row, idx) => {
        const ti = themeIndexForMain(row.main.key);
        const th = THEMES[ti];
        const pathSlug = shopCategoryPathKeyFromMainKey(row.main.key);
        const href = `/shop/category/${encodeCategorySlug(pathSlug)}`;
        const spotlight = row.products[0];
        const thumbs = row.products.slice(0, 3);
        const recipeHint = Math.min(Math.max(3, row.products.length + 2), 9);
        const subtitle = subtitleForMain(row.main.key, idx);

        return (
          <div
            key={row.main.id}
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
            <div className="relative flex flex-row items-start justify-between gap-3 sm:gap-6">
              <div className="min-w-0 flex-1 pr-1">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${th.kicker}`}>
                  Curated nearby
                </p>
                <div className={`mt-2.5 h-1 w-14 rounded-full bg-gradient-to-r ${th.decorBar} shadow-sm`} />
                <h3
                  className={`font-display mt-3 text-[1.38rem] font-black leading-[1.1] tracking-tight sm:mt-3.5 sm:text-[1.65rem] ${th.title}`}
                >
                  {row.main.name}
                </h3>
                <p className={`mt-1.5 font-serif text-[13px] font-medium leading-snug sm:text-[0.95rem] ${th.sub}`}>
                  {subtitle}
                </p>
              </div>
              {spotlight ? (
                <Link
                  href={`/shop/product/${spotlight.id}`}
                  className={`relative z-[1] flex max-w-[min(46%,11rem)] shrink-0 items-center gap-2 rounded-2xl border p-2 pr-2.5 transition duration-300 hover:brightness-[1.03] sm:max-w-[220px] sm:gap-3 sm:p-2.5 sm:pr-3 ${th.spotlight}`}
                >
                  <div className="relative -mb-1 -mt-0.5 h-14 w-14 shrink-0 overflow-visible sm:-mb-2 sm:-mt-1 sm:h-[4.5rem] sm:w-[4.5rem]">
                    <div className="relative h-[4.25rem] w-[4.25rem] -translate-y-0.5 overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/90 sm:h-[4.75rem] sm:w-[4.75rem] sm:-translate-y-1">
                      <ProductThumb
                        name={spotlight.name}
                        imageUrl={spotlight.imageUrl}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="line-clamp-2 text-xs font-extrabold leading-snug text-slate-900">
                      {spotlight.name}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      ₹{spotlight.price}
                      {spotlight.unitLabel?.trim() ? (
                        <span className="text-[11px] font-bold text-slate-500">
                          {" "}
                          / {spotlight.unitLabel.trim()}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              ) : null}
            </div>

            {row.products.length === 0 ? (
              <div className="relative z-[1] mt-6 rounded-[1.35rem] border border-dashed border-slate-300/70 bg-gradient-to-br from-white/70 via-white/40 to-white/20 px-4 py-12 text-center shadow-inner backdrop-blur-sm">
                <p className="text-sm font-semibold text-slate-600">Nothing listed in this aisle near you yet.</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">Open the full category to explore the catalogue.</p>
                <Link
                  href={href}
                  className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black underline-offset-2 ring-1 transition hover:underline ${th.pill}`}
                >
                  Browse {row.main.name}
                </Link>
              </div>
            ) : (
            <div className="scrollbar-hide relative z-[1] mt-6 flex gap-3.5 overflow-x-auto pb-1.5 pt-0.5 [-webkit-overflow-scrolling:touch]">
              {row.products.map((p, pi) => {
                const closed =
                  Boolean(p.store.openingHours?.enabled) &&
                  p.store.openingHours?.isOpenNow === false;
                const out = p.stock < 1;
                const q = qty(p.id);
                return (
                  <div
                    key={p.id}
                    className="group/card relative w-[150px] shrink-0 sm:w-[162px]"
                  >
                    <div
                      className={`relative overflow-hidden rounded-[1.25rem] border border-white/95 bg-white ring-1 transition-shadow duration-300 hover:shadow-xl ${th.cardRing}`}
                    >
                      <div className="relative aspect-square w-full bg-gradient-to-br from-slate-50 to-slate-100/80">
                        <Link
                          href={`/shop/product/${p.id}`}
                          className="block h-full w-full overflow-hidden"
                        >
                          <ProductThumb
                            name={p.name}
                            imageUrl={p.imageUrl}
                            className="h-full w-full object-cover transition duration-500 ease-out group-hover/card:scale-[1.06]"
                          />
                        </Link>
                        {pi < 2 ? (
                          <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-md bg-white/95 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-slate-900 shadow-md ring-1 ring-black/[0.06] sm:text-[9px]">
                            Season&apos;s Best
                          </span>
                        ) : null}
                        <div className="absolute bottom-1.5 right-1.5 z-[4]">
                          {q > 0 ? (
                            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 px-1 py-0.5 shadow-md backdrop-blur-sm">
                              <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center text-base font-black text-slate-700"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateShopLineQty(p.id, q - 1);
                                }}
                                aria-label="Decrease"
                              >
                                −
                              </button>
                              <span className="min-w-[1.25rem] text-center text-[11px] font-black text-slate-900">
                                {q}
                              </span>
                              <button
                                type="button"
                                disabled={closed || out || q >= p.stock}
                                className="flex h-7 w-7 items-center justify-center text-base font-black text-slate-700 disabled:opacity-35"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateShopLineQty(p.id, q + 1);
                                }}
                                aria-label="Increase"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={closed || out}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addOne(p);
                              }}
                              className={`rounded-lg px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide shadow-md transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${th.add}`}
                            >
                              {closed ? "Closed" : out ? "Out" : "ADD"}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 px-2.5 pb-2.5 pt-1.5">
                        {p.unitLabel?.trim() ? (
                          <p className={`truncate text-[10px] font-bold ${th.meta}`}>
                            {p.unitLabel.trim()}
                          </p>
                        ) : (
                          <p className={`text-[10px] font-bold ${th.meta}`}>—</p>
                        )}
                        <Link
                          href={`/shop/product/${p.id}`}
                          className="line-clamp-2 min-h-[2.25rem] text-[11px] font-extrabold leading-tight text-slate-900"
                        >
                          {p.name}
                        </Link>
                        <p className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                          <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sky-800">{p.store.etaMin} MINS</span>
                        </p>
                        {p.discountPercent != null && p.discountPercent > 0 ? (
                          <p className="text-[11px] font-black text-sky-600">
                            {Math.round(p.discountPercent)}% OFF
                          </p>
                        ) : (
                          <span className="block h-3.5" />
                        )}
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                          <span className="text-[14px] font-black text-slate-900">₹{Math.round(p.price)}</span>
                          {p.mrp != null && p.mrp > p.price ? (
                            <span className="text-[11px] font-semibold text-slate-400 line-through">
                              MRP ₹{Math.round(p.mrp)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={href}
                      className={`mt-2.5 flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-left text-[10px] font-extrabold transition hover:opacity-95 ${th.bar}`}
                    >
                      <span>See {recipeHint} recipes</span>
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
              className={`relative z-[1] mt-6 flex w-full items-center justify-between gap-3 rounded-full border px-4 py-3.5 transition duration-300 hover:brightness-[1.02] active:scale-[0.99] sm:px-5 ${th.pill}`}
            >
              <div className="flex -space-x-2">
                {(row.products.length ? thumbs : []).map((t, ti) => (
                  <div
                    key={t.id}
                    className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md ring-1 ring-black/[0.07]"
                    style={{ zIndex: 3 - ti }}
                  >
                    <ProductThumb
                      name={t.name}
                      imageUrl={t.imageUrl}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <span className="flex flex-1 items-center justify-end gap-2 text-sm font-black tracking-tight text-slate-800">
                See all products
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
