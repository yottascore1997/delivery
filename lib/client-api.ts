"use client";

const TOKEN_KEY = "dlf_token";
const USER_KEY = "dlf_user";
const CART_KEY = "dlf_cart";

export type StoredUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  imageUrl?: string | null;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: StoredUser) {
  if (typeof window !== "undefined") {
    const prev = getUser();
    if (prev?.id && prev.id !== user.id) {
      localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new Event("dlf-cart"));
    }
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event("dlf-cart"));
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Merge into stored user (e.g. after profile photo upload). Dispatches `dlf-user`. */
export function updateSessionUser(partial: Partial<StoredUser>) {
  if (typeof window === "undefined") return;
  const u = getUser();
  if (!u) return;
  const next: StoredUser = { ...u, ...partial };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("dlf-user"));
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    ...init,
    headers,
    // Store/product availability is time-sensitive (e.g. opening hours).
    // Force fresh responses unless caller explicitly overrides cache mode.
    cache: init?.cache ?? "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { error: text || "Invalid response" };
  }
  const obj = json as { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      error: obj?.error || res.statusText,
      status: res.status,
    };
  }
  return { ok: true, data: json as T, status: res.status };
}
