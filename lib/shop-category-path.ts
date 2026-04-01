/** URL segment for `/shop/category/[slug]` — aligns with `resolveShopCategoryContext`. */
export function shopCategoryPathKeyFromMainKey(key: string): string {
  const k = key.trim();
  if (k.toLowerCase() === "food-beverages") return "food";
  return k;
}
