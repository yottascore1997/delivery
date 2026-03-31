import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { signToken } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { UserRole } from "@prisma/client";

const bodySchema = z.object({
  idToken: z.string().min(20),
  name: z.string().min(1).max(120).optional(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/**
 * Exchange Firebase ID token (Phone Auth) for app JWT.
 * Preserves existing DB role (store / admin / delivery / customer). New phone → CUSTOMER.
 */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());

    const decoded = await verifyFirebaseIdToken(body.idToken);
    const phone = (decoded.phone_number || "").trim();
    if (!phone) return jsonError("Firebase token missing phone number", 400);

    const normalized = phone.replace(/\D/g, "");
    const phone10 = normalized.length >= 10 ? normalized.slice(-10) : normalized;

    if (phone10.length < 8) return jsonError("Invalid phone number", 400);

    const existing = await prisma.user.findUnique({
      where: { phone: phone10 },
    });

    let user;
    if (!existing) {
      user = await prisma.user.create({
        data: {
          phone: phone10,
          name: body.name?.trim() || "Customer",
          role: UserRole.CUSTOMER,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        },
      });
    }

    const needsProfile =
      user.role === UserRole.CUSTOMER &&
      (!existing || user.name.trim() === "Customer");

    const token = signToken(user);
    return jsonOk({
      token,
      needsProfile,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        imageUrl: user.imageUrl ?? null,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    if (e instanceof Error) {
      const msg = e.message || "Firebase auth failed";
      const status =
        msg.toLowerCase().includes("not configured") ||
        msg.toLowerCase().includes("service account")
          ? 500
          : 400;
      return jsonError(msg, status);
    }
    return jsonError("Invalid request");
  }
}
