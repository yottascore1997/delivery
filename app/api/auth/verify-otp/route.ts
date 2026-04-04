import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { signToken } from "@/lib/auth";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";
import { normalizePhone10 } from "@/lib/phone";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(10),
});

export async function OPTIONS() {
  return emptyOptions();
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const phone = normalizePhone10(body.phone);
    if (phone.replace(/\D/g, "").length < 10) {
      return jsonError("Enter a valid 10-digit mobile number");
    }
    const code = body.code.trim();

    const ok = await verifyOtp(phone, code);
    if (!ok) return jsonError("Invalid or expired OTP", 401);

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return jsonError("User not found", 404);

    const needsProfile =
      user.role === UserRole.CUSTOMER && user.name.trim() === "Customer";

    const token = signToken(user);
    return jsonOk({
      token,
      needsProfile,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        imageUrl: user.imageUrl ?? null,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    return jsonError("Invalid request");
  }
}
