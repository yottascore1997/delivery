import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { publicProductPricingFields } from "@/lib/product-pricing";

export async function OPTIONS() {
  return emptyOptions();
}

function storeVerticalToMainKey(v: string) {
  return v === "food" ? "food-beverages" : v;
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

  // Auto-sync: ensure store categories exist for admin master subcategories.
  // This keeps Store panel aligned with Admin-managed catalog, without exposing "create category" UI in store.
  try {
    const mainKey = storeVerticalToMainKey(store.shopVertical || "grocery");
    const master = await prisma.masterMainCategory.findUnique({
      where: { key: mainKey },
      select: { subcategories: { select: { name: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (master?.subcategories?.length) {
      const have = new Set(store.categories.map((c) => c.name.trim()));
      const missing = master.subcategories
        .map((s) => s.name.trim())
        .filter((name) => name.length > 0 && !have.has(name));
      for (const name of missing) {
        // Best-effort; Category has no unique constraint, so we avoid duplicates by checking `have`.
        await prisma.category.create({ data: { storeId: store.id, name } });
        have.add(name);
      }
    }
  } catch {
    // best-effort sync; ignore failures
  }

  const fresh = await prisma.store.findFirst({
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
  if (!fresh) return jsonError("Forbidden", 403);

  return jsonOk({
    store: {
      id: fresh.id,
      name: fresh.name,
      status: fresh.status,
      categories: fresh.categories.map((c) => ({
        id: c.id,
        name: c.name,
        products: c.products.map((p) => {
          const pricing = publicProductPricingFields({
            price: p.price,
            mrp: p.mrp,
          });
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: pricing.price,
            mrp: pricing.mrp,
            discountPercent: pricing.discountPercent,
            commissionPercent:
              typeof p.commissionPercent === "number" ? p.commissionPercent : null,
            stock: p.stock,
            imageUrl: p.imageUrl,
            imageUrl2: (p as any).imageUrl2 ?? null,
            categoryId: p.categoryId,
            isActive: p.isActive,
            masterProductId: p.masterProductId,
            unitLabel: p.unitLabel ?? null,
            variantGroupId: p.variantGroupId ?? null,
            variantLabel: p.variantLabel ?? null,
            variantSort: p.variantSort,
            unitLabelHint: p.masterProduct?.unitLabel ?? null,
            unitLabelEffective: effectiveProductUnitLabel(
              p.unitLabel,
              p.masterProduct?.unitLabel,
            ),
          };
        }),
      })),
    },
  });
}
