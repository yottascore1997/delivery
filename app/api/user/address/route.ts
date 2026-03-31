import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const postSchema = z.object({
  label: z.string().max(32).optional(),
  address: z.string().min(3).optional(),
  latitude: z.number(),
  longitude: z.number(),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const addr = await (prisma as any).userAddress.findFirst({
    where: { userId: auth.user.id, isDefault: true },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk({
    address: addr
      ? {
          id: addr.id,
          label: addr.label,
          address: addr.address,
          latitude: addr.latitude,
          longitude: addr.longitude,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = postSchema.parse(await request.json());

    let addressText = (body.address ?? "").trim();

    // Reverse geocode if address not provided (current location flow)
    if (!addressText) {
      try {
        const url =
          "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
          `&lat=${encodeURIComponent(String(body.latitude))}` +
          `&lon=${encodeURIComponent(String(body.longitude))}`;
        const r = await fetch(url, {
          headers: {
            // Nominatim requires a valid User-Agent / Referer in many deployments.
            "User-Agent": "DLF-Delivery (dev)",
          },
        });
        if (r.ok) {
          const j = (await r.json()) as { display_name?: string };
          if (j.display_name) addressText = j.display_name;
        }
      } catch {
        // ignore; user can still save with manual address later
      }
    }

    if (!addressText) return jsonError("Address required");

    // Ensure only one default
    await (prisma as any).userAddress.updateMany({
      where: { userId: auth.user.id, isDefault: true },
      data: { isDefault: false },
    });

    const created = await (prisma as any).userAddress.create({
      data: {
        userId: auth.user.id,
        label: (body.label ?? "Home").slice(0, 32),
        address: addressText,
        latitude: body.latitude,
        longitude: body.longitude,
        isDefault: true,
      },
    });

    return jsonOk({
      address: {
        id: created.id,
        label: created.label,
        address: created.address,
        latitude: created.latitude,
        longitude: created.longitude,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

