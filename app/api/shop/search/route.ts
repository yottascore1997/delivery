import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { publicProductPricingFields } from "@/lib/product-pricing";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? "24"), 60);
  if (q.length < 2) return jsonError("Search query must be at least 2 characters", 400);

  const stores = await prisma.store.findMany({
    where: {
      status: "APPROVED",
      OR: [{ name: { contains: q } }, { address: { contains: q } }],
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      name: true,
      address: true,
      imageUrl: true,
      latitude: true,
      longitude: true,
      shopVertical: true,
      openingHoursEnabled: true,
      openingTime: true,
      closingTime: true,
    },
  });

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      store: { status: "APPROVED" },
      OR: [{ name: { contains: q } }, { description: { contains: q } }, { category: { name: { contains: q } } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: { select: { name: true } },
      masterProduct: { select: { unitLabel: true } },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
          imageUrl: true,
          openingHoursEnabled: true,
          openingTime: true,
          closingTime: true,
        },
      },
    },
  });

  return jsonOk({
    query: q,
    stores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      imageUrl: s.imageUrl,
      shopVertical: s.shopVertical,
      latitude: s.latitude,
      longitude: s.longitude,
      openingHours: storeOpeningHoursPublic(s),
    })),
    products: products.map((p) => {
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
        unitLabel: effectiveProductUnitLabel(
          p.unitLabel,
          p.masterProduct?.unitLabel,
        ),
        categoryName: p.category.name,
        store: {
        id: p.store.id,
        name: p.store.name,
        address: p.store.address,
        imageUrl: p.store.imageUrl,
        openingHours: storeOpeningHoursPublic(p.store),
      },
    };
    }),
  });
}
