"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client-api";
import { addToShopCart, getShopCart, updateShopLineQty } from "@/lib/shop-cart";
import { ProductThumb } from "@/components/shop/shop-visual";

type OpeningHoursPayload = {
  enabled: boolean;
  open: string | null;
  close: string | null;
  isOpenNow: boolean;
};

type ProductDetail = {
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
    address: string;
    latitude: number;
    longitude: number;
    openingHours: OpeningHoursPayload;
  };
};

type StoreProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  unitLabel?: string | null;
  categoryName: string;
};

export default function ShopProductPage() {
  const params = useParams();
  const productId =
    typeof params.productId === "string" ? params.productId : params.productId?.[0] ?? "";
  const [item, setItem] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [qty, setQty] = useState(0);
  const [cartQtyByProduct, setCartQtyByProduct] = useState<Record<string, number>>({});
  const [suggested, setSuggested] = useState<StoreProduct[]>([]);

  useEffect(() => {
    if (!productId) return;
    void (async () => {
      setErr(null);
      setLoading(true);
      const res = await api<{ product: ProductDetail }>(`/api/shop/product/${productId}`);
      setLoading(false);
      if (!res.ok || !res.data) {
        setErr(res.error || "Product not found");
        return;
      }
      setItem(res.data.product);
    })();
  }, [productId]);

  useEffect(() => {
    function syncQty() {
      const cart = getShopCart();
      const line = cart.find((l) => l.productId === productId);
      setQty(line?.quantity ?? 0);
      const map: Record<string, number> = {};
      for (const l of cart) map[l.productId] = l.quantity;
      setCartQtyByProduct(map);
    }
    syncQty();
    window.addEventListener("dlf-cart", syncQty);
    return () => window.removeEventListener("dlf-cart", syncQty);
  }, [productId]);

  useEffect(() => {
    if (!item?.store.id) return;
    void (async () => {
      const res = await api<{
        products: StoreProduct[];
        store?: { openingHours: OpeningHoursPayload };
      }>(`/api/products/${item.store.id}?limit=60`);
      if (!res.ok || !res.data) {
        setSuggested([]);
        return;
      }
      const related = res.data.products
        .filter((p) => p.id !== item.id && p.stock > 0)
        .sort((a, b) => {
          const am = a.categoryName === item.categoryName ? 0 : 1;
          const bm = b.categoryName === item.categoryName ? 0 : 1;
          return am - bm;
        })
        .slice(0, 6);
      setSuggested(related);
    })();
  }, [item]);

  const mapUrl = useMemo(() => {
    if (!item) return "#";
    return `https://www.google.com/maps?q=${encodeURIComponent(`${item.store.latitude},${item.store.longitude}`)}`;
  }, [item]);

  const storeClosed = Boolean(
    item &&
      item.store.openingHours.enabled &&
      item.store.openingHours.isOpenNow === false,
  );

  if (loading) {
    return <div className="rounded-2xl bg-white p-8 text-sm font-semibold text-slate-600">Loading product...</div>;
  }

  if (err || !item) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8">
        <p className="text-sm font-bold text-rose-800">{err || "Product not found"}</p>
        <Link href="/shop" className="mt-3 inline-block text-sm font-black text-rose-700 underline">
          Back to shop
        </Link>
      </div>
    );
  }

  function addOne() {
    if (!item || storeClosed) return;
    addToShopCart({
      productId: item.id,
      storeId: item.store.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      ...(item.unitLabel?.trim() ? { unitLabel: item.unitLabel.trim() } : {}),
    });
  }

  function qtyFor(productIdValue: string) {
    return cartQtyByProduct[productIdValue] ?? 0;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <Link href="/shop" className="text-xs font-black text-violet-700">
          ← Back to shop
        </Link>
        <div className="mt-3 mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200">
          <div className="aspect-[5/4] sm:aspect-[4/3]">
            <ProductThumb name={item.name} imageUrl={item.imageUrl} className="h-full w-full object-cover" />
          </div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{item.categoryName}</p>
        <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{item.name}</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          {item.description || "Fresh quality product from nearby trusted store."}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-black text-slate-900">₹{Math.round(item.price)}</p>
          {item.unitLabel?.trim() ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {item.unitLabel.trim()}
            </span>
          ) : null}
          <p className="text-sm font-semibold text-emerald-600">{item.stock > 0 ? "In stock" : "Out of stock"}</p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Add to cart
          </p>
          <div className="mt-2">
            {qty > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-white px-2 py-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => updateShopLineQty(item.id, qty - 1)}
                  className="h-10 w-10 rounded-lg text-2xl font-black text-violet-700 hover:bg-violet-50"
                >
                  -
                </button>
                <div className="text-center">
                  <p className="text-lg font-black text-slate-900">{qty}</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    ₹{Math.round(item.price)} each
                  </p>
                </div>
                <button
                  type="button"
                  disabled={storeClosed}
                  onClick={() => updateShopLineQty(item.id, qty + 1)}
                  className="h-10 w-10 rounded-lg text-2xl font-black text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={addOne}
                disabled={item.stock < 1 || storeClosed}
                className="w-full rounded-xl border border-emerald-700 bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {storeClosed ? "Store closed" : "Add To Cart"}
              </button>
            )}
          </div>
          {storeClosed ? (
            <p className="mt-2 text-xs font-semibold text-rose-700">
              Store closed right now — items can’t be added until we’re open.
            </p>
          ) : null}
        </div>

        {suggested.length > 0 ? (
          <div className="mt-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Suggested products
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  More picks from the same store
                </p>
              </div>
              <Link
                href={`/shop/${item.store.id}`}
                className="text-xs font-black text-violet-700 hover:text-violet-800"
              >
                View full menu →
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggested.map((s) => (
                <div
                  key={s.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/shop/product/${s.id}`} className="block">
                    <div className="aspect-[4/3] bg-slate-100">
                      <ProductThumb
                        name={s.name}
                        imageUrl={s.imageUrl}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link
                      href={`/shop/product/${s.id}`}
                      className="line-clamp-2 text-sm font-black text-slate-900 hover:text-violet-700"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      ₹{Math.round(s.price)}
                      {s.unitLabel?.trim() ? (
                        <span className="ml-2 text-xs font-semibold text-slate-500">
                          {s.unitLabel.trim()}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-2">
                      {qtyFor(s.id) > 0 ? (
                        <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateShopLineQty(s.id, qtyFor(s.id) - 1)}
                            className="h-8 w-8 rounded-lg text-xl font-black text-violet-700 hover:bg-violet-100"
                          >
                            -
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-black text-violet-800">
                            {qtyFor(s.id)}
                          </span>
                          <button
                            type="button"
                            disabled={storeClosed}
                            onClick={() => updateShopLineQty(s.id, qtyFor(s.id) + 1)}
                            className="h-8 w-8 rounded-lg text-xl font-black text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={storeClosed}
                          onClick={() =>
                            addToShopCart({
                              productId: s.id,
                              storeId: item.store.id,
                              name: s.name,
                              price: s.price,
                              quantity: 1,
                              ...(s.unitLabel?.trim() ? { unitLabel: s.unitLabel.trim() } : {}),
                            })
                          }
                          className="w-full rounded-xl border border-emerald-700 bg-emerald-600 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {storeClosed ? "Store closed" : "Add To Cart"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-24">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Seller</p>
        <p className="mt-1 text-base font-black text-slate-900">{item.store.name}</p>
        <p className="mt-1 text-sm font-medium text-slate-600">{item.store.address}</p>
        {storeClosed ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
            Store closed — you can browse but can&apos;t add items until we&apos;re open
            {item.store.openingHours.open && item.store.openingHours.close ? (
              <span className="mt-1 block font-medium text-rose-800/90">
                Hours (India time): {item.store.openingHours.open} – {item.store.openingHours.close}
              </span>
            ) : null}
          </p>
        ) : null}
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-black text-blue-700 hover:text-blue-800"
        >
          Open map
        </a>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <Link
            href={`/shop/${item.store.id}`}
            className="mt-3 inline-block text-sm font-black text-violet-700 hover:text-violet-800"
          >
            View full store menu
          </Link>
        </div>
      </aside>
    </div>
  );
}
