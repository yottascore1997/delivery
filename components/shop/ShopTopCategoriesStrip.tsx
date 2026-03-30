"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { isShopVerticalSlug } from "@/lib/shop-verticals";

type MainCat = { id: string; key: string; name: string };

const FALLBACK_IMAGES: Record<string, string> = {
  grocery:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=240&h=240&fit=crop&q=80",
  "fruits-vegetables":
    "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=240&h=240&fit=crop&q=80",
  food:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=240&h=240&fit=crop&q=80",
  "food-beverages":
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=240&h=240&fit=crop&q=80",
  electronics:
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=240&h=240&fit=crop&q=80",
};

function normalizeKey(key: string) {
  if (key === "food-beverages") return "food";
  return key;
}

export function ShopTopCategoriesStrip() {
  const [mains, setMains] = useState<MainCat[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [imgBroken, setImgBroken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      const res = await api<{ mains: MainCat[] }>("/api/master/mains");
      if (res.ok && res.data) setMains(res.data.mains);
    })();
  }, []);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 520) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  const items = useMemo(() => {
    // Only show keys the shop UI supports (/shop/category/[slug])
    return mains
      .map((m) => ({ ...m, key: normalizeKey(m.key) }))
      .filter((m) => isShopVerticalSlug(m.key));
  }, [mains]);

  if (!items.length) return null;

  return (
    <section aria-label="Top shop categories" className="mt-3">
      <div className="relative flex items-center justify-center">
        <h3 className="text-center text-sm font-black tracking-tight text-slate-900 sm:text-base">
          Top shop by categories
        </h3>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hide mt-4 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1"
      >
        {items.map((c) => {
          const img = FALLBACK_IMAGES[c.key] ?? FALLBACK_IMAGES.grocery;
          const broken = imgBroken[c.id] ?? false;
          return (
            <Link
              key={c.id}
              href={`/shop/category/${c.key}`}
              className="group flex shrink-0 snap-center flex-col items-center"
            >
              <div className="relative h-[92px] w-[92px] overflow-hidden rounded-full bg-[#f2efe6] ring-1 ring-black/5 transition group-hover:ring-black/10">
                {broken ? (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 font-display text-2xl font-black text-orange-900/70">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <Image
                    src={img}
                    alt={c.name}
                    fill
                    sizes="92px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => setImgBroken((m) => ({ ...m, [c.id]: true }))}
                  />
                )}
              </div>
              <p className="mt-2 text-center text-xs font-extrabold text-slate-800">
                {c.name}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

