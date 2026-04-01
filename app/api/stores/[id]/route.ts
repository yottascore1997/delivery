import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { publicProductPricingFields } from "@/lib/product-pricing";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

const timeHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h)");

const patchBody = z.object({
  imageUrl: z.union([z.string().max(2048).url(), z.literal("")]).optional(),
  openingHoursEnabled: z.boolean().optional(),
  openingTime: z.union([timeHHMM, z.literal("")]).optional(),
  closingTime: z.union([timeHHMM, z.literal("")]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const store = await prisma.store.findFirst({
    where: { id, status: "APPROVED" },
    include: {
      categories: {
        orderBy: { name: "asc" },
        include: {
          products: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            include: { masterProduct: { select: { unitLabel: true } } },
          },
        },
      },
    },
  });

  if (!store) return jsonError("Store not found", 404);

  const openingHours = storeOpeningHoursPublic(store);

  return jsonOk({
    store: {
      id: store.id,
      name: store.name,
      address: store.address,
      shopVertical: store.shopVertical,
      imageUrl: store.imageUrl,
      latitude: store.latitude,
      longitude: store.longitude,
      openingHours,
      categories: store.categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          products: c.products.map((p) => {
            const pricing = publicProductPricingFields({ price: p.price, mrp: p.mrp });
            return {
              id: p.id,
              name: p.name,
              description: p.description,
              price: pricing.price,
              mrp: pricing.mrp,
              discountPercent: pricing.discountPercent,
              stock: p.stock,
              imageUrl: p.imageUrl,
              categoryId: p.categoryId,
              unitLabel: effectiveProductUnitLabel(
                p.unitLabel,
                p.masterProduct?.unitLabel,
              ),
            };
          }),
        })),
    },
  });
}

/** Store owner: update cover image URL (customer shop hero). */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request, [UserRole.STORE_OWNER]);
  if ("error" in auth) return auth.error;

  const { id } = params;
  const current = await prisma.store.findFirst({
    where: { id, ownerId: auth.user.id },
    select: {
      id: true,
      openingHoursEnabled: true,
      openingTime: true,
      closingTime: true,
    },
  });
  if (!current) return jsonError("Store not found", 404);

  try {
    const body = patchBody.parse(await request.json());
    const raw = body.imageUrl;
    const imageUrl =
      raw === undefined ? undefined : raw === "" ? null : raw;

    const nextEnabled =
      body.openingHoursEnabled ?? current.openingHoursEnabled;
    const nextOpen =
      body.openingTime !== undefined
        ? body.openingTime === ""
          ? null
          : body.openingTime
        : current.openingTime;
    const nextClose =
      body.closingTime !== undefined
        ? body.closingTime === ""
          ? null
          : body.closingTime
        : current.closingTime;

    if (nextEnabled && (!nextOpen || !nextClose)) {
      return jsonError(
        "When hours are enabled, set both opening and closing time (HH:mm).",
      );
    }

    const data: Record<string, unknown> = {};
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (body.openingHoursEnabled !== undefined) {
      data.openingHoursEnabled = body.openingHoursEnabled;
    }
    if (body.openingTime !== undefined) {
      data.openingTime = body.openingTime === "" ? null : body.openingTime;
    }
    if (body.closingTime !== undefined) {
      data.closingTime = body.closingTime === "" ? null : body.closingTime;
    }

    let updatedRow = current;
    if (Object.keys(data).length > 0) {
      updatedRow = await prisma.store.update({
        where: { id },
        data: data as any,
        select: {
          id: true,
          openingHoursEnabled: true,
          openingTime: true,
          closingTime: true,
        },
      });
    }

    return jsonOk({
      ok: true,
      openingHours: storeOpeningHoursPublic(updatedRow as any),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    }
    return jsonError("Invalid body — use a valid image URL or empty string to clear");
  }
}
