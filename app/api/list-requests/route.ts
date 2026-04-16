import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";
import {
  ListRequestRecord,
  listRequestKey,
  newListRequestId,
  parseListRequestSetting,
} from "@/lib/list-request";

const createSchema = z.object({
  imageUrl: z.string().url().max(2048),
  note: z.string().max(800).optional(),
  address: z.string().max(1200).optional(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Customer: create a manual list request for admin review */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const body = createSchema.parse(await request.json());
    const id = newListRequestId();
    const now = new Date().toISOString();
    const record: ListRequestRecord = {
      id,
      userId: auth.user.id,
      userName: auth.user.name || "",
      userPhone: auth.user.phone || "",
      imageUrl: body.imageUrl.trim(),
      note: (body.note || "").trim(),
      address: (body.address || "").trim(),
      status: "NEW",
      adminNote: "",
      createdAt: now,
      updatedAt: now,
    };
    await prisma.platformSetting.create({
      data: {
        key: listRequestKey(id),
        value: JSON.stringify(record),
      },
    });
    return jsonOk({ ok: true, request: record });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Could not create request");
  }
}

/** Customer: own list requests */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  const rows = await prisma.platformSetting.findMany({
    where: { key: { startsWith: "list_request_" } },
    orderBy: { key: "desc" },
    take: 200,
  });
  const requests = rows
    .map(parseListRequestSetting)
    .filter((r): r is ListRequestRecord => Boolean(r && r.userId === auth.user.id))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);

  return jsonOk({ requests });
}
