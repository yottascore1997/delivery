import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { publicProductPricingFields } from "@/lib/product-pricing";
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

  return jsonOk({
    store: {
      openingHours: storeOpeningHoursPublic(store),
    },
    products: items.map((p) => {
      const pricing = publicProductPricingFields({ price: p.price, mrp: p.mrp });
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: pricing.price,
        mrp: pricing.mrp,
        discountPercent: pricing.discountPercent,
        stock: p.stock,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        unitLabel: effectiveProductUnitLabel(
          p.unitLabel,
          p.masterProduct?.unitLabel,
        ),
      };
    }),
    total,
    limit,
    offset,
  });
}
