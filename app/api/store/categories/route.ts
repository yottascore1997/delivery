import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  storeId: z.string(),
  name: z.string().min(1).max(120),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const store = await prisma.store.findFirst({
      where: { id: body.storeId, ownerId: auth.user.id },
    });
    if (!store) return jsonError("Forbidden", 403);

    const cat = await prisma.category.create({
      data: { storeId: body.storeId, name: body.name },
    });
    return jsonOk({ category: { id: cat.id, name: cat.name } });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
