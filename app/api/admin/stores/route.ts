import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, StoreStatus } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { z } from "zod";

export async function OPTIONS() {
  return emptyOptions();
}

/** List stores (optional ?status=PENDING). */
export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as StoreStatus | null;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const where =
    status && Object.values(StoreStatus).includes(status) ? { status } : {};

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.store.count({ where }),
  ]);

  return jsonOk({ stores, total, limit, offset });
}

const createSchema = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(1).max(160),
  address: z.string().min(1).max(2000),
  latitude: z.number(),
  longitude: z.number(),
  status: z.nativeEnum(StoreStatus).optional(),
  shopVertical: z.string().trim().min(1).max(32).optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160).optional(),
  address: z.string().min(1).max(2000).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.nativeEnum(StoreStatus).optional(),
  shopVertical: z.string().trim().min(1).max(32).optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;
  try {
    const body = createSchema.parse(await request.json());
    const owner = await prisma.user.findUnique({
      where: { id: body.ownerId },
      select: { id: true, role: true },
    });
    if (!owner) return jsonError("Owner user not found", 404);
    if (owner.role !== UserRole.STORE_OWNER) {
      return jsonError("Owner must have STORE_OWNER role", 400);
    }

    const store = await prisma.store.create({
      data: {
        ownerId: body.ownerId,
        name: body.name.trim(),
        address: body.address.trim(),
        latitude: body.latitude,
        longitude: body.longitude,
        status: body.status ?? StoreStatus.PENDING,
        shopVertical: body.shopVertical?.trim() || "food",
        commissionPercent: body.commissionPercent ?? null,
      },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
      },
    });
    return jsonOk({ store });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;
  try {
    const body = updateSchema.parse(await request.json());
    const existing = await prisma.store.findUnique({
      where: { id: body.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Store not found", 404);
    const hasUpdate =
      body.name !== undefined ||
      body.address !== undefined ||
      body.latitude !== undefined ||
      body.longitude !== undefined ||
      body.status !== undefined ||
      body.shopVertical !== undefined ||
      body.commissionPercent !== undefined;
    if (!hasUpdate) return jsonError("Nothing to update");

    const store = await prisma.store.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
        ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.shopVertical !== undefined ? { shopVertical: body.shopVertical.trim() } : {}),
        ...(body.commissionPercent !== undefined
          ? { commissionPercent: body.commissionPercent }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
      },
    });
    return jsonOk({ store });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;
  try {
    const body = deleteSchema.parse(await request.json());
    await prisma.store.delete({ where: { id: body.id } });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
