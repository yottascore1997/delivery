import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/serialize";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";

const bodySchema = z.object({
  status: z.enum(["APPROVED", "PAID", "FAILED"]),
  referenceNo: z.string().max(128).optional(),
  paymentMode: z.enum(["CASH", "CHEQUE", "ONLINE"]).optional(),
  paymentProofUrl: z.string().max(2048).optional(),
  notes: z.string().max(2000).optional(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Admin settlement state transitions (DRAFT->APPROVED->PAID). */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { id } = params;
  if (!id) return jsonError("id required");

  try {
    const body = bodySchema.parse(await request.json());
    const current = await (prisma as any).storeSettlement.findUnique({
      where: { id },
    });
    if (!current) return jsonError("Settlement not found", 404);

    const from = current.status as string;
    const to = body.status;
    if (from === "PAID") return jsonError("Paid settlement is locked");
    if (to === "APPROVED" && !["DRAFT", "FAILED"].includes(from)) {
      return jsonError(`Cannot approve from ${from}`);
    }
    if (to === "PAID" && from !== "APPROVED") {
      return jsonError("Only APPROVED settlement can be marked PAID");
    }
    if (to === "PAID" && !(body.referenceNo ?? "").trim()) {
      return jsonError("referenceNo is required when marking PAID");
    }
    if (to === "PAID" && !(body.paymentProofUrl ?? "").trim()) {
      return jsonError("Payment screenshot / proof is required when marking PAID");
    }
    if (to === "PAID" && !body.paymentMode) {
      return jsonError("paymentMode is required when marking PAID");
    }

    const next = await (prisma as any).storeSettlement.update({
      where: { id },
      data: {
        status: to,
        ...(to === "APPROVED"
          ? { approvedAt: new Date(), approvedByAdminId: auth.user.id }
          : {}),
        ...(to === "PAID"
          ? {
              paidAt: new Date(),
              paidByAdminId: auth.user.id,
              referenceNo: body.referenceNo?.trim() || null,
              paymentMode: body.paymentMode,
              paymentProofUrl: body.paymentProofUrl?.trim() || null,
            }
          : {}),
        ...(to === "FAILED" ? { paidAt: null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() || null } : {}),
      },
    });

    return jsonOk({
      settlement: {
        id: next.id,
        status: next.status,
        referenceNo: next.referenceNo ?? null,
        paymentMode: next.paymentMode ?? null,
        paymentProofUrl: next.paymentProofUrl ?? null,
        approvedAt: next.approvedAt ?? null,
        paidAt: next.paidAt ?? null,
        netPayable: dec(next.netPayable),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Could not update settlement status");
  }
}

