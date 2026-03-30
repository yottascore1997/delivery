import type { Decimal } from "@prisma/client/runtime/library";

export function dec(n: Decimal | number | null | undefined): number {
  if (n == null) return 0;
  if (typeof n === "number") return n;
  return Number(n);
}
