"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppName } from "@/lib/app-brand";
import { api, getToken } from "@/lib/client-api";
import { DELIVERY_ADDRESS_UPDATED_EVENT } from "@/lib/shop-delivery-address";
import { ShopCategoryShowcase } from "@/components/shop/ShopCategoryShowcase";
import { ShopNearbyStoreCard } from "@/components/shop/ShopNearbyStoreCard";
import { ShopTopCategoriesStrip } from "@/components/shop/ShopTopCategoriesStrip";
import { ShopCategoryMobileBrandBanner } from "@/components/shop/ShopCategoryMobileBrandBanner";
import { SHOP_VERTICAL_LABELS, isShopVerticalSlug } from "@/lib/shop-verticals";
import { FREE_DELIVERY_MIN_SUBTOTAL } from "@/lib/free-delivery";

type StoreItem = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  shopVertical: string;
  imageUrl?: string | null;
  openingHours?: {
    enabled: boolean;
    open: string | null;
    close: string | null;
    isOpenNow: boolean;
  };
};

const HERO_SLIDES = [
  {
    id: "grocery",
    eyebrow: "Speedza",
    title: "Grocery specials,\nfresh arrivals every hour",
    subtitle:
      "Top pantry picks, value combos and superfast doorstep delivery.",
    bg: "linear-gradient(140deg, #facc15 0%, #eab308 42%, #a16207 100%)",
    text: "text-[#2f2200]",
    subText: "text-[#4f3a00]",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&h=700&fit=crop&q=80",
  },
  {
    id: "vegetables",
    eyebrow: "Farm Fresh",
    title: "Fruits & vegetables,\nstraight from mandi",
    subtitle:
      "Fresh greens, seasonal fruits and handpicked quality delivered fast.",
    bg: "linear-gradient(140deg, #bbf7d0 0%, #4ade80 45%, #15803d 100%)",
    text: "text-[#073b1d]",
    subText: "text-[#14532d]",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1000&h=700&fit=crop&q=80",
  },
  {
    id: "daily",
    eyebrow: "Daily Needs",
    title: "Daily essentials,\nanytime convenience",
    subtitle:
      "Milk, bread, snacks and routine needs in one smooth experience.",
    bg: "linear-gradient(140deg, #dbeafe 0%, #93c5fd 45%, #60a5fa 100%)",
    text: "text-[#172554]",
    subText: "text-[#1e3a8a]",
    image:
      "https://images.unsplash.com/photo-1601599561213-832382fd07ba?w=1000&h=700&fit=crop&q=80",
  },
  {
    id: "electronics",
    eyebrow: "Tech Picks",
    title: "Electronics deals,\nsmart gadgets delivered",
    subtitle:
      "Accessories, devices and essentials with trusted local sellers.",
    bg: "linear-gradient(140deg, #fed7aa 0%, #fb923c 45%, #ea580c 100%)",
    text: "text-[#3f1a00]",
    subText: "text-[#7c2d12]",
    image: "/images/electro.PNG",
  },
] as const;

function SkeletonStores() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="shop-card-premium overflow-hidden rounded-2xl sm:rounded-3xl"
        >
          <div className="aspect-[16/10] animate-pulse bg-slate-200/80 sm:aspect-[5/3]" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="h-5 w-3/4 animate-pulse rounded-lg bg-[#ececec]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#f3f3f3]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[#f3f3f3]" />
          </div>
        </div>
      ))}
    </div>
  );
}

const DEFAULT_LAT = 28.4595;
const DEFAULT_LNG = 77.0266;

/** Shown when admin has not set a banner yet (`PlatformSetting` via `/api/shop/todays-match-banner`). */
const TODAYS_MATCH_FALLBACK_SRC = "/banners/todays-match.svg";

