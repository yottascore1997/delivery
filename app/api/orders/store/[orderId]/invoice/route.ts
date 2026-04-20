import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { emptyOptions, jsonError } from "@/lib/api-response";
import { generateOrderInvoicePdf } from "@/lib/order-invoice-pdf";

export const runtime = "nodejs";

export async function OPTIONS() {
  return emptyOptions();
}

/** PDF bill for store owner/admin: Speedza branding only (no store name). */
export async function GET(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER, UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { orderId } = params;
  if (!orderId?.trim()) return jsonError("Missing order id", 400);

  const orderWhere =
    auth.user.role === UserRole.ADMIN
      ? { id: orderId }
      : { id: orderId, store: { ownerId: auth.user.id } };

  const order = await prisma.order.findFirst({
    where: orderWhere,
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

  let bytes: Uint8Array;
  try {
    bytes = await generateOrderInvoicePdf({
      id: order.id,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      paymentType: order.paymentType,
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      user: order.user,
      items: order.items,
    });
  } catch (e) {
    console.error("[invoice-pdf]", orderId, e);
    return jsonError("Could not generate PDF", 500);
  }

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
