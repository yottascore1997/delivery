"use client";

import { useEffect } from "react";

/** Removes global violet body gradient on /shop* so customer UI stays clean (Zomato/Blinkit-style). */
export default function ShopTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("shop-route");
    return () => document.body.classList.remove("shop-route");
  }, []);
  return <>{children}</>;
}
