import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { collapseProductsForStorefront } from "@/lib/collapse-product-variants";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

/** Paginated products for a store (public for approved stores). */
export async function GET(
  request: Request,
  { params }: { params: { storeId: string } },
) {
  const storeId = params.storeId;
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const store = await prisma.store.findFirst({
    where: { id: storeId, status: "APPROVED" },
  });
  if (!store) return jsonError("Store not found", 404);

  const where = {
    storeId,
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        category: true,
        masterProduct: { select: { unitLabel: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const flat = items.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    unitLabel: p.unitLabel,
    masterProduct: p.masterProduct,
    variantGroupId: p.variantGroupId,
    variantLabel: p.variantLabel,
    variantSort: p.variantSort,
  }));

  const collapsed = collapseProductsForStorefront(flat);

  return jsonOk({
    store: {
      openingHours: storeOpeningHoursPublic(store),
    },
    products: collapsed.map((p) => {
      const cat = items.find((i) => i.categoryId === p.categoryId)?.category;
      return {
        ...p,
        categoryName: cat?.name ?? "",
      };
    }),
    total,
    limit,
    offset,
  });
}
