"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getToken } from "@/lib/client-api";
import { addToShopCart, getShopCart, updateShopLineQty } from "@/lib/shop-cart";
import type { ShopVerticalSlug } from "@/lib/shop-verticals";
import { SHOP_VERTICAL_LABELS } from "@/lib/shop-verticals";
import { ProductThumb } from "@/components/shop/shop-visual";
import { ShopCategoryMobileBrandBanner } from "@/components/shop/ShopCategoryMobileBrandBanner";
import { FoodTopStoresSection } from "@/components/shop/FoodTopStoresSection";
import { DELIVERY_ADDRESS_UPDATED_EVENT } from "@/lib/shop-delivery-address";
import { verticalToCatalogMainKey } from "@/lib/shop-catalog-main-key";

type QuickProduct = {
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
    distanceKm: number;
    etaMin: number;
    openingHours?: {
      enabled: boolean;
      isOpenNow: boolean;
    };
  };
};

function SkeletonProducts() {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <li key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="aspect-square animate-pulse bg-slate-200/80 sm:aspect-[4/3]" />
          <div className="space-y-2 p-2">
            <div className="h-3 w-full animate-pulse rounded bg-[#ececec]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#ececec]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

const DEFAULT_LAT = 28.4595;
const DEFAULT_LNG = 77.0266;

export function ShopCategoryProductsClient({
  slug,
  masterCategoryId,
}: {
  slug: ShopVerticalSlug;
  /** Master subcategory id, or literal `all` */
  masterCategoryId: string;
}) {
  const searchParams = useSearchParams();
  const subnameQ = (searchParams.get("subname") ?? "").trim();

  const label = SHOP_VERTICAL_LABELS[slug];
  const isAll = masterCategoryId === "all";

  const heading = useMemo(() => {
    if (isAll) return "All items";
    if (subnameQ) return subnameQ;
    return "Products";
  }, [isAll, subnameQ]);

  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cartQtyByProduct, setCartQtyByProduct] = useState<Record<string, number>>({});
  const [subcats, setSubcats] = useState<{ id: string; name: string; imageUrl?: string | null }[]>(
    [],
  );
  const showMobileRail = subcats.length > 0;

  useEffect(() => {
    void (async () => {
      const mainKey = verticalToCatalogMainKey(slug);
      const res = await api<{ categories: { id: string; name: string; imageUrl?: string | null }[] }>(
        `/api/master/catalog?mainKey=${encodeURIComponent(mainKey)}`,
      );
      if (res.ok && res.data?.categories) {
        setSubcats(res.data.categories.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })));
      } else {
        setSubcats([]);
      }
    })();
  }, [slug]);

  const load = useCallback(
    async (la: number, ln: number, isFirst = false) => {
      setErr(null);
      setLoading(true);
      const q = new URLSearchParams({
        lat: String(la),
        lng: String(ln),
        radiusKm: "60",
        limit: "48",
        vertical: slug,
      });
      if (!isAll) {
        q.set("masterCategoryId", masterCategoryId);
      }
      const quickRes = await api<{ products: QuickProduct[] }>(`/api/shop/category-quick?${q.toString()}`);
      setLoading(false);
      if (isFirst) setInitialLoad(false);
      if (quickRes.ok && quickRes.data) {
        setQuickProducts(quickRes.data.products);
      } else {
        setQuickProducts([]);
        setErr(quickRes.error || "Could not load products");
      }
    },
    [slug, masterCategoryId, isAll],
  );

  useEffect(() => {
    async function loadWithAddress() {
      const token = getToken();
      if (!token) {
        await load(DEFAULT_LAT, DEFAULT_LNG, true);
        return;
      }
      const addr = await api<{ address: { latitude: number; longitude: number } | null }>(
        "/api/user/address",
      );
      const la = addr.ok && addr.data?.address ? addr.data.address.latitude : DEFAULT_LAT;
      const ln = addr.ok && addr.data?.address ? addr.data.address.longitude : DEFAULT_LNG;
      await load(la, ln, true);
    }
    void loadWithAddress();
    function onAddrUpdated() {
      void loadWithAddress();
    }
    window.addEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddrUpdated);
    return () => window.removeEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddrUpdated);
  }, [load]);

  useEffect(() => {
    function syncCart() {
      const map: Record<string, number> = {};
      for (const line of getShopCart()) {
        map[line.productId] = line.quantity;
      }
      setCartQtyByProduct(map);
    }
    syncCart();
    window.addEventListener("dlf-cart", syncCart);
    return () => window.removeEventListener("dlf-cart", syncCart);
  }, []);

  function addQuickProduct(p: QuickProduct) {
    const closed =
      Boolean(p.store.openingHours?.enabled) &&
      p.store.openingHours?.isOpenNow === false;
    if (closed) return;
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

  function qtyInCart(productId: string) {
    return cartQtyByProduct[productId] ?? 0;
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/shop/category/${slug}`}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            ← Categories
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <h1 className="truncate text-sm font-black text-slate-900 sm:text-base">{heading}</h1>
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
          {err}
        </div>
      )}

      {/* Mobile: left subcategory rail + right products (Blinkit-style) */}
      {!isAll && subcats.length > 0 ? (
        <div className="mb-6 grid grid-cols-[76px_minmax(0,1fr)] gap-2.5 md:hidden">
          <aside className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
            <div className="max-h-[calc(100vh-var(--shop-header-sticky,0px)-10.5rem)] overflow-y-auto pr-1">
              <ul className="space-y-2">
                <li>
                  <Link
                    href={`/shop/category/${slug}/sub/all`}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center transition ${
                      isAll
                        ? "bg-emerald-50 ring-2 ring-emerald-300"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[10px] font-black text-slate-700">
                      ALL
                    </div>
                    <p
                      className={`line-clamp-2 text-[10px] font-extrabold leading-tight ${
                        isAll ? "text-emerald-900" : "text-slate-700"
                      }`}
                    >
                      All
                    </p>
                  </Link>
                </li>
                {subcats.map((c) => {
                  const active = c.id === masterCategoryId;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/shop/category/${slug}/sub/${c.id}?subname=${encodeURIComponent(c.name)}`}
                        className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center transition ${
                          active
                            ? "bg-emerald-50 ring-2 ring-emerald-300"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          <ProductThumb
                            name={c.name}
                            imageUrl={c.imageUrl ?? null}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p
                          className={`line-clamp-2 text-[10px] font-extrabold leading-tight ${
                            active ? "text-emerald-900" : "text-slate-700"
                          }`}
                        >
                          {c.name}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">Products</h2>
              <span className="text-xs font-semibold text-slate-500">
                {initialLoad && loading ? "…" : quickProducts.length}
              </span>
            </div>

            {initialLoad && loading ? (
              <SkeletonProducts />
            ) : quickProducts.length === 0 ? (
              <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-10 text-center text-sm font-medium text-slate-500">
                No products in this section nearby yet.
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2.5">
                {quickProducts.map((p) => {
                  const closed =
                    Boolean(p.store.openingHours?.enabled) &&
                    p.store.openingHours?.isOpenNow === false;
                  const outOfStock = p.stock < 1;
                  return (
                    <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <Link href={`/shop/product/${p.id}`} className="block">
                        <div className="aspect-square overflow-hidden border-b border-slate-100">
                          <ProductThumb
                            name={p.name}
                            imageUrl={p.imageUrl}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </Link>
                      <div className="p-2">
                        <Link
                          href={`/shop/product/${p.id}`}
                          className="line-clamp-2 text-[11px] font-semibold text-slate-900"
                        >
                          {p.name}
                        </Link>
                        <p className="mt-1 text-[13px] font-extrabold text-slate-900">
                          ₹{Math.round(p.price)}
                          {p.unitLabel?.trim() ? (
                            <span className="ml-1 text-[11px] font-semibold text-slate-500">
                              · {p.unitLabel.trim()}
                            </span>
                          ) : null}
                        </p>
                        <p className="line-clamp-1 text-[10px] font-medium text-slate-500">
                          {p.store.name}
                          {p.store.distanceKm != null ? ` · ${p.store.distanceKm} km` : ""}
                        </p>
                        {outOfStock ? (
                          <p className="mt-1 text-[10px] font-black text-rose-600">Out of stock</p>
                        ) : null}
                        <div className="mt-2">
                          {qtyInCart(p.id) > 0 ? (
                            <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-2 py-1">
                              <button
                                type="button"
                                className="h-7 w-7 text-lg font-black text-violet-700"
                                onClick={() => updateShopLineQty(p.id, qtyInCart(p.id) - 1)}
                              >
                                -
                              </button>
                              <span className="text-xs font-black text-violet-800">{qtyInCart(p.id)}</span>
                              <button
                                type="button"
                                disabled={closed || outOfStock}
                                className="h-7 w-7 text-lg font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
                                onClick={() => updateShopLineQty(p.id, qtyInCart(p.id) + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={closed || outOfStock}
                              onClick={() => addQuickProduct(p)}
                              className="w-full rounded-lg border border-emerald-700 bg-emerald-600 py-1.5 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {closed ? "Store closed" : outOfStock ? "Out of stock" : "Add To Cart"}
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
      ) : null}

      <section className={`mb-6 ${showMobileRail ? "hidden md:block" : ""}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900">Products</h2>
          <span className="text-xs font-semibold text-slate-500">
            {initialLoad && loading ? "…" : quickProducts.length}
          </span>
        </div>

        {initialLoad && loading ? (
          <SkeletonProducts />
        ) : quickProducts.length === 0 ? (
          <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-10 text-center text-sm font-medium text-slate-500">
            No products in this section nearby yet.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {quickProducts.map((p) => {
              const closed =
                Boolean(p.store.openingHours?.enabled) &&
                p.store.openingHours?.isOpenNow === false;
              const outOfStock = p.stock < 1;
              return (
              <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Link href={`/shop/product/${p.id}`} className="block">
                  <div className="aspect-square overflow-hidden border-b border-slate-100 sm:aspect-[4/3]">
                    <ProductThumb name={p.name} imageUrl={p.imageUrl} className="h-full w-full object-cover" />
                  </div>
                </Link>
                <div className="p-2">
                  <Link
                    href={`/shop/product/${p.id}`}
                    className="line-clamp-2 text-[11px] font-semibold text-slate-900"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-[13px] font-extrabold text-slate-900">
                    ₹{Math.round(p.price)}
                    {p.unitLabel?.trim() ? (
                      <span className="ml-1 text-[11px] font-semibold text-slate-500">· {p.unitLabel.trim()}</span>
                    ) : null}
                  </p>
                  <p className="line-clamp-1 text-[10px] font-medium text-slate-500">
                    {p.store.name}
                    {p.store.distanceKm != null ? ` · ${p.store.distanceKm} km` : ""}
                  </p>
                  {outOfStock ? (
                    <p className="mt-1 text-[10px] font-black text-rose-600">Out of stock</p>
                  ) : null}
                  <div className="mt-2">
                    {qtyInCart(p.id) > 0 ? (
                      <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-2 py-1">
                        <button
                          type="button"
                          className="h-7 w-7 text-lg font-black text-violet-700"
                          onClick={() => updateShopLineQty(p.id, qtyInCart(p.id) - 1)}
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-violet-800">{qtyInCart(p.id)}</span>
                        <button
                          type="button"
                          disabled={closed || outOfStock}
                          className="h-7 w-7 text-lg font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
                          onClick={() => updateShopLineQty(p.id, qtyInCart(p.id) + 1)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={closed || outOfStock}
                        onClick={() => addQuickProduct(p)}
                        className="w-full rounded-lg border border-emerald-700 bg-emerald-600 py-1.5 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {closed ? "Store closed" : outOfStock ? "Out of stock" : "Add To Cart"}
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

      {!initialLoad && !loading && quickProducts.length === 0 && !err && (
        <div className="shop-card-premium rounded-3xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="font-display text-lg font-bold text-zinc-700">Nothing here yet</p>
          <Link
            href={`/shop/category/${slug}`}
            className="shop-btn-primary mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-black text-white"
          >
            Back to categories
          </Link>
        </div>
      )}

      {slug === "food" ? (
        <FoodTopStoresSection
          subtitle={
            subnameQ
              ? `Popular outlets for ${subnameQ} · open first, then nearest`
              : "Popular outlets for food · open first, then nearest"
          }
        />
      ) : null}

      <ShopCategoryMobileBrandBanner />
    </div>
  );
}
