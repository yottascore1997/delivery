import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const createSchema = z.object({
  type: z.enum(["main", "subcategory", "product"]),
  key: z.string().max(32).optional(),
  name: z.string().min(1).max(200),
  mainCategoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  description: z.string().optional(),
  unitLabel: z.string().max(40).optional(),
  imageUrl: z.string().max(2048).optional(),
  imageUrl2: z.string().max(2048).optional(),
});

const updateSchema = z.object({
  type: z.enum(["main", "subcategory", "product"]),
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  key: z.string().max(32).optional(),
  description: z.string().optional(),
  unitLabel: z.string().max(40).nullable().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  imageUrl2: z.string().max(2048).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({
  type: z.enum(["main", "subcategory", "product"]),
  id: z.string(),
});

export async function OPTIONS() {
  return emptyOptions();
}

function prismaUserMessage(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const t = e.meta?.target;
      const fields = Array.isArray(t) ? t.join(", ") : String(t ?? "");
      const tStr = fields.toLowerCase();
      if (tStr.includes("masterproduct")) {
        return "This product name already exists in this subcategory. Pick another name or delete the old one.";
      }
      if (tStr.includes("mastercategory")) {
        return "This subcategory name already exists under this main category. Pick another name or delete the old one.";
      }
      const fl = fields.toLowerCase();
      if (fl.includes("name") && fl.includes("mastercategoryid")) {
        return "This product name already exists in this subcategory. Pick another name or delete the old one.";
      }
      if (fl.includes("name") && fl.includes("maincategoryid")) {
        return "This subcategory name already exists under this main category. Pick another name or delete the old one.";
      }
      return "Duplicate entry — this record already exists.";
    }
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  const mains = await prisma.masterMainCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      subcategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          products: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });

  return jsonOk({
    mains: mains.map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name,
      sortOrder: m.sortOrder,
      subcategories: m.subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        sortOrder: s.sortOrder,
        products: s.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          unitLabel: p.unitLabel,
          imageUrl: p.imageUrl,
          imageUrl2: (p as any).imageUrl2 ?? null,
          sortOrder: p.sortOrder,
        })),
      })),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = createSchema.parse(await request.json());

    if (body.type === "main") {
      if (!body.key) return jsonError("key required for main category");
      const key = body.key.trim().toLowerCase().replace(/\s+/g, "-");
      const existing = await prisma.masterMainCategory.findFirst({
        where: { key },
      });
      if (existing) return jsonError("Main category key already exists");
      const created = await prisma.masterMainCategory.create({
        data: {
          key,
          name: body.name,
          sortOrder: 999,
        },
      });
      return jsonOk({ created });
    }

    if (body.type === "subcategory") {
      if (!body.mainCategoryId) return jsonError("mainCategoryId required");
      const created = await prisma.masterCategory.create({
        data: {
          mainCategoryId: body.mainCategoryId,
          name: body.name,
          imageUrl: body.imageUrl,
          sortOrder: 999,
        },
      });
      return jsonOk({ created });
    }

    if (!body.subcategoryId) return jsonError("subcategoryId required");
    const created = await prisma.masterProduct.create({
      data: {
        masterCategoryId: body.subcategoryId,
        name: body.name,
        description: body.description ?? "",
        unitLabel: body.unitLabel,
        imageUrl: body.imageUrl,
        imageUrl2: body.imageUrl2,
        sortOrder: 999,
      },
    });
    return jsonOk({ created });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    const pm = prismaUserMessage(e);
    if (pm) return jsonError(pm);
    return jsonError("Invalid request");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = updateSchema.parse(await request.json());

    if (body.type === "main") {
      const updated = await prisma.masterMainCategory.update({
        where: { id: body.id },
        data: {
          ...(body.name != null ? { name: body.name } : {}),
          ...(body.key != null ? { key: body.key } : {}),
          ...(body.sortOrder != null ? { sortOrder: body.sortOrder } : {}),
        },
      });
      return jsonOk({ updated });
    }

    if (body.type === "subcategory") {
      const updated = await prisma.masterCategory.update({
        where: { id: body.id },
        data: {
          ...(body.name != null ? { name: body.name } : {}),
          ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
          ...(body.sortOrder != null ? { sortOrder: body.sortOrder } : {}),
        },
      });
      return jsonOk({ updated });
    }

    const updated = await prisma.masterProduct.update({
      where: { id: body.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.description != null ? { description: body.description } : {}),
        ...(body.unitLabel !== undefined ? { unitLabel: body.unitLabel } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.imageUrl2 !== undefined ? { imageUrl2: body.imageUrl2 } : {}),
        ...(body.sortOrder != null ? { sortOrder: body.sortOrder } : {}),
      },
    });
    return jsonOk({ updated });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    const pm = prismaUserMessage(e);
    if (pm) return jsonError(pm);
    return jsonError("Invalid request");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const body = deleteSchema.parse(await request.json());

    if (body.type === "main") {
      await prisma.masterMainCategory.delete({ where: { id: body.id } });
      return jsonOk({ ok: true });
    }
    if (body.type === "subcategory") {
      await prisma.masterCategory.delete({ where: { id: body.id } });
      return jsonOk({ ok: true });
    }
    await prisma.masterProduct.delete({ where: { id: body.id } });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}

