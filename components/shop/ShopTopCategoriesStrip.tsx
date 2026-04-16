"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { shopCategoryPathKeyFromMainKey } from "@/lib/shop-category-path";
import { resolveShopMainCoverImage } from "@/lib/shop-main-cover-image";

type ShopTreeSub = { id: string; name: string; imageUrl?: string | null };
type ShopTreeMain = { id: string; key: string; name: string; subcategories: ShopTreeSub[] };

export function ShopTopCategoriesStrip() {
  const [mains, setMains] = useState<ShopTreeMain[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [imgBroken, setImgBroken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      const res = await api<{ mains: ShopTreeMain[] }>("/api/master/shop-tree");
      if (res.ok && res.data?.mains) setMains(res.data.mains);
    })();
  }, []);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 520) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  const items = useMemo(
    () => mains.map((m) => ({ ...m, pathKey: shopCategoryPathKeyFromMainKey(m.key) })),
    [mains],
  );

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
          const img = resolveShopMainCoverImage(c);
          const broken = imgBroken[c.id] ?? false;
          return (
            <Link
              key={c.id}
              href={`/shop/category/${encodeURIComponent(c.pathKey)}`}
              className="group flex shrink-0 snap-center flex-col items-center"
            >
              <div className="relative h-[92px] w-[92px] overflow-hidden rounded-full bg-slate-100 ring-1 ring-black/5 transition group-hover:ring-black/10">
                {broken ? (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 font-display text-2xl font-black text-orange-900/70">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <Image
                    src={img}
                    alt={c.name}
                    fill
                    sizes="96px"
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