export default function ShopStoresPage() {
  const router = useRouter();
  const [heroIndex, setHeroIndex] = useState(0);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [matchBannerUrl, setMatchBannerUrl] = useState<string | null>(null);

  const load = useCallback(async (la: number, ln: number, isFirst = false) => {
    setErr(null);
    setLoading(true);
    const res = await api<{ stores: StoreItem[] }>(
      `/api/stores/nearby?lat=${la}&lng=${ln}&radiusKm=60&limit=30`,
    );
    setLoading(false);
    if (isFirst) setInitialLoad(false);
    if (res.ok && res.data) setStores(res.data.stores);
    else setErr(res.error || "Could not load stores");
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/shop&customer=1");
      return;
    }
    async function loadWithAddress(isFirst = false) {
      const addr = await api<{ address: { latitude: number; longitude: number } | null }>(
        "/api/user/address",
      );
      const la = addr.ok && addr.data?.address ? addr.data.address.latitude : DEFAULT_LAT;
      const ln = addr.ok && addr.data?.address ? addr.data.address.longitude : DEFAULT_LNG;
      await load(la, ln, isFirst);
    }
    void loadWithAddress(true);
    void (async () => {
      const r = await api<{ imageUrl: string | null }>(
        "/api/shop/todays-match-banner",
      );
      if (r.ok && r.data) setMatchBannerUrl(r.data.imageUrl ?? null);
    })();
    function onAddrUpdated() {
      void loadWithAddress(false);
    }
    window.addEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddrUpdated);
    return () =>
      window.removeEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddrUpdated);
  }, [load, router]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const appName = getAppName();
  const activeSlide = HERO_SLIDES[heroIndex];

  return (
    <div className="space-y-8 sm:space-y-10">
      <section
        className="space-y-3 sm:space-y-4 md:hidden"
        aria-label="Today's match — mobile only"
      >
        <h2 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Today&apos;s Match
        </h2>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm sm:rounded-3xl sm:aspect-[21/9]">
          {/* eslint-disable-next-line @next/next/no-img-element -- user may swap to JPG/WebP; avoids SVG restrictions on next/image */}
          <img
            src={matchBannerUrl?.trim() || TODAYS_MATCH_FALLBACK_SRC}
            alt="Today's match"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="shop-hero-card overflow-hidden rounded-3xl sm:rounded-[2rem]">
        <div className="shop-hero-strip relative z-[2] flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] sm:text-xs">
          <span aria-hidden className="opacity-90">✦</span>
          <span>Superfast delivery · Live prices · COD · Trusted stores</span>
        </div>
        <div
          className="shop-hero-card-inner transition-all duration-500"
          style={{ background: activeSlide.bg }}
        >
          <div className="grid gap-4 px-5 pb-7 pt-7 sm:px-8 sm:pb-8 sm:pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className={`shop-section-eyebrow ${activeSlide.subText}`}>{activeSlide.eyebrow}</p>
              <h1
                className={`font-display mt-3 max-w-xl whitespace-pre-line text-[1.75rem] font-black leading-[1.05] tracking-tight sm:text-5xl ${activeSlide.text}`}
              >
                {activeSlide.title}
              </h1>
              <p className={`mt-4 max-w-lg text-sm font-bold leading-relaxed sm:text-base ${activeSlide.subText}`}>
                {activeSlide.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8">
                <Link
                  href="#stores-near-you"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition active:scale-[0.98] sm:px-7 sm:py-3.5"
                >
                  Explore nearby
                  <span aria-hidden className="opacity-90">→</span>
                </Link>
                <Link
                  href="/shop/cart"
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-white/80 px-5 py-3 text-sm font-black text-slate-800 shadow-sm backdrop-blur-sm"
                >
                  View cart
                </Link>
              </div>
            </div>

            <div className="relative mx-auto h-44 w-full max-w-md overflow-hidden rounded-3xl border border-white/40 shadow-2xl lg:h-56">
              <Image
                src={activeSlide.image}
                alt={activeSlide.eyebrow}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
                priority
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 pb-4">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to ${s.eyebrow}`}
                onClick={() => setHeroIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  heroIndex === i ? "w-7 bg-slate-900/80" : "w-2.5 bg-black/20"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <ShopCategoryShowcase />

      {err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-900">
          {err}
        </div>
      )}

      <section id="stores-near-you" className="scroll-mt-36">
        <ShopTopCategoriesStrip />
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="shop-section-title font-display mt-2 text-2xl sm:text-3xl">Stores near you</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {stores.length} outlet{stores.length !== 1 ? "s" : ""} · sorted by distance
            </p>
            <p className="mt-2 text-sm font-bold text-emerald-700">
              Free delivery on orders above ₹{FREE_DELIVERY_MIN_SUBTOTAL}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Fast delivery", "Verified", "Best offers"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {initialLoad && loading ? (
          <div className="mt-6">
            <SkeletonStores />
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {stores.map((s) => (
              <li key={s.id}>
                <ShopNearbyStoreCard
                  href={`/shop/${s.id}`}
                  name={s.name}
                  address={s.address}
                  distanceKm={s.distanceKm}
                  imageUrl={s.imageUrl}
                  openingHours={s.openingHours}
                  badgeLabel={
                    isShopVerticalSlug(s.shopVertical)
                      ? SHOP_VERTICAL_LABELS[s.shopVertical]
                      : "Store"
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-r from-white/70 to-slate-50/70 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="shop-section-eyebrow text-slate-500">Premium support</p>
            <h3 className="font-display mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Better shopping, every day
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 sm:text-base">
              Handpicked stores, transparent pricing and reliable delivery partners.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/shop/orders"
              className="shop-btn-primary inline-flex items-center rounded-2xl px-5 py-3 text-sm font-black text-white"
            >
              Track your orders
            </Link>
            <Link
              href="/shop/help"
              className="inline-flex items-center rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Help &amp; support
            </Link>
          </div>
        </div>
      </section>

      {!initialLoad && !loading && stores.length === 0 && !err && (
        <div className="shop-card-premium rounded-3xl border border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
          <p className="font-display text-xl font-bold text-zinc-700">No stores in range</p>
          <p className="mt-2 text-sm text-zinc-500">
            Ask your store to get approved on the platform, or check back later.
          </p>
          <Link
            href="/shop"
            className="shop-btn-primary mt-6 inline-block rounded-full px-8 py-3 text-sm font-black text-white"
          >
            Refresh
          </Link>
        </div>
      )}

      <ShopCategoryMobileBrandBanner />
    </div>
  );
}
