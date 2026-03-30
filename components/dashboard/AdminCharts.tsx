"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stats = {
  users: number;
  stores: number;
  orders: number;
  deliveredOrders: number;
};

type OrderLite = { status: string };

export function AdminCharts({
  stats,
  orders,
  titleBar,
  titleDonut,
}: {
  stats: Stats | null;
  orders: OrderLite[];
  titleBar: string;
  titleDonut: string;
}) {
  const barData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Users", target: Math.round(stats.users * 0.9), sales: stats.users, extra: stats.stores },
      { name: "Stores", target: Math.round(stats.stores * 0.85), sales: stats.stores, extra: stats.orders },
      { name: "Orders", target: Math.round(stats.orders * 0.8), sales: stats.orders, extra: stats.deliveredOrders },
      { name: "Done", target: Math.round(stats.deliveredOrders * 0.9), sales: stats.deliveredOrders, extra: stats.users },
    ];
  }, [stats]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    const COLORS = ["#f59e0b", "#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#64748b"];
    return Object.entries(counts).map(([name, value], i) => ({
      name: name.replace(/_/g, " "),
      value,
      color: COLORS[i % COLORS.length],
    }));
  }, [orders]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title={titleBar}>
        <div className="h-[280px] w-full">
          {stats && barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#71717a" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#71717a" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Bar dataKey="target" name="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" name="Actual" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="extra" name="Related" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-500">Loading…</p>
          )}
        </div>
      </ChartCard>
      <ChartCard title={titleDonut}>
        <div className="h-[280px] w-full">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-500">
              Assign riders to see more order mix
            </p>
          )}
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <h3 className="font-display text-base font-bold text-zinc-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
