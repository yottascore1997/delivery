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

const BAR_COLORS = ["#d8b4fe", "#c026d3", "#6366f1"];

type OrderLite = { createdAt: string; status: string };

export function StoreCharts({
  orders,
  titleBar,
  titleDonut,
}: {
  orders: OrderLite[];
  titleBar: string;
  titleDonut: string;
}) {
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...orders].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    sorted.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, orders]) => ({
      name,
      target: Math.max(1, Math.round(orders * 0.85)),
      sales: orders,
      purchases: Math.max(0, orders - 1),
    }));
    return arr.slice(-6);
  }, [orders]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    const COLORS = [
      "#f59e0b",
      "#0ea5e9",
      "#8b5cf6",
      "#f97316",
      "#10b981",
      "#64748b",
    ];
    return Object.entries(counts).map(([name, value], i) => ({
      name: name.replace(/_/g, " "),
      value,
      color: COLORS[i % COLORS.length],
    }));
  }, [orders]);

  if (!orders.length) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={titleBar}>
          <p className="py-12 text-center text-sm text-zinc-500">
            No order data yet for charts
          </p>
        </ChartCard>
        <ChartCard title={titleDonut}>
          <p className="py-12 text-center text-sm text-zinc-500">
            No order data yet
          </p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title={titleBar}>
        <div className="h-[280px] w-full">
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
              <Bar dataKey="target" name="Target" fill={BAR_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="sales" name="Orders" fill={BAR_COLORS[1]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="Repeat" fill={BAR_COLORS[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <ChartCard title={titleDonut}>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
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
