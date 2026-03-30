/**
 * Customer-facing app name (not hard-coded).
 * Set in .env: NEXT_PUBLIC_APP_NAME="Your Brand"
 */
export function getAppName(): string {
  const v = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (!v || v.length === 0) return "QuickDrop";
  // Avoid showing placeholder branding like "Demo" in customer header.
  const cleaned = v.replace(/\bdemo\b/gi, "").replace(/\s{2,}/g, " ").trim();
  return cleaned.length > 0 ? cleaned : "QuickDrop";
}

export function getAppTagline(): string {
  const v = process.env.NEXT_PUBLIC_APP_TAGLINE?.trim();
  return v && v.length > 0 ? v : "Food, grocery & more · in minutes";
}

export function getAppMarkInitial(): string {
  const name = getAppName();
  const ch = name.codePointAt(0);
  if (ch === undefined) return "Q";
  return String.fromCodePoint(ch).toUpperCase();
}
