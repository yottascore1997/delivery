import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, DeliveryStatus } from "@prisma/client";
import { jsonOk, emptyOptions } from "@/lib/api-response";
import { getDeliveryFeePerOrder } from "@/lib/settings";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.DELIVERY]);
  if ("error" in auth) return auth.error;

  const count = await prisma.delivery.count({
    where: {
      deliveryBoyId: auth.user.id,
      status: DeliveryStatus.DELIVERED,
    },
  });

  const fee = await getDeliveryFeePerOrder();
  return jsonOk({
    completedDeliveries: count,
    feePerOrder: fee,
    estimatedEarnings: Math.round(count * fee * 100) / 100,
  });
}
