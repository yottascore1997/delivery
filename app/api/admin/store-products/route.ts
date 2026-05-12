import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/serialize";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";
import { getCommissionPercent } from "@/lib/settings";
import { effectiveProductCommissionPercent } from "@/lib/product-pricing";

export async function OPTIONS() {
  return emptyOptions();
}

/** Admin store-level product audit: list + commission visibility. */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = (searchParams.get("storeId") ?? "").trim();
  if (!storeId) return jsonError("storeId required");

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      commissionPercent: true,
      owner: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!store) return jsonError("Store not found", 404);

  const products = await prisma.product.findMany({
    where: { storeId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  const deliveredOrders = await prisma.order.findMany({
    where: { storeId, status: "DELIVERED" },
    select: {
      id: true,
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { commissionPercent: true } },
        },
      },
    },
  });

  const platformDefault = await getCommissionPercent();
  const storeCommission =
    typeof store.commissionPercent === "number" && !Number.isNaN(store.commissionPercent)
      ? store.commissionPercent
      : null;

  let deliveredGross = 0;
  let deliveredPlatform = 0;
  for (const o of deliveredOrders) {
    for (const i of o.items) {
      const line = dec(i.price) * i.quantity;
      deliveredGross += line;
      const pct = effectiveProductCommissionPercent(
        i.product.commissionPercent,
        storeCommission,
        platformDefault,
      );
      deliveredPlatform += (line * pct) / 100;
    }
  }

  return jsonOk({
    store: {
      id: store.id,
      name: store.name,
      owner: store.owner,
      commissionPercent: storeCommission,
    },
    commissionSummary: {
      platformDefault,
      deliveredGross: Math.round(deliveredGross * 100) / 100,
      deliveredPlatformCommission: Math.round(deliveredPlatform * 100) / 100,
      deliveredEstimatedStoreNet: Math.round((deliveredGross - deliveredPlatform) * 100) / 100,
    },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      mrp: p.mrp != null ? dec(p.mrp) : null,
      price: dec(p.price),
      stock: p.stock,
      isActive: p.isActive,
      unitLabel: p.unitLabel ?? null,
      commissionPercent: p.commissionPercent ?? null,
      effectiveCommissionPercent: effectiveProductCommissionPercent(
        p.commissionPercent,
        storeCommission,
        platformDefault,
      ),
      createdAt: p.createdAt,
    })),
  });
}

