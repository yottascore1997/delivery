"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/client-api";
import { verticalToCatalogMainKey } from "@/lib/shop-catalog-main-key";
import type { ShopVerticalSlug } from "@/lib/shop-verticals";
import { SHOP_VERTICAL_LABELS } from "@/lib/shop-verticals";
import { ShopCategoryPromoCarousel } from "@/components/shop/ShopCategoryPromoCarousel";
import { ShopCategoryMobileBrandBanner } from "@/components/shop/ShopCategoryMobileBrandBanner";
import {
  MoodChipThumb,
  WhatsOnYourMindLayout,
} from "@/components/shop/WhatsOnYourMindLayout";
import { FoodTopStoresSection } from "@/components/shop/FoodTopStoresSection";
import { FoodHubPromoBanner } from "@/components/shop/FoodHubPromoBanner";
import { DELIVERY_ADDRESS_UPDATED_EVENT } from "@/lib/shop-delivery-address";

const FOOD_SUB_SPLIT = 6;
const DEFAULT_LAT = 28.4595;
const DEFAULT_LNG = 77.0266;

type QuickProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  unitLabel?: string | null;
  store: {
    id: string;
    name: string;
    distanceKm: number;
    openingHours?: {
      enabled: boolean;
      isOpenNow: boolean;
    };
  };
};

type CatalogCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
  products: { imageUrl?: string | null }[];
};

type CatalogRes = {
  mainCategory: { name: string };
  categories: CatalogCategory[];
};

function firstPreviewImage(c: CatalogCategory): string | null {
  if (c.imageUrl?.trim()) return c.imageUrl.trim();
  const hit = c.products.find((p) => p.imageUrl?.trim());
  return hit?.imageUrl?.trim() ?? null;
}

function SubcategoryGrid({
  slug,
  categories,
}: {
  slug: ShopVerticalSlug;
  categories: CatalogCategory[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
      {categories.map((c) => {
        const img = firstPreviewImage(c);
        return (
          <Link
            key={c.id}
            href={`/shop/category/${slug}/sub/${c.id}?subname=${encodeURIComponent(c.name)}`}
            className="group flex flex-col items-center rounded-xl p-1 transition active:scale-[0.98]"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-sky-100 shadow-md ring-1 ring-sky-200/80 transition group-hover:ring-sky-300">
              {img ? (
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 767px) 33vw, 18vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 to-sky-200/90 text-2xl sm:text-3xl">
                  🛍️
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-center text-[10px] font-extrabold leading-tight text-slate-800 sm:text-[11px]">
              {c.name}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

export function ShopCategoryHubClient({ slug }: { slug: ShopVerticalSlug }) {
  const label = SHOP_VERTICAL_LABELS[slug];
  const mainKey = verticalToCatalogMainKey(slug);
  const isFood = slug === "food";
  const [data, setData] = useState<CatalogRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mindProducts, setMindProducts] = useState<QuickProduct[]>([]);
  const [mindLoading, setMindLoading] = useState(false);
  const [mindErr, setMindErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      const res = await api<CatalogRes>(`/api/master/catalog?mainKey=${encodeURIComponent(mainKey)}`);
      setLoading(false);
      if (res.ok && res.data) setData(res.data);
      else setErr(res.error || "Could not load categories");
    })();
  }, [mainKey]);

  const loadMindProducts = useCallback(async () => {
    setMindLoading(true);
    setMindErr(null);
    let la = DEFAULT_LAT;
    let ln = DEFAULT_LNG;
    if (getToken()) {
      const addr = await api<{ address: { latitude: number; longitude: number } | null }>(
        "/api/user/address",
      );
      if (addr.ok && addr.data?.address) {
        la = addr.data.address.latitude;
        ln = addr.data.address.longitude;
      }
    }
    const q = new URLSearchParams({
      vertical: "food",
      lat: String(la),
      lng: String(ln),
      radiusKm: "60",
      limit: "14",
    });
    const res = await api<{ products: QuickProduct[] }>(
      `/api/shop/category-quick?${q.toString()}`,
    );
    setMindLoading(false);
    if (res.ok && res.data) setMindProducts(res.data.products);
    else {
      setMindProducts([]);
      setMindErr(res.error || "Could not load picks");
    }
  }, []);

  useEffect(() => {
    if (!isFood) return;
    void loadMindProducts();
    function onAddrUpdated() {
      void loadMindProducts();
    }
    window.addEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddrUpdated);
    return () =>
      window.removeEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddrUpdated);
  }, [isFood, loadMindProducts]);

  const categories = data?.categories ?? [];
  const firstChunk = isFood ? categories.slice(0, FOOD_SUB_SPLIT) : categories;
  const restChunk = isFood ? categories.slice(FOOD_SUB_SPLIT) : [];

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/shop"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Back
            </Link>
            <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">{label}</h1>
          </div>
        </div>
        <p className="mt-1 px-0.5 text-[11px] font-semibold text-slate-500">
          Choose a category, then browse products nearby.
        </p>
      </div>

      <ShopCategoryPromoCarousel slug={slug} />

      {err && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
          {err}
        </div>
      )}

      <section aria-labelledby="subcat-heading" className="mb-8">
        <h2 id="subcat-heading" className="mb-3 text-sm font-black text-slate-900 sm:text-base">
          {data?.mainCategory.name ?? label}
        </h2>

        {loading ? (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-slate-200/90" />
                <div className="mt-2 h-3 w-14 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : isFood ? (
          <div className="space-y-8">
            {firstChunk.length > 0 ? (
              <SubcategoryGrid slug={slug} categories={firstChunk} />
            ) : null}

            <WhatsOnYourMindLayout>
              {mindLoading ? (
                <div className="mt-6 grid grid-cols-5 gap-2.5 sm:gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="aspect-square w-full animate-pulse rounded-2xl bg-slate-200/90" />
                      <div className="h-3 w-10 animate-pulse rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : mindErr ? (
                <p className="mt-6 text-sm font-medium text-rose-700">{mindErr}</p>
              ) : mindProducts.length === 0 ? (
                <p className="mt-6 text-sm font-medium text-slate-500">
                  No items nearby yet — open a subcategory above.
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-5 gap-2.5 sm:gap-4">
                  {mindProducts.slice(0, 10).map((p) => (
                    <Link
                      key={p.id}
                      href={`/shop/product/${p.id}`}
                      className="shop-mood-chip group flex w-full flex-col items-center gap-2"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/90 shadow-md ring-1 ring-black/10">
                        <MoodChipThumb src={p.imageUrl} label={p.name} />
                      </div>
                      <span className="line-clamp-2 max-w-full text-center text-[11px] font-extrabold leading-tight text-slate-800 sm:text-sm">
                        {p.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </WhatsOnYourMindLayout>

            <FoodHubPromoBanner />

            {restChunk.length > 0 ? (
              <div>
                <h3 className="mb-3 text-sm font-black text-slate-900 sm:text-base">
                  More categories
                </h3>
                <SubcategoryGrid slug={slug} categories={restChunk} />
              </div>
            ) : null}
          </div>
        ) : (
          <SubcategoryGrid slug={slug} categories={categories} />
        )}

        {!loading && !err && (data?.categories.length ?? 0) === 0 && (
          <p className="mt-4 text-center text-sm font-medium text-slate-500">
            No subcategories in catalog yet. Check back later or browse from the shop home.
          </p>
        )}
      </section>

      {isFood ? <FoodTopStoresSection /> : null}

      <ShopCategoryMobileBrandBanner />
    </div>
  );
}
