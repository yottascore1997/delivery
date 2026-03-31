import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  storeId: z.string(),
  categoryId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().default(""),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  imageUrl: z.string().max(2048).optional().nullable(),
  imageUrl2: z.string().max(2048).optional().nullable(),
  unitLabel: z.string().max(40).optional().nullable(),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER, UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
    });
    if (!store) return jsonError("Store not found", 404);
    if (
      auth.user.role === UserRole.STORE_OWNER &&
      store.ownerId !== auth.user.id
    ) {
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

    const unitTrim = body.unitLabel?.trim();
    const product = await prisma.product.create({
      data: {
        storeId: body.storeId,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description,
        price: body.price,
        stock: body.stock,
        imageUrl: imageUrl || null,
        imageUrl2: imageUrl2 || null,
        ...(unitTrim ? { unitLabel: unitTrim } : {}),
      },
    });

    return jsonOk({ product: { id: product.id, name: product.name } });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
