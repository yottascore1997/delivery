/** Items subtotal (before delivery) — at or above this, delivery charge is ₹0 */
export const FREE_DELIVERY_MIN_SUBTOTAL = 399;

/** Server + client: delivery line for shop carts (single-store order). */
export function deliveryFeeForSubtotal(
  itemsSubtotal: number,
  feePerOrder: number,
  cartHasLines: boolean,
  minFree: number = FREE_DELIVERY_MIN_SUBTOTAL,
): number {
  if (!cartHasLines) return 0;
  if (itemsSubtotal >= minFree) return 0;
  return feePerOrder;
}
