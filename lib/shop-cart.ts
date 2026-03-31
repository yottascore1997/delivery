/** Browser cart — same shape as delivery-app for consistency */

export type ShopCartLine = {
  productId: string;
  storeId: string;
  name: string;
  /** Optional product thumbnail (older carts may not have it). */
  imageUrl?: string | null;
  price: number;
  quantity: number;
  /** Pack / unit (e.g. 500 g, 1 pc) — optional for older cart JSON */
  unitLabel?: string | null;
};

const CART_KEY = "dlf_cart";

export function getShopCart(): ShopCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShopCartLine[];
  } catch {
    return [];
  }
}

export function setShopCart(lines: ShopCartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("dlf-cart"));
}

export function addToShopCart(
  line: Omit<ShopCartLine, "quantity"> & { quantity?: number },
) {
  let cart = getShopCart();
  if (cart.length && cart[0].storeId !== line.storeId) {
    cart = [];
  }
  const q = line.quantity ?? 1;
  const idx = cart.findIndex((l) => l.productId === line.productId);
  const nextUnit =
    line.unitLabel?.trim() ||
    (idx >= 0 ? cart[idx].unitLabel?.trim() : "") ||
    undefined;
  const nextImage =
    line.imageUrl?.trim() ||
    (idx >= 0 ? cart[idx].imageUrl?.trim() : "") ||
    undefined;
  if (idx >= 0) {
    cart[idx] = {
      ...cart[idx],
      quantity: cart[idx].quantity + q,
      ...(nextUnit ? { unitLabel: nextUnit } : {}),
      ...(nextImage ? { imageUrl: nextImage } : {}),
    };
  } else {
    cart.push({
      productId: line.productId,
      storeId: line.storeId,
      name: line.name,
      ...(line.imageUrl?.trim() ? { imageUrl: line.imageUrl.trim() } : {}),
      price: line.price,
      quantity: q,
      ...(line.unitLabel?.trim() ? { unitLabel: line.unitLabel.trim() } : {}),
    });
  }
  setShopCart(cart);
}

export function updateShopLineQty(productId: string, quantity: number) {
  const cart = getShopCart();
  const idx = cart.findIndex((l) => l.productId === productId);
  if (idx < 0) return;
  if (quantity <= 0) {
    cart.splice(idx, 1);
  } else {
    cart[idx] = { ...cart[idx], quantity };
  }
  setShopCart(cart);
}

export function clearShopCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("dlf-cart"));
}

export function shopCartTotal(lines: ShopCartLine[]) {
  return lines.reduce((s, l) => s + l.price * l.quantity, 0);
}
