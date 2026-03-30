/** Prefer store override; fall back to master catalog unit (older rows before Product.unitLabel). */
export function effectiveProductUnitLabel(
  productUnit: string | null | undefined,
  masterUnit: string | null | undefined,
): string | null {
  const p = productUnit?.trim();
  if (p) return p;
  const m = masterUnit?.trim();
  return m || null;
}
