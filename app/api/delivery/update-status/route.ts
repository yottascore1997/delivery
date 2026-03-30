import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, DeliveryStatus, OrderStatus } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  deliveryId: z.string(),
  status: z.nativeEnum(DeliveryStatus),
});

const nextDelivery: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  [DeliveryStatus.ASSIGNED]: [DeliveryStatus.ACCEPTED],
  [DeliveryStatus.ACCEPTED]: [DeliveryStatus.PICKED_UP],
  [DeliveryStatus.PICKED_UP]: [DeliveryStatus.DELIVERED],
};

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.DELIVERY, UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());

    const delivery = await prisma.delivery.findUnique({
      where: { id: body.deliveryId },
      include: { order: true },
    });
    if (!delivery) return jsonError("Delivery not found", 404);

    if (
      auth.user.role === UserRole.DELIVERY &&
      delivery.deliveryBoyId !== auth.user.id
    ) {
      return jsonError("Forbidden", 403);
    }

    const allowed = nextDelivery[delivery.status];
    if (!allowed?.includes(body.status)) {
      return jsonError("Invalid delivery status transition", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: { status: body.status },
      });
      if (body.status === DeliveryStatus.DELIVERED) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }
    });

    return jsonOk({
      delivery: { id: delivery.id, status: body.status },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
