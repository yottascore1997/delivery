/** Calendar parts for a wall-clock instant in Asia/Kolkata (no DST). */
export function istCalendarParts(d: Date): { y: number; m: number; day: number } {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = s.split("-").map(Number);
  return { y, m, day };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Start of that calendar day in IST, as a Date (UTC-backed). */
export function istDayStart(d: Date): Date {
  const { y, m, day } = istCalendarParts(d);
  return new Date(`${y}-${pad2(m)}-${pad2(day)}T00:00:00+05:30`);
}

const BACK_FROM_MONDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Monday 00:00 IST of the week containing `d` (week starts Monday). */
export function istMondayStart(d: Date): Date {
  const dayStart = istDayStart(d);
  const { y, m, day } = istCalendarParts(d);
  const noon = new Date(`${y}-${pad2(m)}-${pad2(day)}T12:00:00+05:30`);
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(noon);
  const back = BACK_FROM_MONDAY[w] ?? 0;
  return new Date(dayStart.getTime() - back * 86_400_000);
}

/** First day of calendar month in IST at 00:00. */
export function istMonthStart(d: Date): Date {
  const { y, m } = istCalendarParts(d);
  return new Date(`${y}-${pad2(m)}-01T00:00:00+05:30`);
}
