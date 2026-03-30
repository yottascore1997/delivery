import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Stores owned by the authenticated store owner (any status). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const stores = await prisma.store.findMany({
    where: { ownerId: auth.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      imageUrl: true,
      imageUrl2: true,
      shopVertical: true,
      openingHoursEnabled: true,
      openingTime: true,
      closingTime: true,
      categories: { select: { id: true, name: true } },
    },
  });

  return jsonOk({ stores });
}
