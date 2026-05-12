import { dec } from "@/lib/serialize";
import { effectiveProductCommissionPercent } from "@/lib/product-pricing";

export type SettlementItem = {
  quantity: number;
  price: Parameters<typeof dec>[0];
  product: { commissionPercent: number | null };
};

export type SettlementOrder = {
  id: string;
  items: SettlementItem[];
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function settlementTotalsFromOrders(
  orders: SettlementOrder[],
  storeCommission: number | null,
  platformDefaultCommission: number,
) {
  let gross = 0;
  let platformCommission = 0;
  let lineCount = 0;

  for (const order of orders) {
    for (const item of order.items) {
      const lineGross = dec(item.price) * item.quantity;
      if (!(lineGross > 0)) continue;
      lineCount += 1;
      gross += lineGross;
      const pct = effectiveProductCommissionPercent(
        item.product.commissionPercent,
        storeCommission,
        platformDefaultCommission,
      );
      platformCommission += (lineGross * pct) / 100;
    }
  }

  const blendedCommissionPercent =
    gross > 0 ? round2((platformCommission / gross) * 100) : platformDefaultCommission;

  return {
    gross: round2(gross),
    platformCommission: round2(platformCommission),
    ordersCount: orders.length,
    lineCount,
    blendedCommissionPercent,
  };
}

