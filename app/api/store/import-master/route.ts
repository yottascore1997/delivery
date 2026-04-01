import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  storeId: z.string(),
  masterCategoryId: z.string(),
  products: z
    .array(
      z.object({
        masterProductId: z.string(),
        price: z.number().positive(),
      }),
    )
    .min(1),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Import products from master category into a store (store owner). */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());

    const store = await prisma.store.findFirst({
      where: { id: body.storeId, ownerId: auth.user.id },
    });
    if (!store) return jsonError("Forbidden", 403);

    const masterCategory = await prisma.masterCategory.findUnique({
      where: { id: body.masterCategoryId },
      include: { products: true },
    });
    if (!masterCategory) return jsonError("Master category not found", 404);

    const masterProducts = masterCategory.products;
    const byId = new Map(masterProducts.map((p) => [p.id, p]));

    // Create or reuse store category (same name)
    const storeCategory =
      (await prisma.category.findFirst({
        where: { storeId: body.storeId, name: masterCategory.name },
      })) ??
      (await prisma.category.create({
        data: { storeId: body.storeId, name: masterCategory.name },
      }));

    const rows = body.products
      .map((x) => {
        const mp = byId.get(x.masterProductId);
        if (!mp) return null;
        return {
          storeId: body.storeId,
          categoryId: storeCategory.id,
          masterProductId: mp.id,
          name: mp.name,
          description: mp.description ?? "",
          imageUrl: mp.imageUrl ?? null,
          imageUrl2: (mp as any).imageUrl2 ?? null,
          unitLabel: mp.unitLabel ?? null,
          price: x.price,
          mrp: x.price,
          stock: 100,
          isActive: true,
        };
      })
      .filter(Boolean) as {
      storeId: string;
      categoryId: string;
      masterProductId: string;
      name: string;
      description: string;
      imageUrl: string | null;
      imageUrl2: string | null;
      unitLabel: string | null;
      price: number;
      mrp: number;
      stock: number;
      isActive: boolean;
    }[];

    if (!rows.length) return jsonError("No valid products to import", 400);

    // Create new products, skipping ones already imported for that store.
    await prisma.product.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return jsonOk({
      ok: true,
      imported: rows.length,
      category: { id: storeCategory.id, name: storeCategory.name },
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

