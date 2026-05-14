"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client-api";

const DEFAULT_LAT = 28.4595;
const DEFAULT_LNG = 77.0266;

type CatalogCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
  products: { imageUrl?: string | null }[];
};

type QuickProduct = {
  id: string;
  name: string;
  imageUrl?: string | null;
  price?: number;
  categoryName?: string;
};

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function firstCategoryImage(c: CatalogCategory): string | null {
  if (c.imageUrl?.trim()) return c.imageUrl.trim();
  const hit = c.products.find((p) => p.imageUrl?.trim());
  return hit?.imageUrl?.trim() ?? null;
}

export function FashionFestSection({
  routeSlug,
  categories,
}: {
  routeSlug: string;
  categories: CatalogCategory[];
}) {
  const [products, setProducts] = useState<QuickProduct[]>([]);

  useEffect(() => {
    void (async () => {
      const q = new URLSearchParams({
        vertical: "fashion",
        lat: String(DEFAULT_LAT),
        lng: String(DEFAULT_LNG),
        radiusKm: "60",
        limit: "120",
      });
      const res = await api<{ products: QuickProduct[] }>(`/api/shop/category-quick?${q.toString()}`);
      if (res.ok && res.data?.products) setProducts(res.data.products);
      else setProducts([]);
    })();
  }, []);

  const cards = useMemo(() => {
    const fashionCats = categories.slice(0, 4);
    return fashionCats.map((c) => {
      const cname = norm(c.name);
      const hits = products.filter((p) => norm(p.categoryName ?? "") === cname);
      const min = hits
        .map((p) => Number(p.price) || 0)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)[0];
      const img = hits.find((p) => p.imageUrl?.trim())?.imageUrl?.trim() ?? firstCategoryImage(c);
      return {
        id: c.id,
        name: c.name,
        imageUrl: img,
        startsAt: min ? Math.round(min) : null,
      };
    });
  }, [categories, products]);

  const heroDeal = useMemo(() => {
    const priced = products
      .map((p) => ({ ...p, priceN: Number(p.price) || 0 }))
      .filter((p) => p.priceN > 0)
      .sort((a, b) => a.priceN - b.priceN);
    const pick = priced[0] ?? null;
    if (!pick) return null;
    return {
      name: pick.name,
      imageUrl: pick.imageUrl?.trim() ?? null,
      startsAt: Math.round(pick.priceN),
    };
  }, [products]);

  const topThumbs = cards
    .map((c) => c.imageUrl)
    .filter((v): v is string => Boolean(v))
    .slice(0, 2);

  return (
    <section className="mb-6 overflow-hidden rounded-[2rem] border border-amber-200 bg-[#f8e892] p-3 sm:p-4">
      <div className="relative rounded-2xl bg-[#f7e786] p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex rounded-xl bg-pink-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
              Summer edit
            </p>
            <p className="mt-2 text-lg font-black uppercase tracking-tight text-teal-900 sm:text-2xl">
              Up to 85% off
            </p>
            <h3 className="font-display text-3xl font-black uppercase leading-none tracking-tight text-teal-900 sm:text-5xl">
              Fashion Fest
            </h3>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {topThumbs.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={`relative h-20 w-16 overflow-hidden rounded-lg border-4 border-white shadow-md ${
                  i === 0 ? "-rotate-6" : "rotate-6"
                }`}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="80px" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1.05fr_1.95fr] gap-2.5 sm:gap-3">
          <Link
            href={`/shop/category/${encodeURIComponent(routeSlug)}`}
            className="group overflow-hidden rounded-2xl bg-white ring-1 ring-black/10"
          >
            <div className="p-2.5">
              <p className="text-2xl font-black tracking-tight text-teal-800 sm:text-3xl">Deal Zone</p>
            </div>
            <div className="relative h-[13.8rem] bg-slate-100">
              {heroDeal?.imageUrl ? (
                <Image src={heroDeal.imageUrl} alt={heroDeal.name} fill className="object-cover" sizes="220px" />
              ) : null}
            </div>
            <div className="px-2.5 pb-3">
              <span className="inline-flex rounded-full bg-pink-600 px-3 py-1 text-lg font-black text-white">
                ₹{heroDeal?.startsAt ?? 199}
              </span>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/shop/category/${encodeURIComponent(routeSlug)}/sub/${c.id}?subname=${encodeURIComponent(c.name)}`}
                className="group overflow-hidden rounded-2xl bg-white ring-1 ring-black/10"
              >
                <div className="px-2.5 py-2">
                  <p className="line-clamp-1 text-sm font-black text-slate-800 sm:text-xl">{c.name} &amp; More</p>
                </div>
                <div className="relative h-[6.1rem] bg-slate-100 sm:h-[6.8rem]">
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="220px" />
                  ) : null}
                </div>
                <div className="rounded-tl-xl bg-teal-700 px-2.5 py-1.5 text-sm font-black text-white sm:text-lg">
                  Starting @ ₹{c.startsAt ?? 99}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

