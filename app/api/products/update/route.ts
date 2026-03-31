import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  productId: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().max(2048).optional().nullable(),
  imageUrl2: z.string().max(2048).optional().nullable(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  unitLabel: z.string().max(40).optional().nullable(),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER, UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      include: { store: true },
    });
    if (!product) return jsonError("Product not found", 404);
    if (
      auth.user.role === UserRole.STORE_OWNER &&
      product.store.ownerId !== auth.user.id
    ) {
      return jsonError("Forbidden", 403);
    }

    const cdn = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");
    let imageUrl = body.imageUrl;
    if (imageUrl && cdn && !imageUrl.startsWith("http")) {
      imageUrl = `${cdn}/${String(imageUrl).replace(/^\//, "")}`;
    }
    let imageUrl2 = body.imageUrl2;
    if (imageUrl2 && cdn && !String(imageUrl2).startsWith("http")) {
      imageUrl2 = `${cdn}/${String(imageUrl2).replace(/^\//, "")}`;
    }

    const updated = await prisma.product.update({
      where: { id: body.productId },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.description != null ? { description: body.description } : {}),
        ...(body.price != null ? { price: body.price } : {}),
        ...(body.stock != null ? { stock: body.stock } : {}),
        ...(body.categoryId != null ? { categoryId: body.categoryId } : {}),
        ...(body.imageUrl !== undefined
          ? { imageUrl: imageUrl || null }
          : {}),
        ...(body.imageUrl2 !== undefined
          ? { imageUrl2: imageUrl2 || null }
          : {}),
        ...(body.isActive != null ? { isActive: body.isActive } : {}),
        ...(body.unitLabel !== undefined
          ? {
              unitLabel:
                body.unitLabel == null || body.unitLabel.trim() === ""
                  ? null
                  : body.unitLabel.trim(),
            }
          : {}),
      },
    });

    return jsonOk({ product: { id: updated.id, name: updated.name } });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
