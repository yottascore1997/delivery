import { getMinutesSinceMidnightIST } from "@/lib/shop-ordering-hours";

/** Parse "HH:mm" to minutes since midnight; null if invalid. */
export function parseHHMMToMinutes(s: string | null | undefined): number | null {
  if (s == null || typeof s !== "string") return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * When openingHoursEnabled is false, store is always "open" for hours logic.
 * Times are interpreted in Asia/Kolkata (same as platform ordering).
 * Supports overnight windows (e.g. 22:00–02:00) when close < open.
 */
export function isStoreWithinOpeningHours(
  openingHoursEnabled: boolean,
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  now = new Date(),
): boolean {
  if (!openingHoursEnabled) return true;
  const o = parseHHMMToMinutes(openingTime);
  const c = parseHHMMToMinutes(closingTime);
  if (o === null || c === null) return true;
  const nowM = getMinutesSinceMidnightIST(now);
  if (c > o) return nowM >= o && nowM < c;
  if (c < o) return nowM >= o || nowM < c;
  return false;
}

export function storeOpeningHoursPublic(store: {
  openingHoursEnabled: boolean;
  openingTime: string | null;
  closingTime: string | null;
}) {
  const isOpenNow = isStoreWithinOpeningHours(
    store.openingHoursEnabled,
    store.openingTime,
    store.closingTime,
  );
  return {
    enabled: store.openingHoursEnabled,
    open: store.openingTime,
    close: store.closingTime,
    isOpenNow,
  };
}

export function getStoreClosedByHoursMessage(
  open: string | null,
  close: string | null,
): string {
  const a = open?.trim() || "—";
  const b = close?.trim() || "—";
  return `This store is closed right now. Opening hours: ${a} – ${b} (India time).`;
}
