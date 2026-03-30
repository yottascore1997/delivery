import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/geo";
import { jsonOk, emptyOptions } from "@/lib/api-response";
import { jsonError } from "@/lib/api-response";
import { isShopVerticalSlug } from "@/lib/shop-verticals";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

/** Approved stores within radius: open (by store hours) first, then by distance. Pagination: limit & offset. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Number(searchParams.get("radiusKm") ?? "8");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
  const verticalRaw = searchParams.get("vertical");
  const vertical = verticalRaw && isShopVerticalSlug(verticalRaw) ? verticalRaw : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonError("lat and lng required");
  }

  /** Grocery browse: store type OR a product category literally named Grocery (owner flow). */
  /** Food browse: include grocery outlets too (same as category-quick — many use grocery + food master catalog). */
  const where =
    vertical === "grocery"
      ? {
          status: "APPROVED" as const,
          OR: [
            { shopVertical: "grocery" },
            {
              categories: {
                some: {
                  name: "Grocery",
                },
              },
            },
          ],
        }
      : vertical === "food"
        ? {
            status: "APPROVED" as const,
            shopVertical: { in: ["food", "grocery"] },
          }
        : vertical
          ? { status: "APPROVED" as const, shopVertical: vertical }
          : { status: "APPROVED" as const };

  const stores = await prisma.store.findMany({
    where,
  });

  const withDist = stores
    .map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      imageUrl: s.imageUrl,
      shopVertical: s.shopVertical,
      latitude: s.latitude,
      longitude: s.longitude,
      distanceKm: distanceKm(lat, lng, s.latitude, s.longitude),
      openingHours: storeOpeningHoursPublic(s),
    }))
    .filter((s) => s.distanceKm <= radiusKm)
    .sort((a, b) => {
      const openA = a.openingHours.isOpenNow ? 1 : 0;
      const openB = b.openingHours.isOpenNow ? 1 : 0;
      if (openA !== openB) return openB - openA;
      return a.distanceKm - b.distanceKm;
    });

  const page = withDist.slice(offset, offset + limit);

  return jsonOk({
    stores: page,
    total: withDist.length,
    limit,
    offset,
  });
}
