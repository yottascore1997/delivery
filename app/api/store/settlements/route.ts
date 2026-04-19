import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/serialize";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Store owner settlement visibility (read-only). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = (searchParams.get("storeId") ?? "").trim();
  if (!storeId) return jsonError("storeId required");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "30"), 1), 100);

  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: auth.user.id },
    select: { id: true, name: true },
  });
  if (!store) return jsonError("Forbidden", 403);

  const rows = await (prisma as any).storeSettlement.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const total = await (prisma as any).storeSettlement.count({ where: { storeId } });
  const pendingAmount = (rows as any[])
    .filter((r) => r.status !== "PAID")
    .reduce((sum, r) => sum + dec(r.netPayable), 0);

  return jsonOk({
    storeId,
    storeName: store.name,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    settlements: (rows as any[]).map((s: any) => ({
      id: s.id,
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
  });
}

