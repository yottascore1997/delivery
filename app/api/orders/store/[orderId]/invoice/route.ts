import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { emptyOptions, jsonError } from "@/lib/api-response";
import { generateOrderInvoicePdf } from "@/lib/order-invoice-pdf";

export async function OPTIONS() {
  return emptyOptions();
}

/** PDF bill for store owner: Speedza branding only (no store name). */
export async function GET(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { orderId } = params;
  if (!orderId?.trim()) return jsonError("Missing order id", 400);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      store: { ownerId: auth.user.id },
    },
    include: {
      user: { select: { name: true, phone: true } },
      items: {
        include: {
          product: { select: { name: true, mrp: true } },
        },
      },
    },
  });

  if (!order) return jsonError("Order not found", 404);

  const bytes = await generateOrderInvoicePdf({
    id: order.id,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    paymentType: order.paymentType,
    deliveryAddress: order.deliveryAddress,
    status: order.status,
    user: order.user,
    items: order.items,
  });

  const safeSuffix = order.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(-12) || order.id.slice(0, 8);

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="speedza-order-${safeSuffix}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
