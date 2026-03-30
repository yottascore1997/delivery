/**
 * Customer Help & Support — FAQ + contact (FAQ + WhatsApp / Call / Email).
 *
 * Add to .env (restart dev server after change):
 *   NEXT_PUBLIC_SUPPORT_PHONE=+91 98765 43210
 *   NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
 *   NEXT_PUBLIC_SUPPORT_WHATSAPP=919876543210   (optional; digits only, country code + number; if omitted, phone digits are used for wa.me)
 */

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function getSupportPhoneDisplay(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
  return v && v.length > 0 ? v : null;
}

/** `tel:` href, or null if not configured / invalid */
export function getSupportTelHref(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
  if (!raw) return null;
  const d = digitsOnly(raw);
  if (d.length < 10) return null;
  return `tel:${d}`;
}

export function getSupportEmailDisplay(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v && v.includes("@") ? v : null;
}

export function getSupportMailtoHref(): string | null {
  const e = getSupportEmailDisplay();
  return e ? `mailto:${encodeURIComponent(e)}` : null;
}

/** WhatsApp chat deep link; prefers NEXT_PUBLIC_SUPPORT_WHATSAPP else phone digits */
export function getSupportWhatsAppHref(): string | null {
  const waRaw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim();
  const wa = waRaw ? digitsOnly(waRaw) : "";
  if (wa.length >= 10) return `https://wa.me/${wa}`;
  const phone = digitsOnly(process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "");
  if (phone.length >= 10) return `https://wa.me/${phone}`;
  return null;
}

export function hasAnySupportChannel(): boolean {
  return Boolean(
    getSupportTelHref() || getSupportMailtoHref() || getSupportWhatsAppHref(),
  );
}
