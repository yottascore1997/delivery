import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Assigned deliveries for the logged-in delivery partner. */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.DELIVERY]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const [rows, total] = await Promise.all([
    (prisma as any).delivery.findMany({
      where: { deliveryBoyId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        order: {
          include: {
            store: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
            user: { select: { id: true, name: true, phone: true } },
            items: {
              include: { product: { select: { name: true } } },
            },
          },
        },
      },
    }),
    (prisma as any).delivery.count({ where: { deliveryBoyId: auth.user.id } }),
  ]);

  return jsonOk({
    deliveries: (rows as any[]).map((d: any) => ({
      id: d.id,
      status: d.status,
      order: {
        id: d.order.id,
        status: d.order.status,
        totalAmount: dec(d.order.totalAmount),
        store: d.order.store,
        user: d.order.user,
        deliveryAddress: d.order.deliveryAddress,
        deliveryLat: d.order.deliveryLat,
        deliveryLng: d.order.deliveryLng,
        items: d.order.items.map((i: any) => ({
          quantity: i.quantity,
          productName: i.product.name,
        })),
      },
    })),
    total,
    limit,
    offset,
  });
}
