import { prisma } from "@/lib/prisma";
import { verticalToCatalogMainKey } from "@/lib/shop-catalog-main-key";
import { SHOP_VERTICAL_LABELS, isShopVerticalSlug } from "@/lib/shop-verticals";

export type ShopCategoryContext = {
  routeSlug: string;
  catalogMainKey: string;
  title: string;
};

/**
 * Compare URL slug to DB keys when they differ only by punctuation (e.g. `snacks-%26-instant-food`
 * vs `snacks-instant-food`).
 */
export function compactCategorySlugKey(raw: string): string {
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep s */
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Resolve URL segment → catalog API key + display title (built-in vertical or admin master main). */
export async function resolveShopCategoryContext(
  slug: string,
): Promise<ShopCategoryContext | null> {
  const s = slug.trim();
  if (!s) return null;

  if (isShopVerticalSlug(s)) {
    return {
      routeSlug: s,
      catalogMainKey: verticalToCatalogMainKey(s),
      title: SHOP_VERTICAL_LABELS[s],
    };
  }

  const mains = await prisma.masterMainCategory.findMany({
    select: { key: true, name: true },
  });

  const lower = s.toLowerCase();
  let main =
    mains.find((m) => m.key.trim().toLowerCase() === lower) ??
    mains.find((m) => compactCategorySlugKey(m.key) === compactCategorySlugKey(s));

  if (!main) return null;

  return {
    routeSlug: main.key,
    catalogMainKey: main.key,
    title: main.name,
  };
}
