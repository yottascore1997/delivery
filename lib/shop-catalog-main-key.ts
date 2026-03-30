import type { ShopVerticalSlug } from "@/lib/shop-verticals";

/** Maps shop URL vertical slug → `mainKey` for `/api/master/catalog`. */
export function verticalToCatalogMainKey(slug: ShopVerticalSlug): string {
  if (slug === "food") return "food-beverages";
  return slug;
}
