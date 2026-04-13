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

function keywordSet(input: string) {
  const out = new Set<string>();
  for (const token of normText(input).split(" ")) {
    const t = token.trim();
    if (t.length < 3) continue;
    out.add(t);
    if (!t.endsWith("s")) out.add(`${t}s`);
    if (t.endsWith("s") && t.length > 4) out.add(t.slice(0, -1));
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const masterCategoryId = (searchParams.get("masterCategoryId") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? "40"), 80);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError("lat and lng required");
  if (!masterCategoryId) return jsonError("masterCategoryId required");

  const mc = await prisma.masterCategory.findUnique({
    where: { id: masterCategoryId },
    select: { name: true },
  });
  const subnameRaw = (searchParams.get("subname") ?? "").trim();
  const keys = keywordSet(subnameRaw || mc?.name || "");

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
    .filter((s) => Number.isFinite(s.distanceKm));

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
    let matched = p.masterProduct?.masterCategoryId === masterCategoryId;
    if (!matched && keys.size > 0) {
      const pn = normText(p.name);
      const cn = normText(p.category.name);
      matched = Array.from(keys).some((k) => pn.includes(k) || cn.includes(k));
    }
    if (!matched) continue;
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

  if (rows.length > 0) {
    return jsonOk({ stores: rows });
  }

  // Fallback: avoid empty UX when master mapping/keywords are missing in store data.
  const firstKey = Array.from(keys)[0] ?? "";
  const fallback = new Map<string, { count: number; sampleImageUrl: string | null; minPrice: number }>();
  for (const p of products) {
    const pn = normText(p.name);
    const cn = normText(p.category.name);
    const relaxedMatch =
      !firstKey || pn.includes(firstKey) || cn.includes(firstKey);
    if (!relaxedMatch) continue;
    const prev = fallback.get(p.storeId);
    if (!prev) {
      fallback.set(p.storeId, {
        count: 1,
        sampleImageUrl: p.imageUrl ?? null,
        minPrice: dec(p.price),
      });
    } else {
      prev.count += 1;
      if (!prev.sampleImageUrl && p.imageUrl) prev.sampleImageUrl = p.imageUrl;
      prev.minPrice = Math.min(prev.minPrice, dec(p.price));
    }
  }

  let relaxedRows = Array.from(fallback.entries())
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
        maxDiscount: 0,
      };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .sort((a, b) => {
      const aOpen = a.openingHours?.isOpenNow ? 1 : 0;
      const bOpen = b.openingHours?.isOpenNow ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit);

  if (relaxedRows.length === 0) {
    // Last resort: show nearest stores that currently have any active in-stock products.
    const anyByStore = new Map<string, { count: number; sampleImageUrl: string | null; minPrice: number }>();
    for (const p of products) {
      const prev = anyByStore.get(p.storeId);
      if (!prev) {
        anyByStore.set(p.storeId, {
          count: 1,
          sampleImageUrl: p.imageUrl ?? null,
          minPrice: dec(p.price),
        });
      } else {
        prev.count += 1;
        if (!prev.sampleImageUrl && p.imageUrl) prev.sampleImageUrl = p.imageUrl;
        prev.minPrice = Math.min(prev.minPrice, dec(p.price));
      }
    }
    relaxedRows = Array.from(anyByStore.entries())
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
          maxDiscount: 0,
        };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .sort((a, b) => {
        const aOpen = a.openingHours?.isOpenNow ? 1 : 0;
        const bOpen = b.openingHours?.isOpenNow ? 1 : 0;
        if (aOpen !== bOpen) return bOpen - aOpen;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, limit);
  }

  return jsonOk({ stores: relaxedRows });
}

