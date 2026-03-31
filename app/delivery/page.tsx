"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelShell } from "@/components/PanelShell";
import { api, getToken, getUser } from "@/lib/client-api";

type DeliveryRow = {
  id: string;
  status: string;
  order: {
    id: string;
    status: string;
    totalAmount: number;
    store: { name: string; address: string };
    user: { phone: string };
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
  };
};

const steps = ["ASSIGNED", "ACCEPTED", "PICKED_UP", "DELIVERED"] as const;

function stepIndex(s: string) {
  return steps.indexOf(s as (typeof steps)[number]);
}

export default function DeliveryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [earn, setEarn] = useState<{
    completedDeliveries: number;
    feePerOrder: number;
    estimatedEarnings: number;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const d = await api<{ deliveries: DeliveryRow[] }>("/api/delivery/mine");
    if (d.ok && d.data) setRows(d.data.deliveries);
    const e = await api<typeof earn>("/api/delivery/earnings");
    if (e.ok && e.data) setEarn(e.data);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (getUser()?.role !== "DELIVERY") {
      router.replace("/");
      return;
    }
    void load();
  }, [router]);

  async function advance(row: DeliveryRow) {
    const order: Record<string, string> = {
      ASSIGNED: "ACCEPTED",
      ACCEPTED: "PICKED_UP",
      PICKED_UP: "DELIVERED",
    };
    const next = order[row.status];
    if (!next) return;
    setMsg(null);
    const res = await api("/api/delivery/update-status", {
      method: "POST",
      body: JSON.stringify({ deliveryId: row.id, status: next }),
    });
    setMsg(res.ok ? `Done → ${next}` : res.error || "Error");
    await load();
  }

  return (
    <PanelShell
      title="Rider hub"
      subtitle="Pickup · deliver · earn"
      links={[
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin" },
        { href: "/store", label: "Store" },
      ]}
    >
      {earn && (
        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="ui-card bg-gradient-to-br from-rush-500 to-rush-600 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-white/80">
              Completed drops
            </p>
            <p className="font-display mt-2 text-4xl font-black">
              {earn.completedDeliveries}
            </p>
          </div>
          <div className="ui-card">
            <p className="text-xs font-bold uppercase text-stone-500">
              Fee / order
            </p>
            <p className="font-display mt-2 text-3xl font-black text-ink">
              ₹{earn.feePerOrder}
            </p>
          </div>
          <div className="ui-card border-fresh-200 bg-fresh-50/50">
            <p className="text-xs font-bold uppercase text-fresh-800">
              Est. earnings
            </p>
            <p className="font-display mt-2 text-3xl font-black text-fresh-700">
              ₹{earn.estimatedEarnings}
            </p>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl font-bold text-ink">
          Your runs
        </h2>
        <p className="text-sm text-stone-500">
          Swiggy-style flow — tap to move to next step
        </p>

        <ul className="mt-6 space-y-5">
          {rows.map((r) => {
            const idx = stepIndex(r.status);
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-card"
              >
                <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-bold leading-snug text-ink break-words sm:text-lg">
                        {r.order.store.name}
                      </p>
                      <p className="mt-1 max-w-xl text-sm text-stone-600 break-words">
                        {r.order.store.address}
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-display text-xl font-black text-fresh-600">
                        ₹{r.order.totalAmount}
                      </p>
                      <p className="text-xs text-stone-500">COD</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">
                    Customer ·{" "}
                    <span className="font-mono text-fresh-700">
                      {r.order.user.phone}
                    </span>
                  </p>
                  <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                      Drop address
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {r.order.deliveryAddress}
                    </p>
                    <a
                      className="mt-2 inline-block text-sm font-black text-rush-600 underline"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${r.order.deliveryLat},${r.order.deliveryLng}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>

                <div className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {steps.map((st, i) => {
                      const done = i <= idx;
                      const current = i === idx;
                      return (
                        <div
                          key={st}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            done
                              ? current
                                ? "bg-rush-500 text-white"
                                : "bg-fresh-100 text-fresh-800"
                              : "bg-stone-100 text-stone-400"
                          }`}
                        >
                          {done ? "✓" : "○"} {st.replace("_", " ")}
                        </div>
                      );
                    })}
                  </div>

                  {r.status !== "DELIVERED" && (
                    <button
                      type="button"
                      onClick={() => void advance(r)}
                      className="ui-btn-primary mt-5 w-full !rounded-2xl !py-4"
                    >
                      {r.status === "ASSIGNED" && "Accept order"}
                      {r.status === "ACCEPTED" && "Picked up from store"}
                      {r.status === "PICKED_UP" && "Delivered to customer"}
                    </button>
                  )}
                  {r.status === "DELIVERED" && (
                    <p className="mt-4 text-center text-sm font-bold text-fresh-600">
                      ✓ Completed — great job!
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          {!rows.length && (
            <li className="ui-card py-16 text-center text-stone-500">
              <p className="text-4xl">🛵</p>
              <p className="mt-4 font-medium">No assignments yet</p>
              <p className="mt-1 text-sm">
                Admin will assign READY orders to you
              </p>
            </li>
          )}
        </ul>
      </section>

      {msg && (
        <div className="mt-8 rounded-2xl border border-rush-200 bg-rush-50 px-4 py-3 text-sm font-medium text-rush-900">
          {msg}
        </div>
      )}
    </PanelShell>
  );
}
