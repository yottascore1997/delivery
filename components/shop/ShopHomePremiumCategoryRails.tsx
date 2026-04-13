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
    shell: "bg-gradient-to-br from-emerald-50 via-teal-50/90 to-[#ecfdf5]",
    border: "border-emerald-200/70",
    title: "text-emerald-950",
    sub: "text-amber-900/75",
    spotlight: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/90 shadow-[0_12px_32px_-12px_rgba(5,80,60,0.18)]",
    add: "border-2 border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50",
    bar: "bg-emerald-100/85 text-emerald-900",
    meta: "text-sky-700",
    pill: "border-emerald-100 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.12)]",
  },
  {
    shell: "bg-gradient-to-br from-amber-50 via-orange-50/88 to-[#fff7ed]",
    border: "border-orange-200/65",
    title: "text-[#7c2d12]",
    sub: "text-amber-900/70",
    spotlight: "border-orange-100 bg-gradient-to-br from-white to-orange-50/90 shadow-[0_12px_32px_-12px_rgba(180,83,9,0.15)]",
    add: "border-2 border-orange-600 bg-white text-orange-700 hover:bg-orange-50",
    bar: "bg-orange-100/85 text-orange-950",
    meta: "text-sky-700",
    pill: "border-orange-100 bg-white shadow-[0_8px_28px_-10px_rgba(180,83,9,0.12)]",
  },
  {
    shell: "bg-gradient-to-br from-sky-50 via-blue-50/90 to-indigo-50/70",
    border: "border-sky-200/70",
    title: "text-indigo-950",
    sub: "text-blue-900/65",
    spotlight: "border-sky-100 bg-gradient-to-br from-white to-sky-50 shadow-[0_12px_32px_-12px_rgba(30,58,138,0.14)]",
    add: "border-2 border-blue-600 bg-white text-blue-700 hover:bg-blue-50",
    bar: "bg-sky-100/90 text-indigo-950",
    meta: "text-sky-700",
    pill: "border-sky-100 bg-white shadow-[0_8px_28px_-10px_rgba(30,64,175,0.1)]",
  },
  {
    shell: "bg-gradient-to-br from-violet-50 via-fuchsia-50/85 to-purple-50/70",
    border: "border-violet-200/65",
    title: "text-violet-950",
    sub: "text-fuchsia-900/65",
    spotlight: "border-violet-100 bg-gradient-to-br from-white to-violet-50 shadow-[0_12px_32px_-12px_rgba(91,33,182,0.14)]",
    add: "border-2 border-violet-600 bg-white text-violet-700 hover:bg-violet-50",
    bar: "bg-violet-100/85 text-violet-950",
    meta: "text-sky-700",
    pill: "border-violet-100 bg-white shadow-[0_8px_28px_-10px_rgba(91,33,182,0.1)]",
  },
  {
    shell: "bg-gradient-to-br from-rose-50 via-pink-50/88 to-orange-50/50",
    border: "border-rose-200/60",
    title: "text-rose-950",
    sub: "text-rose-800/70",
    spotlight: "border-rose-100 bg-gradient-to-br from-white to-rose-50 shadow-[0_12px_32px_-12px_rgba(190,18,60,0.12)]",
    add: "border-2 border-rose-600 bg-white text-rose-700 hover:bg-rose-50",
    bar: "bg-rose-100/85 text-rose-950",
    meta: "text-sky-700",
    pill: "border-rose-100 bg-white shadow-[0_8px_28px_-10px_rgba(190,18,60,0.1)]",
  },
  {
    shell: "bg-gradient-to-br from-slate-100 via-zinc-50 to-slate-100/90",
    border: "border-slate-200/80",
    title: "text-slate-900",
    sub: "text-slate-600",
    spotlight: "border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12)]",
    add: "border-2 border-slate-800 bg-white text-slate-900 hover:bg-slate-50",
    bar: "bg-slate-200/80 text-slate-900",
    meta: "text-sky-700",
    pill: "border-slate-200 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.1)]",
  },
] as const;

function encodeCategorySlug(key: string) {
  return encodeURIComponent(key.trim());
}

