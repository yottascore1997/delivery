"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getAppLogoUrl,
  getAppMarkInitial,
  getAppName,
  getAppTagline,
} from "@/lib/app-brand";
import { getShopCart } from "@/lib/shop-cart";
import { api, clearSession, getToken, getUser } from "@/lib/client-api";
import { DELIVERY_ADDRESS_UPDATED_EVENT } from "@/lib/shop-delivery-address";
import { isShopVerticalSlug } from "@/lib/shop-verticals";

const MOBILE_SERVICE_TABS = [
  { slug: null as string | null, label: "Shop", href: "/shop", icon: "🏠" },
  { slug: "grocery", label: "Grocery", href: "/shop/category/grocery", icon: "🛒" },
  { slug: "fruits-vegetables", label: "Fruits", href: "/shop/category/fruits-vegetables", icon: "🥬" },
  { slug: "food", label: "Food", href: "/shop/category/food", icon: "🍔" },
  { slug: "electronics", label: "Tech", href: "/shop/category/electronics", icon: "📱" },
] as const;

function mobileActiveCategorySlug(pathname: string): string | null {
  const m = /^\/shop\/category\/([^/]+)/.exec(pathname);
  if (m?.[1] && isShopVerticalSlug(m[1])) return m[1];
  return null;
}

/** Mobile header 3-band colors by category (Shop / other pages = default green). Inline styles so Tailwind JIT always applies. */
const MOBILE_HEADER_THEMES: Record<
  "default" | "grocery" | "fruits-vegetables" | "food" | "electronics",
  {
    row1Bg: string;
    row2Bg: string;
    row3Bg: string;
    deliverMuted: string;
    cartRing: string;
    outerShadow: string;
    activeTabFg: string;
    searchGoBg: string;
  }
> = {
  default: {
    row1Bg: "#0c3d2e",
    row2Bg: "#14805e",
    row3Bg: "#1fa774",
    deliverMuted: "rgba(167, 243, 208, 0.92)",
    cartRing: "#0c3d2e",
    outerShadow: "0 12px 40px rgba(6, 78, 59, 0.35)",
    activeTabFg: "#064e3b",
    searchGoBg: "#059669",
  },
  grocery: {
    row1Bg: "#3b0764",
    row2Bg: "#5b21b6",
    row3Bg: "#7c3aed",
    deliverMuted: "rgba(221, 214, 254, 0.92)",
    cartRing: "#3b0764",
    outerShadow: "0 12px 40px rgba(91, 33, 182, 0.4)",
    activeTabFg: "#2e1064",
    searchGoBg: "#7c3aed",
  },
  "fruits-vegetables": {
    row1Bg: "#14532d",
    row2Bg: "#166534",
    row3Bg: "#22c55e",
    deliverMuted: "rgba(187, 247, 208, 0.92)",
    cartRing: "#14532d",
    outerShadow: "0 12px 40px rgba(20, 83, 45, 0.38)",
    activeTabFg: "#14532d",
    searchGoBg: "#16a34a",
  },
  food: {
    row1Bg: "#422006",
    row2Bg: "#7c2d12",
    row3Bg: "#b45309",
    deliverMuted: "rgba(253, 230, 138, 0.92)",
    cartRing: "#422006",
    outerShadow: "0 12px 40px rgba(66, 32, 6, 0.42)",
    activeTabFg: "#422006",
    searchGoBg: "#92400e",
  },
  electronics: {
    row1Bg: "#172554",
    row2Bg: "#1e40af",
    row3Bg: "#2563eb",
    deliverMuted: "rgba(191, 219, 254, 0.92)",
    cartRing: "#172554",
    outerShadow: "0 12px 40px rgba(23, 37, 84, 0.4)",
    activeTabFg: "#172554",
    searchGoBg: "#2563eb",
  },
};

function mobileHeaderThemeKey(slug: string | null): keyof typeof MOBILE_HEADER_THEMES {
  if (slug === "grocery" || slug === "fruits-vegetables" || slug === "food" || slug === "electronics") {
    return slug;
  }
  return "default";
}

