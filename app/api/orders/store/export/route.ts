import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { dec } from "@/lib/serialize";
import { emptyOptions, jsonError } from "@/lib/api-response";

function parseDateParam(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function OPTIONS() {
  return emptyOptions();
}

/** Export store orders as CSV (filtered by storeId + from/to). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? undefined;
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));
  const max = Math.min(Number(searchParams.get("limit") ?? "5000"), 20000);

  const stores = await prisma.store.findMany({
    where: { ownerId: auth.user.id },
    select: { id: true },
  });
  const ids = stores.map((s) => s.id);
  if (!ids.length) {
    return new Response("orderId,createdAt,status,totalAmount,customerName,customerPhone,items\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const where = {
    storeId: storeId && ids.includes(storeId) ? storeId : { in: ids },
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: max,
    include: {
      user: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (orders.length === 0) {
    return new Response("orderId,createdAt,status,totalAmount,customerName,customerPhone,items\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const header = [
    "orderId",
    "createdAt",
    "status",
    "totalAmount",
    "customerName",
    "customerPhone",
    "items",
  ];

  const rows = orders.map((o) => {
    const items = o.items
      .map((i) => `${i.quantity}x ${i.product.name}`)
      .join(" | ");
    return [
      o.id,
      o.createdAt.toISOString(),
      o.status,
      dec(o.totalAmount),
      o.user?.name ?? "",
      o.user?.phone ?? "",
      items,
    ].map(csvEscape);
  });

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";

  // Basic safety: avoid huge response if someone accidentally requests too much.
  if (csv.length > 8_000_000) {
    return jsonError("Export too large. Narrow date range or reduce limit.", 400);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

