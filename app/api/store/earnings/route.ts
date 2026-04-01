import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { getCommissionPercent } from "@/lib/settings";
import { effectiveProductCommissionPercent } from "@/lib/product-pricing";

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
    select: { id: true, commissionPercent: true },
  });
  if (!store) return jsonError("Forbidden", 403);

  const orders = await prisma.order.findMany({
    where: { storeId, status: OrderStatus.DELIVERED },
    select: {
      id: true,
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { commissionPercent: true } },
        },
      },
    },
  });

  const platformDefault = await getCommissionPercent();
  const storePct =
    typeof store.commissionPercent === "number" && !Number.isNaN(store.commissionPercent)
      ? store.commissionPercent
      : null;

  let gross = 0;
  let platformCut = 0;

  for (const order of orders) {
    for (const item of order.items) {
      const lineGross = dec(item.price) * item.quantity;
      gross += lineGross;
      const pct = effectiveProductCommissionPercent(
        item.product.commissionPercent,
        storePct,
        platformDefault,
      );
      platformCut += (lineGross * pct) / 100;
    }
  }

  const net = gross - platformCut;
  const blendedCommissionPercent =
    gross > 0 ? Math.round((platformCut / gross) * 1000) / 10 : platformDefault;

  return jsonOk({
    storeId,
    deliveredOrders: orders.length,
    gross: Math.round(gross * 100) / 100,
    commissionPercent: blendedCommissionPercent,
    platformCommissionTotal: Math.round(platformCut * 100) / 100,
    estimatedNet: Math.round(net * 100) / 100,
  });
}
