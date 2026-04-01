import { prisma } from "@/lib/prisma";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Public: all master mains with subcategories — shop “Shop by category” section. */
export async function GET() {
  const mains = await prisma.masterMainCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      subcategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, imageUrl: true },
      },
    },
  });

  return jsonOk({
    mains: mains.map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name,
      subcategories: m.subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
      })),
    })),
  });
}
