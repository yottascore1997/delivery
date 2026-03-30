import { prisma } from "@/lib/prisma";
import { jsonOk, emptyOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return emptyOptions();
}

/** Public: master main categories (top-level shop categories). */
export async function GET() {
  const mains = await prisma.masterMainCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, key: true, name: true },
  });
  return jsonOk({ mains });
}

