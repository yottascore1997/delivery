import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Orders for stores owned by the authenticated store owner. */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const stores = await prisma.store.findMany({
    where: { ownerId: auth.user.id },
    select: { id: true },
  });
  const ids = stores.map((s) => s.id);
  if (!ids.length) {
    return jsonOk({ orders: [], total: 0, limit, offset });
  }

  const where = {
    storeId: storeId && ids.includes(storeId) ? storeId : { in: ids },
  };

  const [orders, total] = await Promise.all([
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
  });
}
