import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { jsonError, jsonOk, emptyOptions } from "@/lib/api-response";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
  name: z.string().min(1).max(120),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
});

export async function OPTIONS() {
  return emptyOptions();
}

/** Register (or update name) then send OTP. Public roles: CUSTOMER, STORE_OWNER. */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const phone = body.phone.trim();

    if (body.role === UserRole.ADMIN || body.role === UserRole.DELIVERY) {
      return jsonError("This role cannot self-register", 403);
    }

    const user = await prisma.user.upsert({
      where: { phone },
      create: { phone, name: body.name, role: body.role },
      update: { name: body.name },
    });

    await issueOtp(phone, user.id);
    return jsonOk({
      ok: true,
      message: "OTP sent",
      devHint:
        process.env.AUTH_DEV_OTP_BYPASS === "true"
          ? "Use OTP 123456 in development"
          : undefined,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError(e.issues[0]?.message ?? "Invalid input");
    if (e instanceof Error) return jsonError(e.message);
    return jsonError("Invalid request");
  }
}
