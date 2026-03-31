import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

const bodySchema = z.object({
  storeId: z.string(),
  /** Null/undefined clears override (falls back to platform default). */
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    // Prisma client types may lag until `prisma generate` after schema changes.
    const store = await (prisma as any).store.update({
      where: { id: body.storeId },
      data: {
        commissionPercent:
          body.commissionPercent == null ? null : Number(body.commissionPercent),
      },
      select: { id: true, commissionPercent: true },
    });
    return jsonOk({ store });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

