import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  storeId: z.string(),
  planId: z.string(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Attach a subscription plan to a store (MVP: no payment gateway). */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
    });
    if (!store || store.ownerId !== auth.user.id) {
      return jsonError("Forbidden", 403);
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: body.planId },
    });
    if (!plan) return jsonError("Plan not found", 404);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    const sub = await prisma.subscription.create({
      data: {
        storeId: store.id,
        planName: plan.name,
        price: plan.price,
        expiryDate,
      },
    });

    return jsonOk({
      subscription: {
        id: sub.id,
        planName: sub.planName,
        price: dec(sub.price),
        expiryDate: sub.expiryDate,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
