/**
 * Customer-facing app name (not hard-coded).
 * Set in .env: NEXT_PUBLIC_APP_NAME="Your Brand"
 */
export function getAppName(): string {
  const v = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (!v || v.length === 0) return "Speedza";
  // Avoid showing placeholder branding like "Demo" in customer header.
  const cleaned = v.replace(/\bdemo\b/gi, "").replace(/\s{2,}/g, " ").trim();
  return cleaned.length > 0 ? cleaned : "Speedza";
}

export function getAppTagline(): string {
  const v = process.env.NEXT_PUBLIC_APP_TAGLINE?.trim();
  return v && v.length > 0 ? v : "Food, grocery & more · in minutes";
}

export function getAppMarkInitial(): string {
  const name = getAppName();
  const ch = name.codePointAt(0);
  if (ch === undefined) return "S";
  return String.fromCodePoint(ch).toUpperCase();
}

/**
 * Public logo URL (served from `public/` or CDN).
 * Default: `public/speedzalogo.svg` (committed). Override with NEXT_PUBLIC_APP_LOGO_URL or add speedzalogo.png.
 */
export function getAppLogoUrl(): string {
  const v = process.env.NEXT_PUBLIC_APP_LOGO_URL?.trim();
  if (v && v.length > 0) return v;
  return "/speedzalogo.svg";
}
