"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { ShopCategoryPromoCarousel } from "@/components/shop/ShopCategoryPromoCarousel";
import { ShopCategoryMobileBrandBanner } from "@/components/shop/ShopCategoryMobileBrandBanner";
import { FoodTopStoresSection } from "@/components/shop/FoodTopStoresSection";
import { FoodHubPromoBanner } from "@/components/shop/FoodHubPromoBanner";

type CatalogCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
  products: { imageUrl?: string | null }[];
};

type CatalogRes = {
  mainCategory: { name: string } | null;
  categories: CatalogCategory[];
};

function firstPreviewImage(c: CatalogCategory): string | null {
  if (c.imageUrl?.trim()) return c.imageUrl.trim();
  const hit = c.products.find((p) => p.imageUrl?.trim());
  return hit?.imageUrl?.trim() ?? null;
}

function SubcategoryGrid({
  routeSlug,
  categories,
}: {
  routeSlug: string;
  categories: CatalogCategory[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
      {categories.map((c) => {
        const img = firstPreviewImage(c);
        return (
          <Link
            key={c.id}
            href={`/shop/category/${encodeURIComponent(routeSlug)}/sub/${c.id}?subname=${encodeURIComponent(c.name)}`}
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

export function ShopCategoryHubClient({
  routeSlug,
  catalogMainKey,
  title,
}: {
  routeSlug: string;
  catalogMainKey: string;
  title: string;
}) {
  const isFood = routeSlug === "food" || catalogMainKey === "food-beverages";
  const [data, setData] = useState<CatalogRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      const res = await api<CatalogRes>(
        `/api/master/catalog?mainKey=${encodeURIComponent(catalogMainKey)}`,
      );
      setLoading(false);
      if (res.ok && res.data) setData(res.data);
      else setErr(res.error || "Could not load categories");
    })();
  }, [catalogMainKey]);

  const categories = data?.categories ?? [];

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
            <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">{title}</h1>
          </div>
        </div>
        <p className="mt-1 px-0.5 text-[11px] font-semibold text-slate-500">
          Choose a category, then browse products nearby.
        </p>
      </div>

      <ShopCategoryPromoCarousel slug={routeSlug} />

      {err && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
          {err}
        </div>
      )}

      <section aria-labelledby="subcat-heading" className="mb-8">
        <h2 id="subcat-heading" className="mb-3 text-sm font-black text-slate-900 sm:text-base">
          {data?.mainCategory?.name ?? title}
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
        ) : (
          <SubcategoryGrid routeSlug={routeSlug} categories={categories} />
        )}

        {!loading && !err && (data?.categories?.length ?? 0) === 0 && (
          <p className="mt-4 text-center text-sm font-medium text-slate-500">
            No subcategories in catalog yet. Check back later or browse from the shop home.
          </p>
        )}
      </section>

      {isFood ? (
        <div className="mb-8 space-y-8">
          <FoodHubPromoBanner />
          <FoodTopStoresSection />
        </div>
      ) : null}

      <ShopCategoryMobileBrandBanner />
    </div>
  );
}
