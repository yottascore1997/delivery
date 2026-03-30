import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as UserRole | null;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const where = role && Object.values(UserRole).includes(role) ? { role } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return jsonOk({ users, total, limit, offset });
}

const createSchema = z.object({
  phone: z.string().min(8).max(20),
  name: z.string().min(1).max(120),
  role: z.nativeEnum(UserRole),
});

/** Admin creates delivery (or other) accounts — no OTP in MVP; user logs in via dev OTP after first register flow or we create and they use register+verify */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = createSchema.parse(await request.json());
    if (body.role === UserRole.ADMIN) {
      return jsonError("Cannot create another admin via API", 403);
    }

    const user = await prisma.user.upsert({
      where: { phone: body.phone.trim() },
      create: {
        phone: body.phone.trim(),
        name: body.name,
        role: body.role,
      },
      update: { name: body.name, role: body.role },
    });

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
