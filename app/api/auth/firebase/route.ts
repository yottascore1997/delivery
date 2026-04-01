import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { signToken } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { UserRole } from "@prisma/client";

const bodySchema = z.object({
  idToken: z.string().min(20),
  name: z.string().min(1).max(120).optional(),
  /** Web store-partner login: create or promote to STORE_OWNER (validated phone via Firebase). */
  registerAsStorePartner: z.boolean().optional(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/**
 * Exchange Firebase ID token (Phone Auth) for app JWT.
 * Default: new phone → CUSTOMER. With registerAsStorePartner → STORE_OWNER (name required for new users).
 */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const asPartner = body.registerAsStorePartner === true;

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
      if (asPartner) {
        const name = body.name?.trim();
        if (!name) return jsonError("Name required for store partner signup", 400);
        user = await prisma.user.create({
          data: {
            phone: phone10,
            name,
            role: UserRole.STORE_OWNER,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            phone: phone10,
            name: body.name?.trim() || "Customer",
            role: UserRole.CUSTOMER,
          },
        });
      }
    } else if (asPartner) {
      if (existing.role === UserRole.ADMIN || existing.role === UserRole.DELIVERY) {
        return jsonError(
          "This phone is used for a different account type. Use the matching login link.",
          403,
        );
      }
      if (existing.role === UserRole.CUSTOMER) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: UserRole.STORE_OWNER,
            ...(body.name?.trim() ? { name: body.name.trim() } : {}),
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
