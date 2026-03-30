import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonOk, emptyOptions } from "@/lib/api-response";
import { getCommissionPercent } from "@/lib/settings";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const [
    users,
    stores,
    orders,
    deliveredOrders,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
    prisma.order.aggregate({
      where: { status: OrderStatus.DELIVERED },
      _sum: { totalAmount: true },
    }),
  ]);

  const gross = dec(revenueAgg._sum.totalAmount);
  const commissionPct = await getCommissionPercent();
  const platformCut = (gross * commissionPct) / 100;

  return jsonOk({
    users,
    stores,
    orders,
    deliveredOrders,
    revenue: {
      gross,
      commissionPercent: commissionPct,
      platformCommission: Math.round(platformCut * 100) / 100,
    },
  });
}
