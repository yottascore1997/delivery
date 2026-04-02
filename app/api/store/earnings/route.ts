import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { getCommissionPercent } from "@/lib/settings";
import { effectiveProductCommissionPercent } from "@/lib/product-pricing";
import { istDayStart, istMondayStart, istMonthStart } from "@/lib/ist-calendar";

export async function OPTIONS() {
  return emptyOptions();
}

type ItemRow = {
  quantity: number;
  price: Parameters<typeof dec>[0];
  product: { commissionPercent: number | null };
};

type OrderRow = { createdAt: Date; items: ItemRow[] };

function summarizeDelivered(
  orders: OrderRow[],
  storePct: number | null,
  platformDefault: number,
) {
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
  return {
    deliveredOrders: orders.length,
    gross: Math.round(gross * 100) / 100,
    commissionPercent: blendedCommissionPercent,
    platformCommissionTotal: Math.round(platformCut * 100) / 100,
    estimatedNet: Math.round(net * 100) / 100,
  };
}

/**
 * Delivered-order earnings: item gross minus platform %.
 * `today` / `thisWeek` / `thisMonth` use Asia/Kolkata calendar boundaries.
 */
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
      createdAt: true,
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

  const now = new Date();
  const todayStart = istDayStart(now);
  const weekStart = istMondayStart(now);
  const monthStart = istMonthStart(now);

  const todayOrders = orders.filter((o) => o.createdAt >= todayStart && o.createdAt <= now);
  const weekOrders = orders.filter((o) => o.createdAt >= weekStart && o.createdAt <= now);
  const monthOrders = orders.filter((o) => o.createdAt >= monthStart && o.createdAt <= now);

  const allTime = summarizeDelivered(orders, storePct, platformDefault);
  const today = summarizeDelivered(todayOrders, storePct, platformDefault);
  const thisWeek = summarizeDelivered(weekOrders, storePct, platformDefault);
  const thisMonth = summarizeDelivered(monthOrders, storePct, platformDefault);

  return jsonOk({
    storeId,
    allTime,
    today,
    thisWeek,
    thisMonth,
    /** @deprecated use allTime — kept for older clients */
    deliveredOrders: allTime.deliveredOrders,
    gross: allTime.gross,
    commissionPercent: allTime.commissionPercent,
    platformCommissionTotal: allTime.platformCommissionTotal,
    estimatedNet: allTime.estimatedNet,
  });
}
