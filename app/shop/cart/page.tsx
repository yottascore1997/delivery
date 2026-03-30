"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, getToken } from "@/lib/client-api";
import {
  clearShopCart,
  getShopCart,
  shopCartTotal,
  updateShopLineQty,
  type ShopCartLine,
} from "@/lib/shop-cart";
import { emitDeliveryAddressUpdated } from "@/lib/shop-delivery-address";

export default function ShopCartPage() {
  const router = useRouter();
  const [lines, setLines] = useState<ShopCartLine[]>([]);
  const [storeInfo, setStoreInfo] = useState<{
    id: string;
    name: string;
    shopVertical?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addr, setAddr] = useState<{
    id: string;
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [addrText, setAddrText] = useState("");
  const [savingAddr, setSavingAddr] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [orderingOpen, setOrderingOpen] = useState<boolean | null>(null);
  const [orderingClosedMsg, setOrderingClosedMsg] = useState<string>("");
  const [deliveryFeePerOrder, setDeliveryFeePerOrder] = useState(25);
  const [addressHydrated, setAddressHydrated] = useState(false);

  function pushToast(type: "error" | "success" | "info", message: string) {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function refresh() {
    setLines(getShopCart());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("dlf-cart", refresh);
    return () => window.removeEventListener("dlf-cart", refresh);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setAddressHydrated(true);
      return;
    }
    void (async () => {
      const res = await api<{ address: typeof addr }>("/api/user/address");
      if (res.ok && res.data) {
        setAddr(res.data.address ?? null);
        setAddrText(res.data.address?.address ?? "");
        setShowAddressForm(!res.data.address);
      }
      setAddressHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!addressHydrated || typeof window === "undefined") return;
    if (window.location.hash !== "#delivery-address") return;
    requestAnimationFrame(() => {
      document.getElementById("delivery-address")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    if (getToken() && !addr) setShowAddressForm(true);
  }, [addressHydrated, addr]);

  useEffect(() => {
    function syncOrdering() {
      void (async () => {
        const res = await api<{
          open: boolean;
          closedMessage: string | null;
          deliveryFeePerOrder?: number;
        }>("/api/shop/ordering-status");
        if (res.ok && res.data) {
          setOrderingOpen(res.data.open);
          setOrderingClosedMsg(res.data.closedMessage ?? "");
          if (
            typeof res.data.deliveryFeePerOrder === "number" &&
            Number.isFinite(res.data.deliveryFeePerOrder)
          ) {
            setDeliveryFeePerOrder(res.data.deliveryFeePerOrder);
          }
        } else {
          setOrderingOpen(true);
        }
      })();
    }
    syncOrdering();
    const t = window.setInterval(syncOrdering, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const total = shopCartTotal(lines);
  const storeId = lines[0]?.storeId;
  const deliveryFee = lines.length > 0 ? deliveryFeePerOrder : 0;
  const handlingFee = 0;
  const payable = total + deliveryFee + handlingFee;
  const etaMin = lines.length > 0 ? 18 : 0;

  useEffect(() => {
    if (!storeId) {
      setStoreInfo(null);
      return;
    }
    void (async () => {
      const res = await api<{ store: { id: string; name: string; shopVertical?: string } }>(
        `/api/stores/${storeId}`,
      );
      if (res.ok && res.data) {
        setStoreInfo({
          id: res.data.store.id,
          name: res.data.store.name,
          shopVertical: res.data.store.shopVertical,
        });
      }
    })();
  }, [storeId]);

  async function checkout() {
    if (!getToken()) {
      router.push("/login?next=/shop/cart&customer=1");
      return;
    }
    if (orderingOpen === false) {
      pushToast("error", orderingClosedMsg || "Ordering is closed right now.");
      return;
    }
    if (!addr) {
      pushToast("error", "Please set your delivery address before placing the order.");
      return;
    }
    if (!storeId) return;
    setSubmitting(true);
    const res = await api<{ order: { id: string } }>("/api/orders/create", {
      method: "POST",
      body: JSON.stringify({
        storeId,
        paymentType: "COD",
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      pushToast(
        "error",
        res.error ||
          "Order failed. Register as a customer (New customer tab on login)."
      );
      return;
    }
    clearShopCart();
    setLines([]);
    pushToast("success", "Order placed successfully.");
    router.push(`/shop/orders?placed=${encodeURIComponent(res.data?.order.id ?? "")}`);
  }

  return (
    <div className="pb-8 md:pb-24">
      {toast ? (
        <div
          role="status"
          className={`fixed right-4 top-[calc(var(--shop-header-sticky)+0.75rem)] z-[220] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${
            toast.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-violet-200 bg-violet-50 text-violet-900"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="mb-7 rounded-3xl border border-white/70 bg-gradient-to-br from-white via-white to-orange-50/50 px-5 py-6 shadow-[0_16px_45px_-24px_rgba(15,23,42,0.24)] sm:px-7 sm:py-7">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
          Checkout
        </p>
        <h1 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1a1a1a] sm:text-4xl">
          Your cart
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#686b78]">
          Fast delivery, transparent pricing, secure COD handoff.
        </p>
      </div>

      {lines.length > 0 && orderingOpen === false && orderingClosedMsg ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm">
          {orderingClosedMsg}
        </div>
      ) : null}

      {getToken() || lines.length > 0 ? (
        <div
          id="delivery-address"
          className="mb-6 scroll-mt-[calc(var(--shop-header-sticky,0px)+1rem)] rounded-[2rem] border border-zinc-200/80 bg-white p-5 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)]"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">
                  Delivery address
                </p>
                <p className="mt-1 font-semibold leading-relaxed text-zinc-900">
                  {addr ? addr.address : "Not set"}
                </p>
                {addr ? (
                  <a
                    className="mt-2 inline-block text-sm font-black text-orange-600 underline"
                    href={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${addr.latitude},${addr.longitude}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on map
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingAddr}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      pushToast("error", "Geolocation not supported on this device/browser.");
                      return;
                    }
                    setSavingAddr(true);
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const latitude = pos.coords.latitude;
                        const longitude = pos.coords.longitude;
                        const res = await api<{ address: typeof addr }>(
                          "/api/user/address",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              latitude,
                              longitude,
                            }),
                          },
                        );
                        setSavingAddr(false);
                        if (!res.ok) {
                          pushToast("error", res.error || "Could not set location");
                          return;
                        }
                        setAddr(res.data?.address ?? null);
                        setAddrText(res.data?.address?.address ?? "");
                        emitDeliveryAddressUpdated();
                        pushToast("success", "Location updated.");
                      },
                      () => {
                        setSavingAddr(false);
                        pushToast("error", "Location permission denied. Please enter address manually.");
                      },
                      { enableHighAccuracy: true, timeout: 12000 },
                    );
                  }}
                >
                  {savingAddr ? "Setting…" : "Use current location"}
                </button>
                <button
                  type="button"
                  disabled={savingAddr}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                  onClick={() => setShowAddressForm((v) => !v)}
                >
                  {addr ? "Change address" : "Add address"}
                </button>
              </div>
            </div>

            {showAddressForm ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <textarea
                className="ui-input min-h-[56px] !rounded-2xl !py-3"
                placeholder="Flat / house no, street, landmark, city"
                value={addrText}
                onChange={(e) => setAddrText(e.target.value)}
              />
              <button
                type="button"
                disabled={savingAddr}
                className="rounded-2xl bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500 px-6 py-4 text-sm font-black text-white shadow-[0_10px_26px_-12px_rgba(139,92,246,0.55)] transition hover:brightness-105 disabled:opacity-60"
                onClick={async () => {
                  const t = addrText.trim();
                  if (t.length < 3) {
                    pushToast("error", "Please enter a valid address.");
                    return;
                  }
                  setSavingAddr(true);
                  const res = await api<{ address: typeof addr }>("/api/user/address", {
                    method: "POST",
                    body: JSON.stringify({
                      address: t,
                      latitude: addr?.latitude ?? 28.4595,
                      longitude: addr?.longitude ?? 77.0266,
                    }),
                  });
                  setSavingAddr(false);
                  if (!res.ok) {
                    pushToast("error", res.error || "Could not save address");
                    return;
                  }
                  setAddr(res.data?.address ?? null);
                  emitDeliveryAddressUpdated();
                  pushToast("success", "Address saved.");
                  setShowAddressForm(false);
                }}
              >
                Save address
              </button>
              </div>
            ) : null}
        </div>
      ) : null}

      {lines.length === 0 ? (
        <div className="shop-card-elevated rounded-[2rem] border border-dashed border-zinc-300 bg-white px-8 py-20 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-5xl">
            🛒
          </div>
          <p className="font-display text-2xl font-black text-zinc-800">Cart is empty</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
            Discover dishes from top restaurants near you and add what you love.
          </p>
          <Link
            href="/shop"
            className="shop-btn-primary mt-8 inline-block rounded-full px-10 py-4 text-sm font-black text-white"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-[1.5rem] border border-violet-200/70 bg-violet-50/70 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-600">Order source</p>
            <p className="mt-1 text-base font-black text-slate-900">
              {storeInfo?.name ?? "Selected store"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">ETA: {etaMin}-{etaMin + 7} min</p>
            <div className="mt-3 flex gap-2">
              <Link
                href={storeId ? `/shop/${storeId}` : "/shop"}
                className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700"
              >
                Open store
              </Link>
              <Link
                href={storeInfo?.shopVertical ? `/shop/category/${storeInfo.shopVertical}` : "/shop"}
                className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700"
              >
                Change store
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <ul className="space-y-4">
              {lines.map((l) => (
                <li
                  key={l.productId}
                  className="shop-card-elevated rounded-2xl border border-white/90 bg-white px-3 py-3.5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.25)] sm:px-3.5 sm:py-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-amber-100 text-sm">
                      🍽️
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-sm font-black text-[#1a1a1a]">
                        {l.name}
                      </p>
                      {l.unitLabel?.trim() ? (
                        <p className="mt-0.5 text-[10px] font-semibold text-[#686b78]">{l.unitLabel.trim()}</p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] font-semibold text-[#686b78]">
                        ₹{l.price} each
                        <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700">
                          Total ₹{Math.round(l.price * l.quantity * 100) / 100}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-xl border-2 border-green-600 bg-white px-1 py-0.5 shadow-sm">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-base font-black text-green-700 transition hover:bg-green-50"
                        onClick={() => {
                          updateShopLineQty(l.productId, l.quantity - 1);
                          refresh();
                        }}
                      >
                        −
                      </button>
                      <span className="min-w-[1.25rem] text-center text-sm font-black text-zinc-900">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-base font-black text-green-700 transition hover:bg-green-50"
                        onClick={() => {
                          updateShopLineQty(l.productId, l.quantity + 1);
                          refresh();
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${l.name}`}
                        className="ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                        onClick={() => {
                          updateShopLineQty(l.productId, 0);
                          refresh();
                        }}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-7 0v12m6-12v12M6 6l1 14h10l1-14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="shop-card-premium h-fit rounded-3xl border border-slate-200/80 bg-white p-5 shadow-lg md:sticky md:top-28">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">Bill summary</p>
              <div className="mt-4 space-y-2 text-sm font-semibold text-zinc-600">
                <div className="flex items-center justify-between">
                  <span>Items</span>
                  <span>{lines.reduce((n, l) => n + l.quantity, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>₹{Math.round(total * 100) / 100}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? <span className="text-emerald-600">Free</span> : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Handling</span>
                  <span>{handlingFee === 0 ? "₹0" : `₹${handlingFee}`}</span>
                </div>
              </div>
              <div className="mt-4 border-t border-zinc-200 pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  To pay
                </p>
                <p className="font-display mt-1 text-3xl font-black text-[#1a1a1a]">
                  ₹{Math.round(payable * 100) / 100}
                </p>
                <p className="text-xs font-semibold text-zinc-500">Incl. taxes as applicable · COD</p>
              </div>
              <button
                type="button"
                disabled={submitting || orderingOpen === false}
                onClick={() => void checkout()}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500 py-4 text-base font-black text-white shadow-[0_12px_30px_-14px_rgba(139,92,246,0.58)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
              >
                {orderingOpen === false
                  ? "Ordering closed"
                  : submitting
                    ? "Placing order…"
                    : "Place order"}
              </button>
            </aside>
          </div>

          <p className="mx-auto mt-3 max-w-6xl text-center text-xs text-zinc-500 sm:text-left">
            Need an account?{" "}
            <Link
              href="/login?customer=1&next=/shop/cart"
              className="font-bold text-orange-600 underline"
            >
              Sign up as customer
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
