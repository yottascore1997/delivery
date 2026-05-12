import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/serialize";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";
import { getCommissionPercent } from "@/lib/settings";
import { settlementTotalsFromOrders } from "@/lib/settlements";

const generateSchema = z.object({
  storeId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  refundAdjustment: z.number().optional().default(0),
  bonusAdjustment: z.number().optional().default(0),
  manualAdjustment: z.number().optional().default(0),
  notes: z.string().max(2000).optional(),
});

function asDate(raw: string): Date | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function OPTIONS() {
  return emptyOptions();
}

/** Admin list of settlements (latest first). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = (searchParams.get("storeId") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "80"), 1), 300);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const rows = await (prisma as any).storeSettlement.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      store: { select: { id: true, name: true } },
    },
  });

  const total = await (prisma as any).storeSettlement.count({
    where: {
      ...(storeId ? { storeId } : {}),
      ...(status ? { status } : {}),
    },
  });

  return jsonOk({
    settlements: (rows as any[]).map((s: any) => ({
      id: s.id,
      storeId: s.storeId,
      storeName: s.store?.name ?? "—",
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      status: s.status,
      grossAmount: dec(s.grossAmount),
      platformCommission: dec(s.platformCommission),
      refundAdjustment: dec(s.refundAdjustment),
      bonusAdjustment: dec(s.bonusAdjustment),
      manualAdjustment: dec(s.manualAdjustment),
      netPayable: dec(s.netPayable),
      ordersCount: s.ordersCount,
      blendedCommissionPct: s.blendedCommissionPct,
      paymentMode: s.paymentMode ?? null,
      referenceNo: s.referenceNo ?? null,
      paymentProofUrl: s.paymentProofUrl ?? null,
      notes: s.notes ?? null,
      createdAt: s.createdAt,
      approvedAt: s.approvedAt ?? null,
      paidAt: s.paidAt ?? null,
    })),
    total,
    limit,
    offset,
  });
}

/** Admin generates one settlement for a store+period from delivered, not-yet-settled orders. */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = generateSchema.parse(await request.json());
    const periodStart = asDate(body.periodStart);
    const periodEnd = asDate(body.periodEnd);
    if (!periodStart || !periodEnd) return jsonError("Invalid period dates");
    if (!(periodEnd > periodStart)) return jsonError("periodEnd must be after periodStart");

    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
      select: { id: true, commissionPercent: true, name: true },
    });
    if (!store) return jsonError("Store not found", 404);

    const deliveredOrders = await prisma.order.findMany({
      where: {
        storeId: body.storeId,
        status: "DELIVERED",
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      select: {
        id: true,
        items: {
          select: {
            quantity: true,
            price: true,
            product: { select: { commissionPercent: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!deliveredOrders.length) {
      return jsonError(
        "Selected period me koi delivered order nahi mila. Date range ya store check karein.",
      );
    }

    const settledMapRows = await (prisma as any).storeSettlementOrder.findMany({
      where: { orderId: { in: deliveredOrders.map((o) => o.id) } },
      select: { orderId: true },
    });
    const settledIds = new Set((settledMapRows as Array<{ orderId: string }>).map((r) => r.orderId));
    const eligibleOrders = deliveredOrders.filter((o) => !settledIds.has(o.id));
    if (!eligibleOrders.length) {
      return jsonError(
        "Is period ke delivered orders pehle hi settle ho chuke hain. Naya date range select karein.",
      );
    }

    const platformDefault = await getCommissionPercent();
    const storePct =
      typeof store.commissionPercent === "number" && !Number.isNaN(store.commissionPercent)
        ? store.commissionPercent
        : null;
    const base = settlementTotalsFromOrders(eligibleOrders, storePct, platformDefault);
    const refundAdj = body.refundAdjustment ?? 0;
    const bonusAdj = body.bonusAdjustment ?? 0;
    const manualAdj = body.manualAdjustment ?? 0;
    const netPayable = Math.round((base.gross - base.platformCommission - refundAdj + bonusAdj + manualAdj) * 100) / 100;

    const created = await prisma.$transaction(async (tx) => {
      const settlement = await (tx as any).storeSettlement.create({
        data: {
          storeId: body.storeId,
          periodStart,
          periodEnd,
          status: "DRAFT",
          grossAmount: base.gross,
          platformCommission: base.platformCommission,
          refundAdjustment: refundAdj,
          bonusAdjustment: bonusAdj,
          manualAdjustment: manualAdj,
          netPayable,
          ordersCount: eligibleOrders.length,
          blendedCommissionPct: base.blendedCommissionPercent,
          notes: body.notes?.trim() || null,
          createdByAdminId: auth.user.id,
        },
      });
      await (tx as any).storeSettlementOrder.createMany({
        data: eligibleOrders.map((o) => ({
          settlementId: settlement.id,
          orderId: o.id,
        })),
      });
      return settlement;
    });

    return jsonOk({
      settlement: {
        id: created.id,
        storeId: created.storeId,
        storeName: store.name,
        status: created.status,
        periodStart: created.periodStart,
        periodEnd: created.periodEnd,
        grossAmount: dec(created.grossAmount),
        platformCommission: dec(created.platformCommission),
        refundAdjustment: dec(created.refundAdjustment),
        bonusAdjustment: dec(created.bonusAdjustment),
        manualAdjustment: dec(created.manualAdjustment),
        netPayable: dec(created.netPayable),
        ordersCount: created.ordersCount,
        blendedCommissionPct: created.blendedCommissionPct,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Could not generate settlement");
  }
}

