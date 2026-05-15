import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emptyOptions, jsonError, jsonOk } from "@/lib/api-response";

const bodySchema = z.object({
  phone: z.string().min(8).max(24),
  email: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
});

export async function OPTIONS() {
  return emptyOptions();
}

/**
 * Public (no auth): user requests account + associated data deletion (Google Play policy).
 * Stored as PlatformSetting rows for admin review / processing.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const body = bodySchema.parse(raw);
    const emailTrim = body.email?.trim() ?? "";
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return jsonError("Please enter a valid email or leave it blank.");
    }
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const key = `data_deletion_req_${id}`;
    const payload = {
      id,
      phone: body.phone.trim(),
      email: emailTrim || null,
      note: (body.note ?? "").trim(),
      createdAt: new Date().toISOString(),
      source: "public_web_form",
    };
    await prisma.platformSetting.create({
      data: { key, value: JSON.stringify(payload) },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(e.issues[0]?.message ?? "Invalid input");
    }
    return jsonError("Could not save request. Try again later.", 500);
  }
}
