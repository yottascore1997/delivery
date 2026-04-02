/** DB / OTP / Firebase: last 10 digits (India mobile). */
export function normalizePhone10(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : raw.trim();
}
