import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  orderId: z.string(),
  deliveryBoyId: z.string(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Admin manually assigns a delivery partner to a READY order. */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());

    const boy = await prisma.user.findFirst({
      where: { id: body.deliveryBoyId, role: UserRole.DELIVERY },
    });
    if (!boy) return jsonError("Invalid delivery user", 400);

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { delivery: true },
    });
    if (!order) return jsonError("Order not found", 404);
    if (order.status !== OrderStatus.READY) {
      return jsonError("Order must be READY before assignment", 400);
    }
    if (order.delivery) {
      return jsonError("Delivery already assigned", 400);
    }

    await prisma.$transaction([
      prisma.delivery.create({
        data: {
          orderId: order.id,
          deliveryBoyId: body.deliveryBoyId,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.OUT_FOR_DELIVERY },
      }),
    ]);

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
