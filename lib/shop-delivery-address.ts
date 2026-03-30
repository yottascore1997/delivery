"use client";

/** Fired when user saves / updates delivery address on cart (header should refetch). */
export const DELIVERY_ADDRESS_UPDATED_EVENT = "dlf-delivery-address";

export function emitDeliveryAddressUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DELIVERY_ADDRESS_UPDATED_EVENT));
}
