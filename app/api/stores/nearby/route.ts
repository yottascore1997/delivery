import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/geo";
import { jsonOk, emptyOptions } from "@/lib/api-response";
import { jsonError } from "@/lib/api-response";
import { isShopVerticalSlug } from "@/lib/shop-verticals";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

function normalizeShopVertical(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
}

/** Same idea as shop category-quick: food + food-beverages + food-* admin labels. */
function isFoodFamilyVertical(raw: string | null | undefined): boolean {
  const v = normalizeShopVertical(raw);
  if (!v) return false;
  if (v === "food" || v === "food-beverages") return true;
  const head = v.split("-")[0] ?? "";
  return head === "food";
}

/** Approved stores (all): open first, then by distance. Pagination: limit & offset. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
    const verticalRaw = searchParams.get("vertical");
    const vertical = verticalRaw && isShopVerticalSlug(verticalRaw) ? verticalRaw : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonError("lat and lng required");
    }

    // Select only columns this route needs so production DBs missing newer Prisma fields still work.
    const where = { status: "APPROVED" as const };

    const stores = await prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        imageUrl: true,
        shopVertical: true,
        latitude: true,
        longitude: true,
        openingHoursEnabled: true,
        openingTime: true,
        closingTime: true,
      },
    });

    const withDist = stores
      .map((s) => {
        const d = distanceKm(lat, lng, s.latitude, s.longitude);
        return {
          id: s.id,
          name: s.name,
          address: s.address,
          imageUrl: s.imageUrl,
          shopVertical: s.shopVertical,
          latitude: s.latitude,
          longitude: s.longitude,
          distanceKm: d,
          openingHours: storeOpeningHoursPublic(s),
        };
      })
      .filter(
        (row) =>
          Number.isFinite(row.distanceKm) &&
          Number.isFinite(row.latitude) &&
          Number.isFinite(row.longitude),
      )
      .sort((a, b) => {
        const openA = a.openingHours.isOpenNow ? 1 : 0;
        const openB = b.openingHours.isOpenNow ? 1 : 0;
        if (openA !== openB) return openB - openA;
        return a.distanceKm - b.distanceKm;
      });

    let ranked = withDist;
    if (vertical === "food") {
      ranked = withDist.filter((row) => isFoodFamilyVertical(row.shopVertical));
    } else if (vertical) {
      const want = normalizeShopVertical(vertical);
      ranked = withDist.filter((row) => normalizeShopVertical(row.shopVertical) === want);
    }

    const page = ranked.slice(offset, offset + limit);

    return jsonOk({
      stores: page,
      total: ranked.length,
      limit,
      offset,
    });
  } catch (e) {
    console.error("[stores/nearby]", e);
    return jsonError("Failed to load stores", 500);
  }
}
