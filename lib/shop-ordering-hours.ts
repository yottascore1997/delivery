/**
 * Customer shop ordering window in India time (IST).
 * Optional env: SHOP_ORDER_START_HOUR (default 8), SHOP_ORDER_END_HOUR (default 22).
 * End is exclusive: open from 08:00 up to but not including 22:00 (last minute 21:59).
 */
export const SHOP_ORDER_TIMEZONE = "Asia/Kolkata";

function parseHourEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 23) return fallback;
  return Math.floor(n);
}

/** Start hour 0–23 inclusive (default 8 = 8:00 AM IST). */
export function getShopOrderStartHour(): number {
  return parseHourEnv(process.env.SHOP_ORDER_START_HOUR, 8);
}

/**
 * End hour 0–23: ordering allowed strictly before this hour (default 22 = open until 21:59 IST).
 */
export function getShopOrderEndHour(): number {
  return parseHourEnv(process.env.SHOP_ORDER_END_HOUR, 22);
}

export function getMinutesSinceMidnightIST(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_ORDER_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function isShopOrderingOpenNow(now = new Date()): boolean {
  const mins = getMinutesSinceMidnightIST(now);
  const start = getShopOrderStartHour() * 60;
  const end = getShopOrderEndHour() * 60;
  if (end <= start) return false;
  return mins >= start && mins < end;
}

export function getShopOrderingClosedMessage(): string {
  const sh = getShopOrderStartHour();
  const eh = getShopOrderEndHour();
  const startLabel = formatHour12(sh);
  const endLabel = formatHour12(eh);
  return `Ordering is open from ${startLabel} to ${endLabel} (India time). Please try again during those hours.`;
}

function formatHour12(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}
