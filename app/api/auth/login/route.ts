import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({ phone: z.string().min(8).max(20) });

export async function OPTIONS() {
  return emptyOptions();
}

/** Request OTP for existing user (login). */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const phone = body.phone.trim();
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return jsonError("User not found. Register first.", 404);
    }
    await issueOtp(phone, user.id);
    return jsonOk({
      ok: true,
      message: "OTP sent",
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    if (e instanceof Error) return jsonError(e.message);
    return jsonError("Invalid request");
  }
}
