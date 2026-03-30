import { prisma } from "./prisma";

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getCommissionPercent(): Promise<number> {
  const v = await getSetting("commission_percent", "10");
  const n = Number(v);
  return Number.isFinite(n) ? n : 10;
}

export async function getDeliveryFeePerOrder(): Promise<number> {
  const v = await getSetting("delivery_fee_per_order", "25");
  const n = Number(v);
  return Number.isFinite(n) ? n : 25;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Shop homepage “Today’s Match” banner (HTTPS URL from Cloudinary after admin upload). */
export const TODAYS_MATCH_BANNER_KEY = "todays_match_banner_url";

export async function getTodaysMatchBannerUrl(): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: TODAYS_MATCH_BANNER_KEY },
  });
  const v = row?.value?.trim();
  return v || null;
}

export async function setTodaysMatchBannerUrl(url: string | null): Promise<void> {
  if (!url?.trim()) {
    await prisma.platformSetting.deleteMany({
      where: { key: TODAYS_MATCH_BANNER_KEY },
    });
    return;
  }
  await setSetting(TODAYS_MATCH_BANNER_KEY, url.trim());
}
