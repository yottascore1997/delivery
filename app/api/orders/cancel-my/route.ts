import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, SHOP_BUYER_ROLES } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  orderId: z.string().min(1),
});

/** Minutes after placing during which the customer may self-cancel (owner-tunable via env). */
function customerCancelWindowMinutes(): number {
  const n = Number(process.env.CUSTOMER_ORDER_CANCEL_MINUTES ?? "15");
  if (!Number.isFinite(n) || n < 1) return 15;
  return Math.min(Math.floor(n), 120);
}

function escalationKey(orderId: string) {
  return `order_escalation_${orderId}`;
}

export async function OPTIONS() {
  return emptyOptions();
}

/**
 * Customer self-cancellation — strict rules so owners are not harmed:
 * - Must be the order's buyer (userId match).
 * - Status must still be PLACED (store has not moved to PREPARING / READY / etc.).
 * - No delivery assignment yet.
 * - Within CUSTOMER_ORDER_CANCEL_MINUTES of createdAt (default 15).
 * Restores product stock like admin cancel.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, SHOP_BUYER_ROLES);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const windowMin = customerCancelWindowMinutes();

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { delivery: true },
    });
    if (!order) return jsonError("Order not found", 404);
    if (order.userId !== auth.user.id) return jsonError("Forbidden", 403);

    if (order.status !== OrderStatus.PLACED) {
      return jsonError(
        "This order can’t be cancelled in the app anymore — the store has already started processing it. Please call the store if you need help.",
        400,
      );
    }

    if (order.delivery) {
      return jsonError("This order can’t be cancelled in the app — delivery is already involved. Please contact support.", 400);
    }

    const placedAt = order.createdAt.getTime();
    const deadline = placedAt + windowMin * 60_000;
    if (Date.now() > deadline) {
      return jsonError(
        `Free cancellation is only available within ${windowMin} minutes of placing the order. Please contact the store for anything after that.`,
        400,
      );
    }

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
      cancelWindowMinutes: windowMin,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input", 400);
    return jsonError("Could not cancel order", 500);
  }
}
