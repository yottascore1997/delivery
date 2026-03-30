import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";
import { setTodaysMatchBannerUrl } from "@/lib/settings";

const bodySchema = z.object({
  /** Empty string clears the banner on the shop home. */
  imageUrl: z.string().max(2048),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request, [UserRole.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const raw = await request.json();
    const body = bodySchema.parse(raw);
    const u = body.imageUrl.trim();
    if (u === "") {
      await setTodaysMatchBannerUrl(null);
      return jsonOk({ ok: true, imageUrl: null as string | null });
    }
    if (!u.startsWith("https://") && !u.startsWith("http://")) {
      return jsonError("imageUrl must be a full http(s) URL");
    }
    await setTodaysMatchBannerUrl(u);
    return jsonOk({ ok: true, imageUrl: u });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    }
    return jsonError("Invalid request");
  }
}
