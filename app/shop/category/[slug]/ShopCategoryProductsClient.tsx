"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/client-api";
import { addToShopCart, getShopCart, updateShopLineQty } from "@/lib/shop-cart";
import { ProductThumb } from "@/components/shop/shop-visual";
import { ShopPriceDisplay } from "@/components/shop/ShopPriceDisplay";
import { ShopCategoryMobileBrandBanner } from "@/components/shop/ShopCategoryMobileBrandBanner";
import { FoodTopStoresSection } from "@/components/shop/FoodTopStoresSection";
import { DELIVERY_ADDRESS_UPDATED_EVENT } from "@/lib/shop-delivery-address";

type QuickProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp?: number | null;
  discountPercent?: number | null;
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

type FoodStore = {
  id: string;
  name: string;
  address: string;
  imageUrl?: string | null;
  distanceKm: number;
  etaMin: number;
  openingHours?: {
    enabled: boolean;
    isOpenNow: boolean;
  };
  matchedProducts: number;
  startsAt: number;
  maxDiscount: number;
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
  routeSlug,
  catalogMainKey,
  masterCategoryId,
}: {
  routeSlug: string;
  catalogMainKey: string;
  /** Master subcategory id, or literal `all` */
  masterCategoryId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subnameQ = (searchParams.get("subname") ?? "").trim();

  const isAll = masterCategoryId === "all";
  const isFoodCategory =
    routeSlug === "food" ||
    routeSlug === "food-beverages" ||
    catalogMainKey === "food-beverages" ||
    catalogMainKey === "food";
  const isFoodPath =
    pathname?.startsWith("/shop/category/food/") ||
    pathname?.startsWith("/shop/category/food-beverages/");
  // Food flow: subcategory -> store listing (Zomato/Swiggy style).
  const storeMode = (isFoodCategory || Boolean(isFoodPath)) && !isAll;

  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);
  const [foodStores, setFoodStores] = useState<FoodStore[]>([]);
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
      const res = await api<{ categories: { id: string; name: string; imageUrl?: string | null }[] }>(
        `/api/master/catalog?mainKey=${encodeURIComponent(catalogMainKey)}`,
      );
      if (res.ok && res.data?.categories) {
        setSubcats(res.data.categories.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })));
      } else {
        setSubcats([]);
      }
    })();
  }, [catalogMainKey]);

  const load = useCallback(
    async (la: number, ln: number, isFirst = false) => {
      setErr(null);
      setLoading(true);
      const q = new URLSearchParams({
        lat: String(la),
        lng: String(ln),
        radiusKm: "60",
        limit: storeMode ? "40" : "48",
        vertical: catalogMainKey,
      });
      if (!isAll) {
        q.set("masterCategoryId", masterCategoryId);
      }
      if (subnameQ) q.set("subname", subnameQ);

      if (storeMode) {
        const storesRes = await api<{ stores: FoodStore[] }>(
          `/api/shop/food-subcategory-stores?${q.toString()}`,
        );
        setLoading(false);
        if (isFirst) setInitialLoad(false);
        if (storesRes.ok && storesRes.data) {
          setFoodStores(storesRes.data.stores);
          setQuickProducts([]);
        } else {
          setFoodStores([]);
          setQuickProducts([]);
          setErr(storesRes.error || "Could not load stores");
        }
        return;
      }

      const quickRes = await api<{ products: QuickProduct[] }>(
        `/api/shop/category-quick?${q.toString()}`,
      );
      setLoading(false);
      if (isFirst) setInitialLoad(false);
      if (quickRes.ok && quickRes.data) {
        setQuickProducts(quickRes.data.products);
        setFoodStores([]);
      } else {
        setQuickProducts([]);
        setFoodStores([]);
        setErr(quickRes.error || "Could not load products");
      }
    },
    [catalogMainKey, masterCategoryId, isAll, storeMode, subnameQ],
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
      {err && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
          {err}
        </div>
      )}

      {storeMode ? (
        <section className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {["Filters", "Under ₹300", "Great offers", "Pure Veg"].map((chip) => (
              <span
                key={chip}
                className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700"
              >
                {chip}
              </span>
            ))}
          </div>

          {initialLoad && loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-[16/8] animate-pulse bg-slate-200/80" />
                  <div className="space-y-2 p-3">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200/80" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : foodStores.length === 0 ? (
            <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-4 py-10 text-center text-sm font-medium text-slate-500">
              No stores found for this subcategory nearby yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {foodStores.map((s) => (
                <li key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <Link href={`/shop/${s.id}`} className="block">
                    <div className="aspect-[16/8] overflow-hidden bg-slate-100">
                      <ProductThumb
                        name={s.name}
                        imageUrl={s.imageUrl}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-xl font-black tracking-tight text-slate-900">{s.name}</h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                          {s.openingHours?.isOpenNow ? "Open" : "Closed"}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                        {s.etaMin} mins · {s.distanceKm} km
                      </p>
                      <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                        {s.matchedProducts} items · starts at ₹{s.startsAt}
                        {s.maxDiscount > 0 ? ` · up to ${s.maxDiscount}% OFF` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Mobile: left subcategory rail + right products (Blinkit-style) */}
      {!storeMode && !isAll && subcats.length > 0 ? (
        <div className="mb-6 grid grid-cols-[76px_minmax(0,1fr)] gap-2.5 md:hidden">
          <aside className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
            <div className="max-h-[calc(100vh-var(--shop-header-sticky,0px)-10.5rem)] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {subcats.map((c) => {
                  const active = c.id === masterCategoryId;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/shop/category/${encodeURIComponent(routeSlug)}/sub/${c.id}?subname=${encodeURIComponent(c.name)}`}
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
                        <div className="mt-1 flex flex-wrap items-end gap-1">
                          <ShopPriceDisplay
                            price={p.price}
                            mrp={p.mrp}
                            discountPercent={p.discountPercent}
                            size="sm"
                          />
                          {p.unitLabel?.trim() ? (
                            <span className="text-[11px] font-semibold text-slate-500">
                              · {p.unitLabel.trim()}
                            </span>
                          ) : null}
                        </div>
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
                                disabled={closed || outOfStock || qtyInCart(p.id) >= p.stock}
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

      <section className={`mb-6 ${showMobileRail && !storeMode ? "hidden md:block" : storeMode ? "hidden" : ""}`}>
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
                  <div className="mt-1 flex flex-wrap items-end gap-1">
                    <ShopPriceDisplay
                      price={p.price}
                      mrp={p.mrp}
                      discountPercent={p.discountPercent}
                      size="sm"
                    />
                    {p.unitLabel?.trim() ? (
                      <span className="text-[11px] font-semibold text-slate-500">
                        · {p.unitLabel.trim()}
                      </span>
                    ) : null}
                  </div>
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
                          disabled={closed || outOfStock || qtyInCart(p.id) >= p.stock}
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

      {!storeMode && !initialLoad && !loading && quickProducts.length === 0 && !err && (
        <div className="shop-card-premium rounded-3xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="font-display text-lg font-bold text-zinc-700">Nothing here yet</p>
          <Link
            href={`/shop/category/${encodeURIComponent(routeSlug)}`}
            className="shop-btn-primary mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-black text-white"
          >
            Back to categories
          </Link>
        </div>
      )}

      {(routeSlug === "food" || catalogMainKey === "food-beverages") && !storeMode ? (
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
