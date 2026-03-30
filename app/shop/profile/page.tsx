"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { api, clearSession, getToken, getUser, updateSessionUser } from "@/lib/client-api";

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

function isOrderToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function OrderCard({ o }: { o: OrderRow }) {
  return (
    <li className="shop-card-elevated overflow-hidden rounded-2xl border border-white/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
        <span className="font-mono text-[10px] font-semibold text-zinc-500">
          #{o.id.slice(0, 8).toUpperCase()}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1 ${statusTone[o.status] ?? "bg-zinc-100 text-zinc-800 ring-zinc-200"}`}
        >
          {o.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="p-4">
        <p className="font-display text-base font-black text-[#1a1a1a]">{o.store.name}</p>
        <p className="mt-0.5 text-xs text-[#686b78]">
          {new Date(o.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3">
          {o.items.slice(0, 4).map((i, j) => (
            <li key={j} className="flex justify-between text-xs font-semibold text-zinc-700">
              <span className="line-clamp-1">
                {i.quantity}× {i.product.name}
              </span>
              <span className="shrink-0 text-zinc-500">₹{Math.round(i.price * i.quantity * 100) / 100}</span>
            </li>
          ))}
          {o.items.length > 4 ? (
            <li className="text-[11px] font-medium text-zinc-400">+{o.items.length - 4} more</li>
          ) : null}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
          <span className="text-xs font-bold text-zinc-500">Total (COD)</span>
          <span className="font-display text-lg font-black text-orange-600">₹{o.totalAmount}</span>
        </div>
      </div>
    </li>
  );
}

export default function ShopProfilePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [address, setAddress] = useState<{
    label: string;
    address: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleErr, setRoleErr] = useState(false);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(
    () => getUser()?.imageUrl ?? null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const user = getUser();

  const { todayOrders, pastOrders } = useMemo(() => {
    const today: OrderRow[] = [];
    const past: OrderRow[] = [];
    for (const o of orders) {
      if (isOrderToday(o.createdAt)) today.push(o);
      else past.push(o);
    }
    return { todayOrders: today, pastOrders: past };
  }, [orders]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/shop/profile&customer=1");
      return;
    }
    if (getUser()?.role !== "CUSTOMER") {
      setRoleErr(true);
      setLoading(false);
      return;
    }
    void (async () => {
      const [meRes, addrRes, ordRes] = await Promise.all([
        api<{ user: { imageUrl: string | null } }>("/api/user/me"),
        api<{ address: { label: string; address: string } | null }>("/api/user/address"),
        api<{ orders: OrderRow[] }>("/api/orders/user?limit=40"),
      ]);
      setLoading(false);
      setOrdersErr(null);
      if (meRes.ok && meRes.data?.user) {
        const u = meRes.data.user;
        setImageUrl(u.imageUrl ?? null);
        updateSessionUser({ imageUrl: u.imageUrl ?? null });
      }
      if (addrRes.ok && addrRes.data?.address) {
        setAddress({
          label: addrRes.data.address.label || "Home",
          address: addrRes.data.address.address,
        });
      } else {
        setAddress(null);
      }
      if (ordRes.ok && ordRes.data) setOrders(ordRes.data.orders);
      else setOrdersErr(ordRes.error || "Could not load orders");
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <div className="h-36 animate-pulse rounded-3xl bg-zinc-200" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (roleErr) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold text-amber-950">Customer account required for this page.</p>
        <Link
          href="/login?customer=1&next=/shop/profile"
          className="shop-btn-primary mt-6 inline-block rounded-full px-8 py-3 text-sm font-black text-white"
        >
          Customer login
        </Link>
      </div>
    );
  }

  const displayName = user?.name ?? "Customer";
  const phone = user?.phone ?? "";
  const av = initialsFromName(displayName);

  async function onAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !getToken()) return;
    setUploadingAvatar(true);
    setAvatarMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = (await res.json()) as { user?: { imageUrl: string | null }; error?: string };
      if (!res.ok) {
        setAvatarMsg(data?.error || "Upload failed");
        return;
      }
      if (data.user?.imageUrl) {
        setImageUrl(data.user.imageUrl);
        updateSessionUser({ imageUrl: data.user.imageUrl });
      }
    } catch {
      setAvatarMsg("Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className="pb-6 md:pb-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/shop"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm"
        >
          ← Back
        </Link>
      </div>

      <section className="shop-card-elevated rounded-[1.75rem] border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/80 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
          <div className="relative shrink-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-lg ring-4 ring-white">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-black text-amber-950">
                  {av}
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="sr-only"
              onChange={onAvatarFile}
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              className="mt-3 w-full rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] font-black text-orange-900 transition hover:bg-orange-100 disabled:opacity-50 sm:mt-4"
            >
              {uploadingAvatar ? "Uploading…" : "Change photo"}
            </button>
            {avatarMsg ? (
              <p className="mt-2 text-center text-xs font-medium text-rose-600 sm:text-left">{avatarMsg}</p>
            ) : null}
          </div>
          <div className="mt-4 min-w-0 flex-1 sm:mt-0">
            <h1 className="font-display text-2xl font-black tracking-tight text-zinc-900">{displayName}</h1>
            {phone ? (
              <p className="mt-1 text-sm font-semibold text-zinc-500">{phone}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Delivery address</p>
              {address ? (
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-800">
                  <span className="text-zinc-500">{address.label}: </span>
                  {address.address}
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-zinc-500">No address saved yet.</p>
              )}
            </div>
            <Link
              href="/shop/cart#delivery-address"
              className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-800"
            >
              {address ? "Change" : "Add"}
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-6">
          <Link
            href="/shop/help"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-900"
          >
            Help &amp; support
          </Link>
          <Link
            href="/shop/orders"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-800"
          >
            All orders
          </Link>
          <button
            type="button"
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-800"
            onClick={() => {
              clearSession();
              router.push("/login?next=/shop");
            }}
          >
            Log out
          </button>
        </div>
      </section>

      {ordersErr ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
          {ordersErr}
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-lg font-black text-zinc-900">Today&apos;s orders</h2>
        <p className="mt-1 text-xs font-medium text-zinc-500">Placed today in your timezone</p>
        {!ordersErr && todayOrders.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm font-medium text-zinc-500">
            No orders today
          </p>
        ) : ordersErr ? null : (
          <ul className="mt-4 space-y-3">
            {todayOrders.map((o) => (
              <OrderCard key={o.id} o={o} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-black text-zinc-900">Past orders</h2>
        <p className="mt-1 text-xs font-medium text-zinc-500">Earlier deliveries</p>
        {!ordersErr && pastOrders.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm font-medium text-zinc-500">
            No past orders yet
          </p>
        ) : ordersErr ? null : (
          <ul className="mt-4 space-y-3">
            {pastOrders.map((o) => (
              <OrderCard key={o.id} o={o} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
