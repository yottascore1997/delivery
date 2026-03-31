import { prisma } from "@/lib/prisma";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/**
 * Public master catalog (categories + products).
 * Used by store panel to import template products quickly.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawKey = (searchParams.get("mainKey") ?? "grocery").trim();
  const normalized = rawKey.toLowerCase();
  const mainKey =
    normalized === "food"
      ? "food-beverages"
      : normalized === "fruits-veg"
        ? "fruits-vegetables"
        : rawKey;

  const main = await prisma.masterMainCategory.findFirst({
    where: { key: mainKey.trim().toLowerCase() },
    select: { id: true, key: true, name: true },
  });
  if (!main) {
    return jsonOk({ mainKey, categories: [] });
  }

  const categories = await prisma.masterCategory.findMany({
    where: { mainCategoryId: main.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return jsonOk({
    mainCategory: { id: main.id, key: main.key, name: main.name },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      products: c.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        unitLabel: p.unitLabel,
        sortOrder: p.sortOrder,
        masterCategoryId: p.masterCategoryId,
      })),
    })),
  });
}

