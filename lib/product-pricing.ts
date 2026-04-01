import { dec } from "@/lib/serialize";

/** Rounded whole-number % off MRP when selling below MRP. */
export function customerDiscountPercent(
  mrp: number,
  sellingPrice: number,
): number | null {
  if (!(mrp > 0) || !(sellingPrice > 0) || mrp < sellingPrice) return null;
  if (mrp <= sellingPrice) return null;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

export function decMaybe(v: unknown): number | null {
  if (v == null) return null;
  const n = dec(v as never);
  return n > 0 ? n : null;
}

/** Public API shape for shop UIs. */
export function publicProductPricingFields(p: {
  price: Parameters<typeof dec>[0];
  mrp?: Parameters<typeof dec>[0] | null;
}) {
  const selling = dec(p.price);
  const mrpNum = decMaybe(p.mrp);
  const mrpOut = mrpNum != null && mrpNum > 0 ? mrpNum : null;
  const discountPercent =
    mrpOut != null ? customerDiscountPercent(mrpOut, selling) : null;
  return {
    price: selling,
    mrp: mrpOut,
    discountPercent,
  };
}

/**
 * Platform % for one product line: product override wins, else store, else platform default.
 */
export function effectiveProductCommissionPercent(
  productCommission: number | null | undefined,
  storeCommission: number | null | undefined,
  platformDefault: number,
): number {
  if (typeof productCommission === "number" && !Number.isNaN(productCommission)) {
    return Math.min(100, Math.max(0, productCommission));
  }
  if (typeof storeCommission === "number" && !Number.isNaN(storeCommission)) {
    return Math.min(100, Math.max(0, storeCommission));
  }
  return Math.min(100, Math.max(0, platformDefault));
}
