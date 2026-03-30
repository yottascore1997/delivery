"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, getToken, getUser } from "@/lib/client-api";

type OrderRow = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  store: { name: string };
  items: { quantity: number; price: number; product: { name: string } }[];
};

const statusTone: Record<string, string> = {
  PLACED: "bg-amber-100 text-amber-900 ring-amber-200",
  PREPARING: "bg-sky-100 text-sky-900 ring-sky-200",
  READY: "bg-violet-100 text-violet-900 ring-violet-200",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-900 ring-orange-200",
  DELIVERED: "bg-green-100 text-green-900 ring-green-200",
  CANCELLED: "bg-zinc-200 text-zinc-800 ring-zinc-300",
};

function OrdersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placed = searchParams.get("placed");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/shop/orders&customer=1");
      return;
    }
    if (getUser()?.role !== "CUSTOMER") {
      setErr("Sign in with a customer account to see orders.");
      setLoading(false);
      return;
    }
    void (async () => {
      const res = await api<{ orders: OrderRow[] }>("/api/orders/user?limit=30");
      setLoading(false);
      if (res.ok && res.data) setOrders(res.data.orders);
      else setErr(res.error || "Could not load orders");
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-3xl bg-zinc-200" />
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="shop-card-elevated rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-10 text-center">
        <p className="font-semibold text-amber-950">{err}</p>
        <Link
          href="/login?customer=1&next=/shop/orders"
          className="shop-btn-primary mt-6 inline-block rounded-full px-8 py-3 text-sm font-black text-white"
        >
          Customer login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-black tracking-tight text-[#1a1a1a] sm:text-4xl">
        Your orders
      </h1>
      <p className="mt-2 text-sm font-semibold text-[#686b78]">Track everything in one place</p>

      {placed && (
        <div className="shop-card-elevated mt-6 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50/50 px-5 py-4">
          <p className="font-display text-lg font-black text-green-900">Order placed successfully</p>
          <p className="mt-1 text-sm text-green-800">
            Reference: <span className="font-mono font-bold">{placed.slice(0, 10)}</span>…
          </p>
        </div>
      )}

      <ul className="mt-10 space-y-5">
        {orders.map((o) => (
          <li
            key={o.id}
            className="shop-card-elevated overflow-hidden rounded-3xl border border-white/90 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/80 px-5 py-3">
              <span className="font-mono text-xs font-semibold text-zinc-500">
                #{o.id.slice(0, 8).toUpperCase()}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${statusTone[o.status] ?? "bg-zinc-100 text-zinc-800 ring-zinc-200"}`}
              >
                {o.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="p-5">
              <p className="font-display text-lg font-black text-[#1a1a1a]">{o.store.name}</p>
              <p className="mt-1 text-sm text-[#686b78]">
                {new Date(o.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                {o.items.map((i, j) => (
                  <li key={j} className="flex justify-between text-sm font-semibold text-zinc-700">
                    <span>
                      {i.quantity}× {i.product.name}
                    </span>
                    <span className="text-zinc-500">₹{Math.round(i.price * i.quantity * 100) / 100}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
                <span className="text-sm font-bold text-zinc-500">Total paid (COD)</span>
                <span className="font-display text-xl font-black text-orange-600">₹{o.totalAmount}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {orders.length === 0 && !placed && (
        <div className="shop-card-elevated mt-12 rounded-[2rem] border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
          <p className="font-display text-xl font-black text-zinc-700">No orders yet</p>
          <p className="mt-2 text-sm text-zinc-500">When you order, your history shows up here.</p>
          <Link
            href="/shop"
            className="shop-btn-primary mt-8 inline-block rounded-full px-8 py-3 text-sm font-black text-white"
          >
            Start ordering
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ShopOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-zinc-200" />
          <div className="h-36 animate-pulse rounded-3xl bg-zinc-200" />
        </div>
      }
    >
      <OrdersInner />
    </Suspense>
  );
}
