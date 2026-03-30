import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(
  _request: Request,
  { params }: { params: { productId: string } },
) {
  const { productId } = params;
  if (!productId) return jsonError("productId required");

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          status: true,
          address: true,
          latitude: true,
          longitude: true,
          openingHoursEnabled: true,
          openingTime: true,
          closingTime: true,
        },
      },
      category: { select: { name: true } },
      masterProduct: { select: { unitLabel: true } },
    },
  });

  if (!product || product.store.status !== "APPROVED") {
    return jsonError("Product not found", 404);
  }

  return jsonOk({
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: dec(product.price),
      stock: product.stock,
      imageUrl: product.imageUrl,
      unitLabel: effectiveProductUnitLabel(
        product.unitLabel,
        product.masterProduct?.unitLabel,
      ),
      categoryName: product.category.name,
      store: {
        id: product.store.id,
        name: product.store.name,
        address: product.store.address,
        latitude: product.store.latitude,
        longitude: product.store.longitude,
        openingHours: storeOpeningHoursPublic(product.store),
      },
    },
  });
}
