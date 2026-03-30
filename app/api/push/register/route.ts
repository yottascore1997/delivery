import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({ token: z.string().min(10) });

export async function OPTIONS() {
  return emptyOptions();
}

/** Store Expo push token (notifications stub — wire to Expo push service in production). */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    await prisma.pushToken.upsert({
      where: { token: body.token },
      create: { userId: auth.user.id, token: body.token },
      update: { userId: auth.user.id },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
