"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { addToShopCart } from "@/lib/shop-cart";
import { ProductThumb, StoreCover } from "@/components/shop/shop-visual";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  imageUrl?: string | null;
  unitLabel?: string | null;
};

type Category = { id: string; name: string; products: Product[] };

type OpeningHoursPayload = {
  enabled: boolean;
  open: string | null;
  close: string | null;
  isOpenNow: boolean;
};

export default function ShopStorePage() {
  const params = useParams();
  const storeId =
    typeof params.storeId === "string" ? params.storeId : params.storeId?.[0] ?? "";
  const [name, setName] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHoursPayload | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setErr(null);
    setLoading(true);
    const res = await api<{
      store: {
        name: string;
        imageUrl?: string | null;
        categories: Category[];
        openingHours: OpeningHoursPayload;
      };
    }>(`/api/stores/${storeId}`);
    setLoading(false);
    if (res.ok && res.data) {
      setName(res.data.store.name);
      setHeroImageUrl(res.data.store.imageUrl?.trim() || null);
      setCategories(res.data.store.categories);
      setOpeningHours(res.data.store.openingHours);
    } else {
      setErr(res.error || "Store not found or not approved yet.");
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const storeClosed =
    Boolean(openingHours?.enabled) && openingHours?.isOpenNow === false;

  function add(p: Product) {
    if (storeClosed || p.stock < 1) return;
    addToShopCart({
      productId: p.id,
      storeId,
      name: p.name,
      imageUrl: p.imageUrl ?? null,
      price: p.price,
      quantity: 1,
      ...(p.unitLabel?.trim() ? { unitLabel: p.unitLabel.trim() } : {}),
    });
    setToast(`${p.name} added to cart`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function scrollToCat(id: string) {
    document.getElementById(`shop-cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="shop-store-hero-wrap -mx-1 overflow-hidden rounded-3xl sm:mx-0">
          <div className="aspect-[5/3] max-h-72 animate-pulse bg-slate-200 sm:aspect-[21/9] sm:max-h-none sm:min-h-[15rem]" />
        </div>
        <div className="shop-store-cat-bar scrollbar-hide flex gap-2 overflow-x-auto rounded-2xl px-3 py-3 sm:px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-slate-200/90" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="shop-menu-item-card relative rounded-2xl p-3 pr-[4.75rem] sm:rounded-2xl sm:p-4 sm:pr-24"
          >
            <div className="absolute right-2.5 top-2.5 h-14 w-14 shrink-0 animate-pulse rounded-xl bg-slate-200 sm:right-3 sm:top-3 sm:h-16 sm:w-16" />
            <div className="min-w-0 space-y-2 py-0.5">
              <div className="h-4 w-2/3 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="flex justify-between border-t border-transparent pt-3">
                <div className="h-6 w-14 animate-pulse rounded bg-slate-200" />
                <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="shop-card-premium rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 p-10 text-center shadow-lg sm:p-14">
        <p className="font-display text-xl font-black text-amber-950 sm:text-2xl">{err}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium text-amber-900/70">
          Is store ka link galat ho sakta hai, ya abhi approve pending hai.
        </p>
        <Link
          href="/shop"
          className="shop-btn-primary mt-8 inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-black text-white"
        >
          ← Browse all stores
        </Link>
      </div>
    );
  }

  const itemCount = categories.reduce((n, c) => n + c.products.length, 0);
  const hoursLabel =
    openingHours?.open && openingHours?.close
      ? `${openingHours.open} – ${openingHours.close}`
      : null;

  return (
    <div className="relative pb-24 sm:pb-20">
      {toast ? (
        <div
          role="status"
          className="fixed left-1/2 z-[200] w-[min(100%-1.5rem,24rem)] -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-900/95 px-5 py-4 text-center text-sm font-bold text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-md max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-8"
        >
          <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
            ✓
          </span>
          {toast}
        </div>
      ) : null}

      {/* Hero */}
      <div className="shop-store-hero-wrap relative -mx-1 overflow-hidden rounded-3xl sm:mx-0 sm:rounded-[1.75rem]">
        <div className="relative min-h-[11.5rem] sm:min-h-[14rem]">
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt={name ? `${name} — store` : "Store"}
              fill
              className="absolute inset-0 object-cover object-center"
              sizes="(max-width: 768px) 100vw, min(1152px, 100vw)"
              priority
            />
          ) : (
            <StoreCover name={name} variant="storefront" className="absolute inset-0 h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-900/25" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />

          <div className="relative flex h-full min-h-[11.5rem] flex-col justify-between p-4 sm:min-h-[14rem] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-white/20"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All stores
              </Link>
              <Link
                href="/shop/cart"
                className="hidden items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/25 sm:inline-flex"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Cart
              </Link>
            </div>

            <div className="mt-auto pt-5">
              <h1 className="font-display max-w-[95%] text-[1.35rem] font-black leading-[1.1] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] sm:max-w-2xl sm:text-3xl md:text-[2rem]">
                {name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-md">
                  <span aria-hidden>★</span> 4.5
                </span>
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/95 backdrop-blur-md">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-600/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-md">
                  COD
                </span>
                {openingHours?.enabled ? (
                  <span
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-md ${
                      openingHours.isOpenNow
                        ? "border-emerald-300/60 bg-emerald-500/95"
                        : "border-rose-300/60 bg-rose-600/95"
                    }`}
                  >
                    {openingHours.isOpenNow ? "Open now" : "Store closed"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {storeClosed ? (
        <div className="mt-3 rounded-2xl border border-rose-200/90 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          We&apos;re closed right now.
          {hoursLabel ? (
            <span className="mt-1 block text-xs font-medium text-rose-800/90">
              Opening hours (India time): {hoursLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Category pills */}
      <div className="shop-store-cat-bar sticky top-[var(--shop-header-sticky)] z-40 mt-4 rounded-2xl px-3 py-2.5 sm:mt-5 sm:rounded-[1.25rem] sm:px-4 sm:py-3">
        <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 sm:hidden">
          Jump to section
        </p>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5 sm:gap-2.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => scrollToCat(c.id)}
              className="shrink-0 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#e23744]/35 hover:bg-rose-50/80 hover:text-[#c81d2e] active:scale-[0.98] sm:px-5"
            >
              {c.name}
              <span className="ml-1.5 text-xs font-semibold text-slate-400">({c.products.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu toolbar */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <p className="shop-section-eyebrow text-slate-500">Full menu</p>
          <h2 className="shop-section-title font-display mt-1.5 text-xl sm:text-2xl">Order fresh</h2>
        </div>
        <Link
          href="/shop/cart"
          className="shop-btn-primary hidden items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white shadow-lg sm:inline-flex sm:px-7"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          View cart
        </Link>
      </div>

      <div className="mt-5 space-y-9 sm:space-y-10">
        {categories.map((c) => (
          <section
            key={c.id}
            id={`shop-cat-${c.id}`}
            className="scroll-mt-[calc(var(--shop-header-sticky)+6.5rem)] sm:scroll-mt-[calc(var(--shop-header-sticky)+5rem)]"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
              <span
                className="hidden h-10 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#e23744] to-[#ff6b4a] sm:block"
                aria-hidden
              />
              <h3 className="font-display flex-1 text-base font-black tracking-tight text-slate-900 sm:text-xl">
                {c.name}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                {c.products.length} {c.products.length === 1 ? "dish" : "dishes"}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4 xl:grid-cols-5">
              {c.products.map((p, idx) => (
                <li key={p.id}>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.4)] sm:rounded-2xl">
                    <div className="relative">
                      <Link href={`/shop/product/${p.id}`} className="block">
                        <div className="aspect-square overflow-hidden border-b border-slate-100 sm:aspect-[4/3]">
                          <ProductThumb name={p.name} imageUrl={p.imageUrl} className="h-full w-full object-cover" />
                        </div>
                      </Link>
                      {idx === 0 ? (
                        <span className="absolute left-1.5 top-1.5 rounded bg-gradient-to-r from-[#e23744] to-[#ff4d5c] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-sm sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[9px]">
                          Hot
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <Link
                        href={`/shop/product/${p.id}`}
                        className="line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-4 text-slate-900 hover:text-violet-700 sm:min-h-[2.1rem] sm:text-[12px]"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-end gap-x-1.5 gap-y-0.5 sm:mt-2 sm:gap-2">
                        <p className="text-[13px] font-extrabold leading-none text-slate-900 sm:text-[15px]">
                          ₹{Number(p.price).toFixed(0)}
                        </p>
                        {p.unitLabel?.trim() ? (
                          <span className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                            {p.unitLabel.trim()}
                          </span>
                        ) : null}
                        {p.stock < 5 && p.stock > 0 ? (
                          <p className="text-[10px] font-bold text-orange-600 sm:text-[11px]">{p.stock} left</p>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[9px] font-medium text-slate-500 sm:text-[10px]">
                        Delivery in minutes
                      </p>
                      <div className="mt-2 sm:mt-3">
                        <button
                          type="button"
                          disabled={p.stock < 1 || storeClosed}
                          onClick={() => add(p)}
                          className="w-full rounded-lg border border-emerald-700 bg-emerald-600 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-[11px]"
                        >
                          {storeClosed
                            ? "Store closed"
                            : p.stock < 1
                              ? "Out of stock"
                              : "Add To Cart"}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="shop-card-premium mt-16 rounded-3xl border border-dashed border-slate-200 px-8 py-14 text-center">
          <p className="font-display text-lg font-black text-slate-700">Menu coming soon</p>
          <p className="mt-2 text-sm text-slate-500">This store hasn&apos;t listed items yet.</p>
          <Link href="/shop" className="shop-btn-primary mt-6 inline-block rounded-2xl px-8 py-3 text-sm font-black text-white">
            Back to stores
          </Link>
        </div>
      ) : null}

      {/* Mobile: cart dock above bottom tab nav */}
      {categories.length > 0 ? (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[95] px-3 md:hidden">
          <Link
            href="/shop/cart"
            className="shop-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-[0_8px_32px_rgba(226,55,68,0.4)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            View cart
          </Link>
        </div>
      ) : null}
    </div>
  );
}
