import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";

const patchSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Customer profile update (name). */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request, [UserRole.CUSTOMER]);
  if ("error" in auth) return auth.error;

  try {
    const body = patchSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { name: body.name.trim() },
      select: { id: true, name: true, phone: true, role: true, imageUrl: true },
    });
    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        imageUrl: user.imageUrl ?? null,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

