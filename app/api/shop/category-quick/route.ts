import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/geo";
import { dec } from "@/lib/serialize";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { isShopVerticalSlug } from "@/lib/shop-verticals";
import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { storeOpeningHoursPublic } from "@/lib/store-opening-hours";

export async function OPTIONS() {
  return emptyOptions();
}

function estimateEtaMinutes(distance: number) {
  return Math.max(12, Math.min(45, Math.round(10 + distance * 2.2)));
}

function verticalMainKeys(vertical: string): string[] {
  if (vertical === "food") return ["food", "food-beverages"];
  return [vertical];
}

function localCategoryKeywords(vertical: string): string[] {
  if (vertical === "grocery") return ["grocery", "essentials", "daily"];
  if (vertical === "fruits-vegetables") return ["fruit", "vegetable", "sabzi", "phal"];
  if (vertical === "electronics") return ["electronic", "tech", "mobile", "accessor"];
  if (vertical === "food") return ["food", "beverage", "restaurant", "meal"];
  return [vertical];
}

/** Match store Category.name to master subcategory (handles "Fruits (फल)" vs "Fruits"). */
function categoryMatchesMasterSub(storeCategoryName: string, masterSubName: string) {
  const strip = (s: string) =>
    s
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const a = strip(masterSubName);
  const b = strip(storeCategoryName);
  if (a.length < 2 || b.length < 2) return false;
  if (b === a) return true;
  if (b.includes(a) || a.includes(b)) return true;
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Number(searchParams.get("radiusKm") ?? "25");
  const maxProducts = Math.min(Number(searchParams.get("limit") ?? "40"), 80);
  const masterCategoryIdRaw = (searchParams.get("masterCategoryId") ?? "").trim();

  if (!vertical || !isShopVerticalSlug(vertical)) return jsonError("valid vertical required");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError("lat and lng required");

  const allowedMainKeys = new Set(verticalMainKeys(vertical));

  let subMc: { id: string; name: string } | null = null;
  if (masterCategoryIdRaw && masterCategoryIdRaw !== "all") {
    const mc = await prisma.masterCategory.findUnique({
      where: { id: masterCategoryIdRaw },
      select: {
        id: true,
        name: true,
        mainCategory: { select: { key: true } },
      },
    });
    if (!mc) return jsonError("Unknown subcategory", 404);
    const mk = mc.mainCategory.key;
    if (!allowedMainKeys.has(mk)) {
      return jsonError("Subcategory does not belong to this shop category", 400);
    }
    subMc = { id: mc.id, name: mc.name };
  }

  /**
   * Food master catalog (e.g. North Indian) is often sold from stores still tagged `grocery`.
   * Include both so /shop/category/food/sub/... is not empty when only grocery outlets exist nearby.
   */
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
        : { status: "APPROVED" as const, shopVertical: vertical };

  const stores = await prisma.store.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      shopVertical: true,
      openingHoursEnabled: true,
      openingTime: true,
      closingTime: true,
    },
  });

  const nearbyStores = stores
    .map((s) => {
      const dist = distanceKm(lat, lng, s.latitude, s.longitude);
      return {
        ...s,
        distanceKm: dist,
        etaMin: estimateEtaMinutes(dist),
      };
    })
    .filter((s) => s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (nearbyStores.length === 0) {
    return jsonOk({ products: [], stores: [] });
  }

  const storeIds = nearbyStores.map((s) => s.id);
  const storeMap = new Map(nearbyStores.map((s) => [s.id, s]));
  const categoryHints = localCategoryKeywords(vertical);

  const products = await prisma.product.findMany({
    where: {
      storeId: { in: storeIds },
      isActive: true,
    },
    include: {
      category: { select: { name: true } },
      masterProduct: {
        select: {
          unitLabel: true,
          masterCategory: {
            select: {
              id: true,
              name: true,
              mainCategory: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 600,
  });

  const bestByKey = new Map<string, (typeof products)[number]>();
  for (const p of products) {
    const store = storeMap.get(p.storeId);
    if (!store) continue;
    const mainKey = p.masterProduct?.masterCategory.mainCategory.key;
    const masterMatch = mainKey ? allowedMainKeys.has(mainKey) : false;
    const categoryName = p.category.name.toLowerCase();
    let localMatch =
      !p.masterProductId &&
      (store.shopVertical === vertical ||
        categoryHints.some((hint) => categoryName.includes(hint)));
    /* Grocery-tagged stores + store Category name = master sub (e.g. North Indian) — no masterProductId */
    if (
      !masterMatch &&
      !localMatch &&
      vertical === "food" &&
      !p.masterProductId &&
      store.shopVertical === "grocery" &&
      subMc &&
      categoryMatchesMasterSub(p.category.name, subMc.name)
    ) {
      localMatch = true;
    }
    if (!masterMatch && !localMatch) continue;

    if (subMc) {
      const mcId = p.masterProduct?.masterCategory?.id;
      const byMaster = mcId === subMc.id;
      const byName = categoryMatchesMasterSub(p.category.name, subMc.name);
      if (!byMaster && !byName) continue;
    }

    const key = p.masterProductId ? `m:${p.masterProductId}` : `n:${p.name.trim().toLowerCase()}`;
    const prev = bestByKey.get(key);
    if (!prev) {
      bestByKey.set(key, p);
      continue;
    }
    const prevStore = storeMap.get(prev.storeId);
    if (!prevStore) {
      bestByKey.set(key, p);
      continue;
    }
    const prevScore = prevStore.distanceKm * 0.75 + dec(prev.price) * 0.25;
    const currScore = store.distanceKm * 0.75 + dec(p.price) * 0.25;
    if (currScore < prevScore) bestByKey.set(key, p);
  }

  const deduped = Array.from(bestByKey.values())
    .sort((a, b) => {
      const as = storeMap.get(a.storeId);
      const bs = storeMap.get(b.storeId);
      const ad = as?.distanceKm ?? 999;
      const bd = bs?.distanceKm ?? 999;
      return ad - bd;
    })
    .slice(0, maxProducts);

  return jsonOk({
    stores: nearbyStores.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      distanceKm: Math.round(s.distanceKm * 100) / 100,
      etaMin: s.etaMin,
      shopVertical: s.shopVertical,
      openingHours: storeOpeningHoursPublic(s),
    })),
    products: deduped.map((p) => {
      const store = storeMap.get(p.storeId)!;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: dec(p.price),
        stock: p.stock,
        imageUrl: p.imageUrl,
        masterProductId: p.masterProductId,
        unitLabel: effectiveProductUnitLabel(
          p.unitLabel,
          p.masterProduct?.unitLabel,
        ),
        categoryName: p.category.name,
        store: {
          id: store.id,
          name: store.name,
          distanceKm: Math.round(store.distanceKm * 100) / 100,
          etaMin: store.etaMin,
          openingHours: storeOpeningHoursPublic(store),
        },
      };
    }),
  });
}
