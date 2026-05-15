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
  name: z.string().min(1).max(120).optional(),
  registerAsStorePartner: z.boolean().optional(),
});

/** Only this 10-digit number accepts a fixed bypass code (no SMS). All other numbers must pass real `verifyOtp`. */
const DUMMY_OTP_PHONE10 = "9420413822";
const DUMMY_OTP_CODE = process.env.DUMMY_OTP_CODE?.trim() || "123456";

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

    const isDemoOtp = phone === DUMMY_OTP_PHONE10 && code === DUMMY_OTP_CODE;
    const ok = isDemoOtp || (await verifyOtp(phone, code));
    if (!ok) return jsonError("Invalid or expired OTP", 401);

    const existing = await prisma.user.findUnique({ where: { phone } });
    const asPartner = body.registerAsStorePartner === true;

    let user = existing;
    if (!user && isDemoOtp) {
      user = await prisma.user.create({
        data: {
          phone,
          name: body.name?.trim() || (asPartner ? "Demo Store Partner" : "Demo Customer"),
          role: asPartner ? UserRole.STORE_OWNER : UserRole.CUSTOMER,
        },
      });
    } else if (user && isDemoOtp && asPartner) {
      if (user.role === UserRole.ADMIN || user.role === UserRole.DELIVERY) {
        return jsonError(
          "This phone is used for a different account type. Use the matching login link.",
          403,
        );
      }
      if (user.role === UserRole.CUSTOMER) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            role: UserRole.STORE_OWNER,
            ...(body.name?.trim() ? { name: body.name.trim() } : {}),
          },
        });
      } else if (body.name?.trim()) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: body.name.trim() },
        });
      }
    }

    if (!user) return jsonError("User not found", 404);

    const needsProfile =
      !isDemoOtp &&
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