export function ShopSiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  /** null = guest or loading (when token exists); "" = logged in, no saved line yet */
  const [deliverLine, setDeliverLine] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  /** Avoid getToken() during SSR/first paint — it differs from client and causes hydration mismatches. */
  const [addressUiReady, setAddressUiReady] = useState(false);

  const appName = getAppName();
  const mark = getAppMarkInitial();
  const tagline = getAppTagline();
  const logoUrl = getAppLogoUrl();

  useEffect(() => {
    function sync() {
      const lines = getShopCart();
      setCount(lines.reduce((n, l) => n + l.quantity, 0));
    }
    sync();
    window.addEventListener("dlf-cart", sync);
    return () => window.removeEventListener("dlf-cart", sync);
  }, []);

  function syncUserFace() {
    const u = getUser();
    setLabel(u?.name ?? (getToken() ? "Signed in" : null));
    setAvatarUrl(u?.imageUrl?.trim() || null);
  }

  useEffect(() => {
    setAddressUiReady(true);
  }, []);

  useEffect(() => {
    syncUserFace();
    window.addEventListener("dlf-user", syncUserFace);
    return () => window.removeEventListener("dlf-user", syncUserFace);
  }, []);

  useEffect(() => {
    async function loadDeliverLine() {
      if (!getToken()) {
        setDeliverLine(null);
        return;
      }
      const res = await api<{
        address: { label?: string | null; address: string } | null;
      }>("/api/user/address");
      if (!res.ok || !res.data) {
        setDeliverLine("");
        return;
      }
      const a = res.data.address;
      if (!a?.address?.trim()) {
        setDeliverLine("");
        return;
      }
      const prefix = a.label?.trim() ? `${a.label.trim()} · ` : "";
      setDeliverLine(prefix + a.address.trim());
    }

    void loadDeliverLine();
    function onAddressUpdated() {
      void loadDeliverLine();
    }
    window.addEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddressUpdated);
    return () => window.removeEventListener(DELIVERY_ADDRESS_UPDATED_EVENT, onAddressUpdated);
  }, [pathname]);

  const mobileDeliverHref = !addressUiReady
    ? "/shop/cart"
    : getToken()
      ? "/shop/cart#delivery-address"
      : "/login?next=/shop/cart&customer=1&focus=address";

  const mobileDeliverSubtitle = !addressUiReady
    ? "…"
    : !getToken()
      ? "Login · set delivery address"
      : deliverLine === null
        ? "…"
        : deliverLine === ""
          ? "Tap to add / change address"
          : deliverLine;

  const firstName = useMemo(() => {
    if (!label || label === "Signed in") return null;
    return label.split(/\s+/)[0];
  }, [label]);
  const initials = useMemo(() => {
    if (!label || label === "Signed in") return "U";
    return label
      .split(/\s+/)
      .map((n) => n[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [label]);

  const mobileTabActive = mobileActiveCategorySlug(pathname);
  const mh = useMemo(
    () => MOBILE_HEADER_THEMES[mobileHeaderThemeKey(mobileTabActive)],
    [mobileTabActive],
  );

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = search.trim();
    if (q.length < 2) {
      router.push("/shop/search");
      return;
    }
    router.push(`/shop/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="shop-site-header sticky top-0 z-[100] pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="md:hidden">
          <div
            className="-mx-3 overflow-hidden rounded-b-[1.35rem]"
            style={{ boxShadow: mh.outerShadow }}
          >
            {/* Row 1 — compact location (Swiggy-style) */}
            <div className="flex items-center gap-2 px-3 pb-2 pt-1.5" style={{ backgroundColor: mh.row1Bg }}>
              <Link
                href={mobileDeliverHref}
                className="flex min-w-0 flex-1 items-start gap-2 rounded-lg py-0.5 transition active:bg-white/5"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="min-w-0 text-left">
                  <span
                    className="block text-[9px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: mh.deliverMuted }}
                  >
                    Deliver to
                  </span>
                  <span
                    className="mt-0.5 line-clamp-1 text-[12px] font-bold leading-tight text-white"
                    suppressHydrationWarning
                  >
                    {mobileDeliverSubtitle}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href="/shop/cart"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition active:scale-95"
                  aria-label="Cart"
                >
                  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {count > 0 ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff5200] px-1 text-[9px] font-black text-white"
                      style={{ boxShadow: `0 0 0 2px ${mh.cartRing}` }}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Link>
                {label ? (
                  <div className="flex items-center gap-1">
                    <Link
                      href="/shop/profile"
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-[11px] font-black text-amber-950 shadow-md ring-2 ring-white/20 transition active:scale-95"
                      aria-label="Profile"
                    >
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized />
                      ) : (
                        initials
                      )}
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white"
                      onClick={() => {
                        clearSession();
                        router.push("/login?next=/shop");
                      }}
                    >
                      Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login?next=/shop"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 transition active:scale-95"
                    aria-label="Account"
                  >
                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>

            {/* Row 2 — service tabs */}
            <div className="relative px-2 pt-2" style={{ backgroundColor: mh.row2Bg }}>
              <div className="scrollbar-hide flex gap-1 overflow-x-auto pb-0">
                {MOBILE_SERVICE_TABS.map((tab) => {
                  const isActive =
                    tab.slug === null ? pathname === "/shop" : mobileTabActive === tab.slug;
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`relative flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-t-2xl px-2 pb-2 pt-1.5 transition ${
                        isActive
                          ? "bg-white shadow-[0_-6px_24px_rgba(0,0,0,0.12)]"
                          : "text-white/95 hover:bg-white/10"
                      }`}
                      style={isActive ? { color: mh.activeTabFg } : undefined}
                    >
                      <span className="text-[22px] leading-none drop-shadow-sm" aria-hidden>
                        {tab.icon}
                      </span>
                      <span className="mt-1 max-w-[4.5rem] truncate text-center text-[10px] font-black leading-none">
                        {tab.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Row 3 — white search pill */}
            <div className="px-3 pb-2.5 pt-2" style={{ backgroundColor: mh.row3Bg }}>
              <form
                onSubmit={submitSearch}
                className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3 shadow-[0_4px_20px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
              >
                <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search milk, snacks, stores…"
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-sm transition active:scale-[0.97]"
                  style={{ backgroundColor: mh.searchGoBg }}
                >
                  Go
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-between gap-4 py-3 md:flex">
          <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
            <Link
              href="/welcome"
              className="hidden shrink-0 text-xs font-semibold text-white/75 transition hover:text-white xl:block"
            >
              For business
            </Link>
            <Link href="/shop" className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 shadow-lg ring-2 ring-white/20">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={appName}
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-base font-black text-white">{mark}</span>
                )}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="font-display truncate text-base font-black tracking-tight text-white">
                  {appName}
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {tagline}
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden max-w-md flex-1 px-2 lg:block">
            <form
              onSubmit={submitSearch}
              className="flex h-10 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 text-sm text-white/70 shadow-sm backdrop-blur-sm transition hover:border-white/35 hover:bg-white/15"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants & stores..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/65 outline-none"
              />
              <button type="submit" className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold text-white">
                Go
              </button>
            </form>
          </div>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            {label && (
              <span className="hidden max-w-[100px] truncate text-xs font-semibold text-white/75 lg:inline">
                {firstName ?? label}
              </span>
            )}
            <Link
              href="/shop/orders"
              className="rounded-lg px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 sm:text-sm"
            >
              Orders
            </Link>
            <Link
              href="/shop/cart"
              className="shop-btn-primary relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black text-white transition active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Cart</span>
              {count > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#3d4152] px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
            {label ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <Link
                    href="/shop/profile"
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-black text-white shadow-sm transition hover:brightness-110"
                    aria-label="Profile"
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      initials
                    )}
                  </Link>
                  <button
                    type="button"
                    className="mt-1 rounded-md border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white"
                    onClick={() => {
                      clearSession();
                      router.push("/login?next=/shop");
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login?next=/shop"
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-white/15 sm:px-4 sm:text-sm"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
