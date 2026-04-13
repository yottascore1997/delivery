"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { ProductThumb } from "@/components/shop/shop-visual";
import { shopCategoryPathKeyFromMainKey } from "@/lib/shop-category-path";

type SubCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type MainCategory = {
  id: string;
  key: string;
  name: string;
  subcategories: SubCategory[];
};

function encodeSlug(v: string) {
  return encodeURIComponent(v.trim());
}

export default function ShopCategoriesPage() {
  const [mains, setMains] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await api<{ mains: MainCategory[] }>("/api/master/shop-tree");
      if (res.ok && res.data?.mains) setMains(res.data.mains);
      else setMains([]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-7">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="aspect-square animate-pulse rounded-2xl bg-slate-200" />
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-1">
      {mains.map((main) => {
        const slug = encodeSlug(shopCategoryPathKeyFromMainKey(main.key));
        return (
          <section key={main.id} className="space-y-3">
            <Link href={`/shop/category/${slug}`} className="block">
              <h2 className="text-[2rem] font-black tracking-tight text-slate-800 sm:text-4xl">
                {main.name}
              </h2>
            </Link>

            {main.subcategories.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">No subcategories added yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                {main.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/shop/category/${slug}/sub/${encodeSlug(sub.id)}`}
                    className="group"
                  >
                    <div className="aspect-square overflow-hidden rounded-2xl bg-[#e9f3f7]">
                      <ProductThumb
                        name={sub.name}
                        imageUrl={sub.imageUrl}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-center text-[11px] font-extrabold leading-tight text-slate-800 sm:text-sm">
                      {sub.name}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
