export const SHOP_VERTICAL_SLUGS = [
  "grocery",
  "fruits-vegetables",
  "food",
  "electronics",
] as const;

export type ShopVerticalSlug = (typeof SHOP_VERTICAL_SLUGS)[number];

export function isShopVerticalSlug(s: string): s is ShopVerticalSlug {
  return (SHOP_VERTICAL_SLUGS as readonly string[]).includes(s);
}

export const SHOP_VERTICAL_LABELS: Record<ShopVerticalSlug, string> = {
  grocery: "Grocery",
  "fruits-vegetables": "Fruits & Vegetables",
  food: "Food",
  electronics: "Electronics",
};
