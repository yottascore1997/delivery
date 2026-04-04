import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, SHOP_BUYER_ROLES } from "@/lib/auth";
import { OrderStatus, PaymentType } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { dec } from "@/lib/serialize";
import { getShopOrderingClosedMessage, isShopOrderingOpenNow } from "@/lib/shop-ordering-hours";
import { getStoreClosedByHoursMessage, isStoreWithinOpeningHours } from "@/lib/store-opening-hours";
import { getDeliveryFeePerOrder } from "@/lib/settings";
import { deliveryFeeForSubtotal } from "@/lib/free-delivery";

const MIN_ORDER_AMOUNT = 100;

const itemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const bodySchema = z.object({
  storeId: z.string(),
  items: z.array(itemSchema).min(1),
  paymentType: z.nativeEnum(PaymentType).default(PaymentType.COD),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, SHOP_BUYER_ROLES);
  if ("error" in auth) return auth.error;

  if (!isShopOrderingOpenNow()) {
    return jsonError(getShopOrderingClosedMessage(), 403);
  }

  try {
    const body = bodySchema.parse(await request.json());

    const store = await prisma.store.findFirst({
      where: { id: body.storeId, status: "APPROVED" },
    });
    if (!store) return jsonError("Store not available", 400);
    if (
      !isStoreWithinOpeningHours(
        store.openingHoursEnabled,
        store.openingTime,
        store.closingTime,
      )
    ) {
      return jsonError(
        getStoreClosedByHoursMessage(store.openingTime, store.closingTime),
        403,
      );
    }

    // Prisma client types may lag until `prisma generate` is run after schema changes.
    const addr = await (prisma as any).userAddress.findFirst({
      where: { userId: auth.user.id, isDefault: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!addr) return jsonError("Set delivery address before ordering", 400);

    const feePerOrder = await getDeliveryFeePerOrder();

    const order = await prisma.$transaction(async (tx) => {
      const lines: { productId: string; quantity: number; price: number }[] = [];
      let total = 0;

      for (const line of body.items) {
        const product = await tx.product.findFirst({
          where: {
            id: line.productId,
            storeId: body.storeId,
            isActive: true,
          } as any,
        });
        if (!product) {
          throw new Error(`Product ${line.productId} not found`);
        }
        if (product.stock < line.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const unit = dec(product.price);
        total += unit * line.quantity;
        lines.push({
          productId: product.id,
          quantity: line.quantity,
          price: unit,
        });
      }

      if (total < MIN_ORDER_AMOUNT) {
        throw new Error(
          `Minimum order amount is Rs ${MIN_ORDER_AMOUNT}. Please add more items.`,
        );
      }

      const deliveryFee = deliveryFeeForSubtotal(total, feePerOrder, true);
      const grandTotal = Math.round((total + deliveryFee) * 100) / 100;

      const created = await tx.order.create({
        data: {
          userId: auth.user.id,
          storeId: body.storeId,
          totalAmount: grandTotal,
          status: OrderStatus.PLACED,
          paymentType: body.paymentType,
          deliveryAddress: addr.address,
          deliveryLat: addr.latitude,
          deliveryLng: addr.longitude,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              price: l.price,
            })),
          },
        } as any,
        include: { items: true },
      });

      for (const line of body.items) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }

      return created;
    });

    return jsonOk({
      order: {
        id: order.id,
        status: order.status,
        totalAmount: dec(order.totalAmount),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    if (e instanceof Error) return jsonError(e.message);
    return jsonError("Order failed");
  }
}
