import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/geo";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";
import { dec } from "@/lib/serialize";

export async function OPTIONS() {
  return emptyOptions();
}

function estimateEtaMinutes(distance: number) {
  return Math.max(12, Math.min(45, Math.round(10 + distance * 2.2)));
}

function normText(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const masterCategoryId = (searchParams.get("masterCategoryId") ?? "").trim();
  const subname = normText(searchParams.get("subname") ?? "");
  const radiusKm = Number(searchParams.get("radiusKm") ?? "60");
  const limit = Math.min(Number(searchParams.get("limit") ?? "40"), 80);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError("lat and lng required");
  if (!masterCategoryId) return jsonError("masterCategoryId required");

  const stores = await prisma.store.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      address: true,
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
        ...s,
        distanceKm: d,
        etaMin: estimateEtaMinutes(d),
        openingHours: storeOpeningHoursPublic(s),
      };
    })
    .filter((s) => Number.isFinite(s.distanceKm) && s.distanceKm <= radiusKm);

  if (withDist.length === 0) return jsonOk({ stores: [] });

  const byId = new Map(withDist.map((s) => [s.id, s]));
  const storeIds = withDist.map((s) => s.id);

  const products = await prisma.product.findMany({
    where: {
      storeId: { in: storeIds },
      isActive: true,
      stock: { gt: 0 },
    },
    include: {
      category: { select: { name: true } },
      masterProduct: { select: { masterCategoryId: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 1200,
  });

  const agg = new Map<
    string,
    { count: number; sampleImageUrl: string | null; minPrice: number; maxDiscount: number }
  >();

  for (const p of products) {
    const byMaster = p.masterProduct?.masterCategoryId === masterCategoryId;
    const byName = subname.length > 1 && normText(p.category.name).includes(subname);
    if (!byMaster && !byName) continue;
    const prev = agg.get(p.storeId);
    const discount =
      p.mrp && dec(p.mrp) > dec(p.price)
        ? Math.round(((dec(p.mrp) - dec(p.price)) / dec(p.mrp)) * 100)
        : 0;
    if (!prev) {
      agg.set(p.storeId, {
        count: 1,
        sampleImageUrl: p.imageUrl ?? null,
        minPrice: dec(p.price),
        maxDiscount: discount,
      });
    } else {
      prev.count += 1;
      if (!prev.sampleImageUrl && p.imageUrl) prev.sampleImageUrl = p.imageUrl;
      prev.minPrice = Math.min(prev.minPrice, dec(p.price));
      prev.maxDiscount = Math.max(prev.maxDiscount, discount);
    }
  }

  const rows = Array.from(agg.entries())
    .map(([storeId, stats]) => {
      const s = byId.get(storeId);
      if (!s) return null;
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        imageUrl: s.imageUrl ?? stats.sampleImageUrl,
        distanceKm: Math.round(s.distanceKm * 10) / 10,
        etaMin: s.etaMin,
        openingHours: s.openingHours,
        matchedProducts: stats.count,
        startsAt: Math.round(stats.minPrice),
        maxDiscount: stats.maxDiscount,
      };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .sort((a, b) => {
      const aOpen = a.openingHours?.isOpenNow ? 1 : 0;
      const bOpen = b.openingHours?.isOpenNow ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.matchedProducts - a.matchedProducts;
    })
    .slice(0, limit);

  return jsonOk({ stores: rows });
}

