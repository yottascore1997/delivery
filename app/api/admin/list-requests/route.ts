import { z } from "zod";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";
import {
  ListRequestRecord,
  isListRequestStatus,
  listRequestKey,
  parseListRequestSetting,
} from "@/lib/list-request";

const patchSchema = z.object({
  id: z.string().min(3),
  status: z.string().min(2),
  adminNote: z.string().max(800).optional(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Admin: list all customer list-photo requests */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "15"), 1), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const [total, rows] = await Promise.all([
    prisma.platformSetting.count({
      where: { key: { startsWith: "list_request_" } },
    }),
    prisma.platformSetting.findMany({
      where: { key: { startsWith: "list_request_" } },
    }),
  ]);

  const sorted = rows
    .map(parseListRequestSetting)
    .filter((r): r is ListRequestRecord => Boolean(r))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  let activeNonTerminal = 0;
  for (const r of sorted) {
    if (r.status !== "DELIVERED" && r.status !== "REJECTED") activeNonTerminal += 1;
  }

  const requests = sorted.slice(offset, offset + limit);

  return jsonOk({ requests, total, activeNonTerminal, limit, offset });
}

/** Admin: update list request status/note */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;
  try {
    const body = patchSchema.parse(await request.json());
    const nextStatusRaw = body.status.trim().toUpperCase();
    if (!isListRequestStatus(nextStatusRaw)) return jsonError("Invalid status");

    const key = listRequestKey(body.id.trim());
    const hit = await prisma.platformSetting.findUnique({ where: { key } });
    if (!hit) return jsonError("Request not found", 404);
    const parsed = parseListRequestSetting(hit);
    if (!parsed) return jsonError("Request payload corrupted", 422);

    const next: ListRequestRecord = {
      ...parsed,
      status: nextStatusRaw,
      adminNote: body.adminNote !== undefined ? body.adminNote.trim() : parsed.adminNote,
      updatedAt: new Date().toISOString(),
    };
    await prisma.platformSetting.update({
      where: { key },
      data: { value: JSON.stringify(next) },
    });
    return jsonOk({ ok: true, request: next });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Could not update request");
  }
}
