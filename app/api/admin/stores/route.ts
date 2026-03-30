import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, StoreStatus } from "@prisma/client";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** List stores (optional ?status=PENDING). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as StoreStatus | null;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const where =
    status && Object.values(StoreStatus).includes(status) ? { status } : {};

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.store.count({ where }),
  ]);

  return jsonOk({ stores, total, limit, offset });
}
