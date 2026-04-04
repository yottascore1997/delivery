import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const variantLine = z
  .object({
    variantLabel: z.string().min(1).max(40),
    unitLabel: z.string().max(40).optional().nullable(),
    mrp: z.number().positive(),
    price: z.number().positive(),
    stock: z.number().int().min(0),
  })
  .refine((b) => b.mrp >= b.price, {
    message: "MRP must be greater than or equal to selling price",
  });

const bodySchema = z
  .object({
    storeId: z.string(),
    categoryId: z.string(),
    name: z.string().min(1).max(200),
    description: z.string().default(""),
    imageUrl: z.string().max(2048).optional().nullable(),
    imageUrl2: z.string().max(2048).optional().nullable(),
    commissionPercent: z.number().min(0).max(100).nullable().optional(),
    variants: z.array(variantLine).min(2).max(12),
  })
  .strict();

export async function OPTIONS() {
  return emptyOptions();
}

/** Create multiple SKUs (same name/photos) with pack options, e.g. Atta 3 kg + 5 kg. */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER, UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const store = await prisma.store.findUnique({ where: { id: body.storeId } });
    if (!store) return jsonError("Store not found", 404);
    if (auth.user.role === UserRole.STORE_OWNER && store.ownerId !== auth.user.id) {
      return jsonError("Forbidden", 403);
    }

    const cat = await prisma.category.findFirst({
      where: { id: body.categoryId, storeId: body.storeId },
    });
    if (!cat) return jsonError("Invalid category", 400);

    const cdn = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");
    let imageUrl = body.imageUrl?.trim() || null;
    if (imageUrl && cdn && !imageUrl.startsWith("http")) {
      imageUrl = `${cdn}/${imageUrl.replace(/^\//, "")}`;
    }
    let imageUrl2 = body.imageUrl2?.trim() || null;
    if (imageUrl2 && cdn && !imageUrl2.startsWith("http")) {
      imageUrl2 = `${cdn}/${imageUrl2.replace(/^\//, "")}`;
    }

    const variantGroupId = randomUUID();

    const created = await prisma.$transaction(
      body.variants.map((v, idx) =>
        prisma.product.create({
          data: {
            storeId: body.storeId,
            categoryId: body.categoryId,
            name: body.name.trim(),
            description: body.description,
            mrp: v.mrp,
            price: v.price,
            stock: v.stock,
            imageUrl: imageUrl || null,
            imageUrl2: imageUrl2 || null,
            variantGroupId,
            variantLabel: v.variantLabel.trim(),
            variantSort: idx,
            ...(v.unitLabel?.trim() ? { unitLabel: v.unitLabel.trim().slice(0, 40) } : {}),
            ...(body.commissionPercent != null ? { commissionPercent: body.commissionPercent } : {}),
          },
        }),
      ),
    );

    return jsonOk({
      variantGroupId,
      products: created.map((p) => ({ id: p.id, variantLabel: p.variantLabel })),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    const msg = e instanceof Error ? e.message : "Invalid request";
    return jsonError(msg);
  }
}
