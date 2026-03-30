import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { getCommissionPercent } from "@/lib/settings";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return jsonError("storeId required");

  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: auth.user.id },
  });
  if (!store) return jsonError("Forbidden", 403);

  const orders = await prisma.order.findMany({
    where: { storeId, status: OrderStatus.DELIVERED },
    select: { totalAmount: true },
  });

  const gross = orders.reduce((s, o) => s + dec(o.totalAmount), 0);
  const commissionPct = await getCommissionPercent();
  const net = gross - (gross * commissionPct) / 100;

  return jsonOk({
    storeId,
    deliveredOrders: orders.length,
    gross: Math.round(gross * 100) / 100,
    commissionPercent: commissionPct,
    estimatedNet: Math.round(net * 100) / 100,
  });
}
