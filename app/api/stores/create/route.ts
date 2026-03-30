import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  /** At least two photos required (e.g. storefront + interior). HTTPS or CDN-relative. */
  imageUrl: z.string().min(1).max(2048),
  imageUrl2: z.string().min(1).max(2048),
  shopVertical: z
    .enum(["grocery", "fruits-vegetables", "food", "electronics"])
    .optional(),
});

function normalizeStoreImageUrl(raw: string): string {
  const u = raw.trim();
  const cdn = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");
  if (cdn && u && !u.startsWith("http")) {
    return `${cdn}/${u.replace(/^\//, "")}`;
  }
  return u;
}

export async function OPTIONS() {
  return emptyOptions();
}

/** Store owner registers a new store (pending admin approval). Default Grocery category created. */
export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const imageUrl = normalizeStoreImageUrl(body.imageUrl);
    const imageUrl2 = normalizeStoreImageUrl(body.imageUrl2);
    if (!imageUrl.startsWith("http") || !imageUrl2.startsWith("http")) {
      return jsonError("Both store photos must be valid image URLs (upload or use https://)");
    }

    const store = await prisma.store.create({
      data: {
        name: body.name,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        ownerId: auth.user.id,
        status: "PENDING",
        shopVertical: body.shopVertical ?? "grocery",
        imageUrl,
        imageUrl2,
      },
    });

    await prisma.category.create({
      data: { storeId: store.id, name: "Grocery" },
    });

    return jsonOk({
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
