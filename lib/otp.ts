import { prisma } from "./prisma";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000; // 1 OTP per minute per phone
const OTP_DAILY_LIMIT = 20;

function random6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Create OTP for phone; in dev with AUTH_DEV_OTP_BYPASS, code is always 123456 */
export async function issueOtp(phone: string, userId?: string): Promise<string> {
  const bypass = process.env.AUTH_DEV_OTP_BYPASS === "true";
  const code = bypass ? "123456" : random6();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  if (!bypass) {
    const latest = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < OTP_COOLDOWN_MS) {
      throw new Error("Please wait a minute before requesting another OTP.");
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dayCount = await prisma.otpCode.count({
      where: { phone, createdAt: { gte: since } },
    });
    if (dayCount >= OTP_DAILY_LIMIT) {
      throw new Error("OTP limit reached. Please try again later.");
    }
  }

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt,
      userId: userId ?? undefined,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.info(`[OTP] ${phone} -> ${code}`);
  }

  return code;
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<boolean> {
  if (process.env.AUTH_DEV_OTP_BYPASS === "true" && code === "123456") {
    return true;
  }

  const row = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!row) return false;

  // Single-use OTP: delete the matched row.
  await prisma.otpCode.deleteMany({ where: { id: row.id } });
  return true;
}
