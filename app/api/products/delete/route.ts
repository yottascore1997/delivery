import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({ productId: z.string() });

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
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

    await prisma.product.delete({ where: { id: body.productId } });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
