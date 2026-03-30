import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { price: "asc" },
  });
  return jsonOk({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: dec(p.price),
      durationDays: p.durationDays,
    })),
  });
}

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  durationDays: z.number().int().positive(),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = planSchema.parse(await request.json());
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: body.name,
        price: body.price,
        durationDays: body.durationDays,
      },
    });
    return jsonOk({
      plan: {
        id: plan.id,
        name: plan.name,
        price: dec(plan.price),
        durationDays: plan.durationDays,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
