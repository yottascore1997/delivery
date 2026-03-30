import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as OrderStatus | null;
  const limit = Math.min(Number(searchParams.get("limit") ?? "40"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const where =
    status && Object.values(OrderStatus).includes(status)
      ? { status }
      : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true } },
        delivery: {
          include: {
            deliveryBoy: { select: { id: true, name: true, phone: true } },
          },
        },
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
      store: o.store,
      user: o.user,
      delivery: o.delivery,
    })),
    total,
    limit,
    offset,
  });
}
