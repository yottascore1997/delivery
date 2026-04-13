/**
 * Master main “cover” image — same rule as shop home featured cards: first subcategory with `imageUrl`.
 */
export const SHOP_MAIN_COVER_FALLBACK =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80";

export type ShopMainCoverSub = { imageUrl?: string | null };
export type ShopMainCoverMain = { subcategories: ShopMainCoverSub[] };

export function resolveShopMainCoverImage(main: ShopMainCoverMain): string {
  const hit = main.subcategories.find((s) => s.imageUrl?.trim());
  if (hit?.imageUrl?.trim()) return hit.imageUrl.trim();
  return SHOP_MAIN_COVER_FALLBACK;
}
