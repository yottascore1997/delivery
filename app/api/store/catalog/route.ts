import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { effectiveProductUnitLabel } from "@/lib/product-unit";

export async function OPTIONS() {
  return emptyOptions();
}

/** Full catalog for store owner (any store status). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return jsonError("storeId required");

  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: auth.user.id },
    include: {
      categories: {
        orderBy: { name: "asc" },
        include: {
          products: {
            orderBy: { name: "asc" },
            include: { masterProduct: { select: { unitLabel: true } } },
          },
        },
      },
    },
  });

  if (!store) return jsonError("Forbidden", 403);

  return jsonOk({
    store: {
      id: store.id,
      name: store.name,
      status: store.status,
      categories: store.categories.map((c) => ({
        id: c.id,
        name: c.name,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: dec(p.price),
          stock: p.stock,
          imageUrl: p.imageUrl,
          categoryId: p.categoryId,
          isActive: p.isActive,
          masterProductId: p.masterProductId,
          unitLabel: p.unitLabel ?? null,
          unitLabelHint: p.masterProduct?.unitLabel ?? null,
          unitLabelEffective: effectiveProductUnitLabel(
            p.unitLabel,
            p.masterProduct?.unitLabel,
          ),
        })),
      })),
    },
  });
}
