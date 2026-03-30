"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getShopCart } from "@/lib/shop-cart";
import { getToken } from "@/lib/client-api";

function matchHome(path: string) {
  if (path === "/shop") return true;
  if (
    path.startsWith("/shop/cart") ||
    path.startsWith("/shop/orders") ||
    path.startsWith("/shop/profile") ||
    path.startsWith("/shop/help") ||
    path.startsWith("/shop/category")
  ) {
    return false;
  }
  return path.startsWith("/shop/");
}

const tabs = [
  {
    href: "/shop",
    label: "Home",
    match: matchHome,
    icon: (active: boolean) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/shop/category/grocery",
    label: "Categories",
    match: (p: string) => p.startsWith("/shop/category"),
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zm-9 9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z"
        />
      </svg>
    ),
  },
  {
    href: "/shop/cart",
    label: "Cart",
    match: (p: string) => p === "/shop/cart",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    href: "/shop/orders",
    label: "Orders",
    match: (p: string) => p === "/shop/orders",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    href: "/shop/profile",
    label: "You",
    match: (p: string) => p === "/shop/profile",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export function ShopMobileNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [youHref, setYouHref] = useState("/login?next=/shop/profile&customer=1");

  useEffect(() => {
    function syncYou() {
      setYouHref(getToken() ? "/shop/profile" : "/login?next=/shop/profile&customer=1");
    }
    syncYou();
    window.addEventListener("focus", syncYou);
    return () => window.removeEventListener("focus", syncYou);
  }, [pathname]);

  useEffect(() => {
    function sync() {
      setCartCount(getShopCart().reduce((n, l) => n + l.quantity, 0));
    }
    sync();
    window.addEventListener("dlf-cart", sync);
    return () => window.removeEventListener("dlf-cart", sync);
  }, []);

  return (
    <nav
      className="shop-mobile-nav fixed bottom-0 left-0 right-0 z-[110] md:hidden"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-1 pt-1">
        {tabs.map((tab) => {
          const href = tab.label === "You" ? youHref : tab.href;
          const active = tab.label === "You" ? tab.match(pathname ?? "") : tab.match(pathname ?? "");
          const isCart = tab.href === "/shop/cart";
          return (
            <Link
              key={tab.label}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 ${
                active ? "text-[#e23744]" : "text-[#7e808c]"
              }`}
            >
              <span className="relative">
                {tab.icon(active)}
                {isCart && cartCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e23744] px-1 text-[9px] font-black text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
