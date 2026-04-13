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
import { shopCategoryPathKeyFromMainKey } from "@/lib/shop-category-path";
import { getShopHeaderColors } from "@/lib/shop-header-theme";

function mobileCategoryPathSegment(pathname: string): string | null {
  const m = /^\/shop\/category\/([^/]+)/.exec(pathname);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

const ICON_BY_PATH: Record<string, string> = {
  grocery: "🛒",
  "fruits-vegetables": "🥬",
  food: "🍔",
  electronics: "📱",
};

function iconForMainTab(key: string, pathKey: string, index: number): string {
  const p = pathKey.toLowerCase();
  const k = key.trim().toLowerCase();
  return (
    ICON_BY_PATH[p] ??
    ICON_BY_PATH[k] ??
    ["🛍️", "🏬", "⭐", "🏷️", "📦"][index % 5]
  );
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
  const [mobileMainTabs, setMobileMainTabs] = useState<{ id: string; key: string; name: string }[]>(
    [],
  );

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
    void (async () => {
      const res = await api<{ mains: { id: string; key: string; name: string }[] }>(
        "/api/master/mains",
      );
      if (res.ok && res.data?.mains) setMobileMainTabs(res.data.mains);
    })();
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

  const mobileCategorySeg = mobileCategoryPathSegment(pathname);
  const headerActiveKey = mobileCategorySeg ?? "__shop__";
  const colors = useMemo(() => getShopHeaderColors(headerActiveKey), [headerActiveKey]);
  const gradientCss = useMemo(() => {
    const [a, b, c] = colors.headerGradient;
    return `linear-gradient(180deg, ${a} 0%, ${b} 42%, ${c} 100%)`;
  }, [colors]);
  const badgeRing = colors.headerGradient[2];

  /** iOS/Safari status bar & browser chrome read `theme-color` once; sync on client nav so the top strip matches the header. */
  useEffect(() => {
    const DEFAULT_THEME = "#f7f7f7";
    const topHex = colors.headerGradient[0];
    const content = pathname.startsWith("/shop") ? topHex : DEFAULT_THEME;
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (metas.length === 0) {
      const m = document.createElement("meta");
      m.setAttribute("name", "theme-color");
      m.setAttribute("content", content);
      document.head.appendChild(m);
      return;
    }
    metas.forEach((el) => el.setAttribute("content", content));
  }, [pathname, colors.headerGradient]);

  const mobileServiceTabs = useMemo(() => {
    const shop = {
      id: "tab-shop",
      pathKey: null as string | null,
      label: "Shop",
      href: "/shop",
      icon: "🏠" as const,
    };
    const fromDb = mobileMainTabs.map((m, i) => {
      const pathKey = shopCategoryPathKeyFromMainKey(m.key);
      return {
        id: m.id,
        pathKey,
        label: m.name,
        href: `/shop/category/${encodeURIComponent(pathKey)}`,
        icon: iconForMainTab(m.key, pathKey, i),
      };
    });
    return [shop, ...fromDb];
  }, [mobileMainTabs]);

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
    <header
      className="shop-site-header sticky top-0 z-[100] pt-[env(safe-area-inset-top,0px)] max-md:overflow-hidden max-md:rounded-b-[1.35rem] max-md:shadow-[0_8px_28px_rgba(15,23,42,0.1)]"
      style={{ ["--shop-mobile-header-gradient" as string]: gradientCss } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="md:hidden">
          <div className="relative -mx-3 overflow-hidden bg-transparent">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 top-[calc(env(safe-area-inset-top,0px)+8px)] h-[120px] w-[120px] rounded-full bg-white/35"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 top-[calc(env(safe-area-inset-top,0px)+52px)] h-[100px] w-[100px] rounded-full bg-white/20"
            />

            <div className="relative z-[1] flex items-start justify-between gap-2 px-4 pb-3 pt-2">
              <Link
                href={mobileDeliverHref}
                className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg py-0.5 active:bg-black/[0.03]"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  <svg className="h-[22px] w-[22px] text-[#44403c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-[11px] font-extrabold tracking-wide text-[#57534e]">{appName} in</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-[22px] font-black leading-tight tracking-tight text-[#0c0a09]">Quick delivery</span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-teal-700/15 bg-teal-50/95 px-2 py-1 text-[11px] font-black text-teal-700">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      Nearby
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1">
                    <span className="line-clamp-1 flex-1 text-[13px] font-bold text-[#44403c]" suppressHydrationWarning>
                      {mobileDeliverSubtitle}
                    </span>
                    <svg className="h-5 w-5 shrink-0 text-[#78716c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/shop/cart"
                  className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95"
                  aria-label="Cart"
                >
                  <svg className="h-[22px] w-[22px] text-[#1c1917]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {count > 0 ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-black text-white"
                      style={{ boxShadow: `0 0 0 2px ${badgeRing}` }}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Link>
                <div
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/85 text-[17px] font-black shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  style={{ backgroundColor: colors.logoCircle, color: colors.logoText }}
                >
                  {mark}
                </div>
                {label ? (
                  <button
                    type="button"
                    className="rounded-full border border-[rgba(28,25,23,0.12)] bg-white/65 px-2 py-2 text-[10px] font-black uppercase tracking-wide text-[#44403c] active:scale-95"
                    onClick={() => {
                      clearSession();
                      router.push("/login?next=/shop");
                    }}
                  >
                    OUT
                  </button>
                ) : (
                  <Link
                    href="/login?next=/shop"
                    className="rounded-full border border-[rgba(28,25,23,0.12)] bg-white/65 px-2 py-2 text-[10px] font-black uppercase tracking-wide text-[#44403c] active:scale-95"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>

            <div className="relative z-[1] pb-2.5 pl-3 pr-2 pt-1">
              <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">
                {mobileServiceTabs.map((tab) => {
                  const isActive =
                    tab.pathKey === null
                      ? pathname === "/shop" || pathname === "/shop/"
                      : mobileCategorySeg != null &&
                        tab.pathKey.toLowerCase() === mobileCategorySeg.toLowerCase();
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className="flex w-[4.25rem] shrink-0 flex-col items-center pb-0.5 pt-1 active:opacity-90"
                    >
                      <span className="text-[22px] leading-none" style={{ color: isActive ? "#0c0a09" : colors.chipInactive }}>
                        {tab.icon}
                      </span>
                      <span
                        className="mt-1 max-w-[4.5rem] truncate text-center text-[10px] leading-none"
                        style={{
                          color: isActive ? "#0c0a09" : colors.chipInactive,
                          fontWeight: isActive ? 900 : 800,
                        }}
                      >
                        {tab.label}
                      </span>
                      <span
                        className="mt-1 h-[3px] rounded-sm transition-[width]"
                        style={{
                          width: isActive ? "1.75rem" : 0,
                          backgroundColor: isActive ? "#0c0a09" : "transparent",
                        }}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="relative z-[1] px-4 pb-4 pt-1">
              <form
                onSubmit={submitSearch}
                className="flex min-h-[50px] items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white/[0.92] pl-4 pr-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.07)]"
              >
                <svg className="h-5 w-5 shrink-0 text-[#57534e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search milk, snacks, stores…"
                  className="min-w-0 flex-1 bg-transparent py-3 text-[15px] font-semibold text-[#1f2937] placeholder:text-[#a8a29e] outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full px-[18px] py-3 text-[13px] font-black uppercase tracking-wide text-white shadow-sm active:scale-[0.98]"
                  style={{ backgroundColor: colors.goBtn }}
                >
                  GO
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
