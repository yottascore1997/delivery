import { prisma } from "@/lib/prisma";
import { requireAuth, SHOP_BUYER_ROLES } from "@/lib/auth";
import { dec } from "@/lib/serialize";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, SHOP_BUYER_ROLES);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        store: { select: { id: true, name: true, address: true, shopVertical: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true, imageUrl2: true, mrp: true } },
          },
        },
        delivery: true,
      },
    }),
    prisma.order.count({ where: { userId: auth.user.id } }),
  ]);

  return jsonOk({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      paymentType: o.paymentType,
      totalAmount: dec(o.totalAmount),
      createdAt: o.createdAt,
      store: o.store,
      items: o.items.map((i) => ({
        quantity: i.quantity,
        price: dec(i.price),
        product: {
          id: i.product.id,
          name: i.product.name,
          imageUrl: i.product.imageUrl,
          imageUrl2: i.product.imageUrl2,
          mrp: i.product.mrp != null ? dec(i.product.mrp) : null,
        },
      })),
      delivery: o.delivery
        ? { id: o.delivery.id, status: o.delivery.status }
        : null,
    })),
    total,
    limit,
    offset,
  });
}