function normMainKey(key: string) {
  return key.toLowerCase().replace(/\s+/g, "-").trim();
}

/** `category-quick` treats `food` as food + food-beverages mains — avoid empty rails. */
function verticalForQuickApi(mainKey: string): string {
  const k = normMainKey(mainKey);
  if (k === "food-beverages" || k === "food_beverages") return "food";
  return mainKey.trim();
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
          const q = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            radiusKm: "60",
            limit: String(PRODUCTS_PER_RAIL + 4),
            vertical: verticalForQuickApi(main.key),
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
      <div className="mt-10 space-y-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-[1.75rem] border border-slate-200/80 bg-slate-100/80 p-5 sm:p-6"
          >
            <div className="h-6 w-40 rounded-lg bg-slate-200/90" />
            <div className="mt-2 h-4 w-56 rounded bg-slate-200/70" />
            <div className="mt-5 flex gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-44 w-36 shrink-0 rounded-2xl bg-slate-200/80" />
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
            className={`relative overflow-hidden rounded-[1.75rem] border p-4 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.18)] sm:rounded-[2rem] sm:p-6 ${th.shell} ${th.border}`}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/35 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-row items-start justify-between gap-3 sm:gap-6">
              <div className="min-w-0 flex-1 pr-1">
                <h3 className={`font-display text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl ${th.title}`}>
                  {row.main.name}
                </h3>
                <p className={`mt-1 font-serif text-[13px] font-medium leading-snug sm:text-sm ${th.sub}`}>
                  {subtitle}
                </p>
              </div>
              {spotlight ? (
                <Link
                  href={`/shop/product/${spotlight.id}`}
                  className={`relative z-[1] flex max-w-[min(46%,11rem)] shrink-0 items-center gap-2 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-100/95 p-2 pr-2.5 shadow-[0_10px_28px_-8px_rgba(180,83,9,0.35)] transition hover:brightness-[1.02] sm:max-w-[220px] sm:gap-3 sm:p-2.5 sm:pr-3`}
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
              <div className="relative z-[1] mt-5 rounded-2xl border border-dashed border-slate-300/80 bg-white/50 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-600">No products in this aisle nearby yet.</p>
                <Link
                  href={href}
                  className="mt-3 inline-flex text-sm font-black text-emerald-700 underline-offset-2 hover:underline"
                >
                  Browse {row.main.name}
                </Link>
              </div>
            ) : (
            <div className="scrollbar-hide relative z-[1] mt-5 flex gap-3 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch]">
              {row.products.map((p, pi) => {
                const closed =
                  Boolean(p.store.openingHours?.enabled) &&
                  p.store.openingHours?.isOpenNow === false;
                const out = p.stock < 1;
                const q = qty(p.id);
                return (
                  <div
                    key={p.id}
                    className="relative w-[148px] shrink-0 sm:w-[158px]"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-white/90 bg-white shadow-md ring-1 ring-black/[0.06]">
                      <div className="relative aspect-square w-full bg-slate-50">
                        <Link href={`/shop/product/${p.id}`} className="block h-full w-full">
                          <ProductThumb
                            name={p.name}
                            imageUrl={p.imageUrl}
                            className="h-full w-full object-cover"
                          />
                        </Link>
                        {pi < 2 ? (
                          <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-lg bg-[#fffbeb] px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/90 sm:text-[9px]">
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
                      <div className="space-y-1 px-2 pb-2 pt-1">
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
                      className={`mt-2 flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[10px] font-extrabold transition hover:opacity-95 ${th.bar}`}
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
              className={`relative z-[1] mt-5 flex w-full items-center justify-between gap-3 rounded-full border px-4 py-3 transition hover:brightness-[1.01] sm:px-5 ${th.pill}`}
            >
              <div className="flex -space-x-2">
                {(row.products.length ? thumbs : []).map((t, ti) => (
                  <div
                    key={t.id}
                    className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-black/5"
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
              <span className="flex flex-1 items-center justify-end gap-2 text-sm font-black text-sky-700">
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
