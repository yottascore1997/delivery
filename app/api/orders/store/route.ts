import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

function parseDateParam(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Orders for stores owned by the authenticated store owner. */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));

  // Use relation filtering instead of prefetching store IDs.
  // This avoids edge cases where owner store listing and order storeId filtering diverge.
  const where = {
    store: {
      ownerId: auth.user.id,
      ...(storeId ? { id: storeId } : {}),
    },
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  } as const;

  const [orders, total, summaryRows] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        store: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
        delivery: { include: { deliveryBoy: { select: { name: true, phone: true } } } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["storeId"],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
  ]);

  const flags = await prisma.platformSetting.findMany({
    where: {
      key: {
        in: orders.map((o) => `order_escalation_${o.id}`),
      },
    },
    select: { key: true },
  });
  const flagged = new Set(flags.map((f) => f.key.replace("order_escalation_", "")));

  const totalOrders = summaryRows.reduce((n, r) => n + (r._count?._all ?? 0), 0);
  const totalRevenue = summaryRows.reduce(
    (s, r) => s + dec((r._sum?.totalAmount as any) ?? 0),
    0,
  );

  return jsonOk({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      storeRejected: flagged.has(o.id),
      totalAmount: dec(o.totalAmount),
      createdAt: o.createdAt,
      user: o.user,
      store: o.store,
      items: o.items.map((i) => ({
        quantity: i.quantity,
        price: dec(i.price),
        product: i.product,
      })),
      delivery: o.delivery,
    })),
    total,
    limit,
    offset,
    summary: {
      totalOrders,
      totalRevenue,
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
    },
  });
}
