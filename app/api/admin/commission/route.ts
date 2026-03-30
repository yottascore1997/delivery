import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { getCommissionPercent, setSetting } from "@/lib/settings";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const commissionPercent = await getCommissionPercent();
  return jsonOk({ commissionPercent });
}

const patchSchema = z.object({
  commissionPercent: z.number().min(0).max(100),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = patchSchema.parse(await request.json());
    await setSetting("commission_percent", String(body.commissionPercent));
    return jsonOk({ commissionPercent: body.commissionPercent });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
