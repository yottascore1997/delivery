import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { publicProductPricingFields } from "@/lib/product-pricing";
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

  const gid = product.variantGroupId?.trim();
  const siblings =
    gid != null && gid.length > 0
      ? await prisma.product.findMany({
          where: {
            storeId: product.storeId,
            variantGroupId: gid,
            isActive: true,
          },
          orderBy: [{ variantSort: "asc" }, { id: "asc" }],
          include: { masterProduct: { select: { unitLabel: true } } },
        })
      : [product];

  const variants = siblings.map((p) => {
    const pricing = publicProductPricingFields({ price: p.price, mrp: p.mrp });
    return {
      id: p.id,
      variantLabel: p.variantLabel?.trim() || null,
      price: pricing.price,
      mrp: pricing.mrp,
      discountPercent: pricing.discountPercent,
      stock: p.stock,
      unitLabel: effectiveProductUnitLabel(
        p.unitLabel,
        p.masterProduct?.unitLabel,
      ),
    };
  });

  const pricing = publicProductPricingFields({
    price: product.price,
    mrp: product.mrp,
  });

  return jsonOk({
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: pricing.price,
      mrp: pricing.mrp,
      discountPercent: pricing.discountPercent,
      stock: product.stock,
      imageUrl: product.imageUrl,
      imageUrl2: (product as any).imageUrl2 ?? null,
      unitLabel: effectiveProductUnitLabel(
        product.unitLabel,
        product.masterProduct?.unitLabel,
      ),
      categoryName: product.category.name,
      variants: variants.length > 1 ? variants : undefined,
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
