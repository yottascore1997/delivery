import { prisma } from "@/lib/prisma";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

type MainRow = { id: string; key: string; name: string };

/** Try to resolve one main row from the list for a single lookup string (exact → fuzzy). */
function matchMainForLookup(mains: MainRow[], lookup: string): MainRow | null {
  const q = lookup.trim().toLowerCase();
  if (!q) return null;
  return (
    mains.find((m) => m.key.trim().toLowerCase() === q) ??
    mains.find((m) => m.name.trim().toLowerCase() === q) ??
    mains.find((m) => m.key.trim().toLowerCase().startsWith(q)) ??
    mains.find((m) => m.name.trim().toLowerCase().startsWith(q)) ??
    mains.find((m) => m.key.trim().toLowerCase().includes(q)) ??
    mains.find((m) => m.name.trim().toLowerCase().includes(q)) ??
    null
  );
}

/** Ordered keys to try when the shop vertical slug does not match the DB `key` exactly. */
function catalogLookupKeys(mainKey: string, normalized: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const low = t.toLowerCase();
    if (seen.has(low)) return;
    seen.add(low);
    out.push(t);
  };

  push(mainKey);
  push(normalized);

  const n = normalized;
  const mk = mainKey.trim().toLowerCase();

  if (n === "grocery" || mk === "grocery") {
    push("groceries");
    push("grocery-items");
    push("supermarket");
    push("kirana");
    push("daily-needs");
  }
  if (n === "food" || mk === "food-beverages" || mk === "food") {
    push("food-beverages");
    push("food");
    push("foods");
    push("fnb");
  }
  if (n === "fruits-vegetables" || mk === "fruits-vegetables") {
    push("fruits-veg");
    push("fruits");
    push("vegetables");
  }
  if (n === "electronics" || mk === "electronics") {
    push("electronic");
    push("tech");
    push("mobile");
  }

  return out;
}

function looksLikeGroceryMain(m: MainRow): boolean {
  const k = m.key.trim().toLowerCase();
  const n = m.name.trim().toLowerCase();
  return (
    k.includes("groc") ||
    n.includes("groc") ||
    k.includes("kirana") ||
    n.includes("kirana") ||
    k.includes("supermarket") ||
    n.includes("supermarket") ||
    k === "daily-needs" ||
    n.includes("daily need")
  );
}

/**
 * If the resolved main has no subs (or nothing matched), pick another main that
 * actually has rows — common when admins created a second "Grocery" main in the DB.
 */
async function resolveMainWithCategories(
  mains: MainRow[],
  preferred: MainRow | null,
  opts: { groceryFallback: boolean },
): Promise<MainRow | null> {
  const subCounts = await prisma.masterCategory.groupBy({
    by: ["mainCategoryId"],
    _count: { _all: true },
  });
  const countByMain = new Map<string, number>();
  for (const row of subCounts) {
    countByMain.set(row.mainCategoryId, row._count._all);
  }

  const withSubs = (m: MainRow | null) =>
    m ? (countByMain.get(m.id) ?? 0) > 0 : false;

  if (preferred && withSubs(preferred)) return preferred;

  if (opts.groceryFallback) {
    const candidates = mains.filter(looksLikeGroceryMain).sort((a, b) => {
      const ca = countByMain.get(a.id) ?? 0;
      const cb = countByMain.get(b.id) ?? 0;
      return cb - ca;
    });
    for (const m of candidates) {
      if (withSubs(m)) return m;
    }

    // No key/name match (admin used arbitrary main keys) — use whichever main actually has subs.
    const withData = mains.filter((m) => withSubs(m));
    if (withData.length > 0) {
      return [...withData].sort(
        (a, b) =>
          (countByMain.get(b.id) ?? 0) - (countByMain.get(a.id) ?? 0),
      )[0];
    }

    // Mains exist but zero subcategories yet — still return first main so API isn’t null.
    if (mains.length > 0) return mains[0];
  }

  if (preferred) return preferred;
  return null;
}

/**
 * Public master catalog (categories + products).
 * Used by store panel to import template products quickly.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawKey = (searchParams.get("mainKey") ?? "grocery").trim();
  const normalized = rawKey.toLowerCase();
  const mainKey =
    normalized === "food"
      ? "food-beverages"
      : normalized === "fruits-veg"
        ? "fruits-vegetables"
        : rawKey;

  const mains = await prisma.masterMainCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, key: true, name: true },
  });

  let main: MainRow | null = null;
  for (const key of catalogLookupKeys(mainKey, normalized)) {
    main = matchMainForLookup(mains, key);
    if (main) break;
  }

  const groceryFallback =
    normalized === "grocery" || mainKey.trim().toLowerCase() === "grocery";

  main = await resolveMainWithCategories(mains, main, { groceryFallback });

  if (!main) {
    return jsonOk({ mainKey, mainCategory: null, categories: [] });
  }

  const categories = await prisma.masterCategory.findMany({
    where: { mainCategoryId: main.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return jsonOk({
    mainCategory: { id: main.id, key: main.key, name: main.name },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      products: c.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        unitLabel: p.unitLabel,
        sortOrder: p.sortOrder,
        masterCategoryId: p.masterCategoryId,
      })),
    })),
  });
}

