import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, OrderStatus } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  orderId: z.string(),
  status: z.nativeEnum(OrderStatus),
});

function escalationKey(orderId: string) {
  return `order_escalation_${orderId}`;
}

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, [
    UserRole.STORE_OWNER,
    UserRole.ADMIN,
  ]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { store: true, delivery: true },
    });
    if (!order) return jsonError("Order not found", 404);

    if (body.status === OrderStatus.DELIVERED) {
      return jsonError("Use delivery flow to mark order delivered", 400);
    }

    if (auth.user.role === UserRole.STORE_OWNER) {
      if (order.store.ownerId !== auth.user.id) {
        return jsonError("Forbidden", 403);
      }
      if (body.status === OrderStatus.CANCELLED) {
        await prisma.platformSetting.upsert({
          where: { key: escalationKey(order.id) },
          create: {
            key: escalationKey(order.id),
            value: JSON.stringify({
              type: "STORE_REJECTED",
              byUserId: auth.user.id,
              at: new Date().toISOString(),
            }),
          },
          update: {
            value: JSON.stringify({
              type: "STORE_REJECTED",
              byUserId: auth.user.id,
              at: new Date().toISOString(),
            }),
          },
        });
        return jsonOk({
          order: {
            id: order.id,
            status: order.status,
            escalatedToAdmin: true,
          },
        });
      }
      const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
        [OrderStatus.PLACED]: [OrderStatus.PREPARING],
        [OrderStatus.PREPARING]: [OrderStatus.READY],
      };
      const next = allowed[order.status];
      if (!next?.includes(body.status)) {
        return jsonError("Invalid status transition for store", 400);
      }
    }

    if (
      body.status === OrderStatus.OUT_FOR_DELIVERY &&
      !order.delivery
    ) {
      return jsonError("Use /api/delivery/assign to ship the order", 400);
    }

    if (
      body.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      await prisma.$transaction(async (tx) => {
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id },
        });
        for (const it of items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
        await tx.platformSetting.deleteMany({
          where: { key: escalationKey(order.id) },
        });
      });
      return jsonOk({
        order: { id: order.id, status: OrderStatus.CANCELLED },
      });
    }

    const updated = await prisma.order.update({
      where: { id: body.orderId },
      data: { status: body.status },
    });

    await prisma.platformSetting.deleteMany({
      where: { key: escalationKey(order.id) },
    });

    return jsonOk({ order: { id: updated.id, status: updated.status } });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
