import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { signToken } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { UserRole } from "@prisma/client";

const bodySchema = z.object({
  idToken: z.string().min(20),
  name: z.string().min(1).max(120).optional(),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
});

export async function OPTIONS() {
  return emptyOptions();
}

/**
 * Exchange Firebase ID token (Phone Auth) for app JWT.
 * Intended for CUSTOMER login/register.
 */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    if (body.role !== UserRole.CUSTOMER) {
      return jsonError("Only customer login supported via Firebase OTP", 403);
    }

    const decoded = await verifyFirebaseIdToken(body.idToken);
    const phone = (decoded.phone_number || "").trim();
    if (!phone) return jsonError("Firebase token missing phone number", 400);

    // Normalize to last 10 digits (common for Indian numbers) to match existing DB format.
    const normalized = phone.replace(/\D/g, "");
    const phone10 = normalized.length >= 10 ? normalized.slice(-10) : normalized;

    if (phone10.length < 8) return jsonError("Invalid phone number", 400);

    const existing = await prisma.user.findUnique({
      where: { phone: phone10 },
      select: { id: true, name: true },
    });

    const user = await prisma.user.upsert({
      where: { phone: phone10 },
      create: {
        phone: phone10,
        name: body.name?.trim() || "Customer",
        role: UserRole.CUSTOMER,
      },
      update: {
        name: body.name?.trim() || undefined,
      },
    });

    const needsProfile = !existing || user.name.trim() === "Customer";

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
    // Show actual error (e.g. missing FIREBASE_SERVICE_ACCOUNT_JSON) to ease setup.
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

