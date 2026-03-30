"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { addToShopCart, getShopCart, updateShopLineQty } from "@/lib/shop-cart";
import { ProductThumb } from "@/components/shop/shop-visual";
import { ShopNearbyStoreCard } from "@/components/shop/ShopNearbyStoreCard";
import { SHOP_VERTICAL_LABELS, isShopVerticalSlug } from "@/lib/shop-verticals";

type StoreItem = {
  id: string;
  name: string;
  address: string;
  imageUrl?: string | null;
  shopVertical: string;
  openingHours?: {
    enabled: boolean;
    isOpenNow: boolean;
  };
};

type ProductItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  unitLabel?: string | null;
  categoryName: string;
  store: {
    id: string;
    name: string;
    openingHours?: {
      enabled: boolean;
      isOpenNow: boolean;
    };
  };
};

function ShopSearchInner() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});

  useEffect(() => {
    function syncCart() {
      const map: Record<string, number> = {};
      for (const l of getShopCart()) map[l.productId] = l.quantity;
      setCartQty(map);
    }
    syncCart();
    window.addEventListener("dlf-cart", syncCart);
    return () => window.removeEventListener("dlf-cart", syncCart);
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      setStores([]);
      setProducts([]);
      setErr(null);
      return;
    }
    void (async () => {
      setLoading(true);
      setErr(null);
      const res = await api<{ stores: StoreItem[]; products: ProductItem[] }>(
        `/api/shop/search?q=${encodeURIComponent(q)}&limit=30`,
      );
      setLoading(false);
      if (!res.ok || !res.data) {
        setErr(res.error || "Search failed");
        return;
      }
      setStores(res.data.stores);
      setProducts(res.data.products);
    })();
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Search</p>
        <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
          {q ? `Results for "${q}"` : "Search products & stores"}
        </h1>
      </div>

      {loading ? <div className="text-sm font-semibold text-slate-600">Searching...</div> : null}
      {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{err}</div> : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Stores</h2>
          <span className="text-xs font-semibold text-slate-500">{stores.length}</span>
        </div>
        {stores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">No stores found.</div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <li key={s.id}>
                <ShopNearbyStoreCard
                  href={`/shop/${s.id}`}
                  name={s.name}
                  address={s.address}
                  distanceKm={0}
                  imageUrl={s.imageUrl}
                  badgeLabel={isShopVerticalSlug(s.shopVertical) ? SHOP_VERTICAL_LABELS[s.shopVertical] : "Store"}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Products</h2>
          <span className="text-xs font-semibold text-slate-500">{products.length}</span>
        </div>
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">No products found.</div>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => {
              const closed =
                Boolean(p.store.openingHours?.enabled) &&
                p.store.openingHours?.isOpenNow === false;
              return (
              <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Link href={`/shop/product/${p.id}`} className="block">
                  <div className="aspect-square overflow-hidden border-b border-slate-100 sm:aspect-[4/3]">
                    <ProductThumb name={p.name} imageUrl={p.imageUrl} className="h-full w-full object-cover" />
                  </div>
                </Link>
                <div className="p-2">
                  <Link href={`/shop/product/${p.id}`} className="line-clamp-2 text-[11px] font-semibold text-slate-900">
                    {p.name}
                  </Link>
                  <p className="mt-1 text-[13px] font-extrabold text-slate-900">
                    ₹{Math.round(p.price)}
                    {p.unitLabel?.trim() ? (
                      <span className="ml-1 text-[11px] font-semibold text-slate-500">· {p.unitLabel.trim()}</span>
                    ) : null}
                  </p>
                  <p className="line-clamp-1 text-[10px] font-medium text-slate-500">{p.store.name}</p>
                  <div className="mt-2">
                    {(cartQty[p.id] ?? 0) > 0 ? (
                      <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-2 py-1">
                        <button type="button" className="h-7 w-7 text-lg font-black text-violet-700" onClick={() => updateShopLineQty(p.id, (cartQty[p.id] ?? 0) - 1)}>
                          -
                        </button>
                        <span className="text-xs font-black text-violet-800">{cartQty[p.id] ?? 0}</span>
                        <button
                          type="button"
                          disabled={closed}
                          className="h-7 w-7 text-lg font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
                          onClick={() => updateShopLineQty(p.id, (cartQty[p.id] ?? 0) + 1)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={closed}
                        onClick={() =>
                          addToShopCart({
                            productId: p.id,
                            storeId: p.store.id,
                            name: p.name,
                            price: p.price,
                            quantity: 1,
                            ...(p.unitLabel?.trim() ? { unitLabel: p.unitLabel.trim() } : {}),
                          })
                        }
                        className="w-full rounded-lg border border-emerald-700 bg-emerald-600 py-1.5 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {closed ? "Store closed" : "Add To Cart"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ShopSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-56 animate-pulse rounded-xl bg-zinc-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      }
    >
      <ShopSearchInner />
    </Suspense>
  );
}
