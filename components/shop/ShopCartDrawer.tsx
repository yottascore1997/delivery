"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getShopCart,
  shopCartTotal,
  updateShopLineQty,
  type ShopCartLine,
} from "@/lib/shop-cart";

export function ShopCartDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ShopCartLine[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    function syncViewport() {
      setIsDesktop(window.innerWidth >= 768);
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    function sync() {
      const nextLines = getShopCart();
      const prevCount = prevCountRef.current;
      const nextCount = nextLines.reduce((n, l) => n + l.quantity, 0);
      setLines(nextLines);
      if (nextCount > prevCount && pathname !== "/shop/cart") {
        setOpen(true);
      }
      if (nextCount === 0) {
        setOpen(false);
      }
      prevCountRef.current = nextCount;
    }

    sync();
    window.addEventListener("dlf-cart", sync);
    return () => window.removeEventListener("dlf-cart", sync);
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/shop/cart") {
      setOpen(false);
    }
  }, [pathname]);

  const count = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);
  const subtotal = useMemo(() => shopCartTotal(lines), [lines]);
  if (!isDesktop || count === 0) return null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close cart drawer"
          className="fixed inset-0 z-[110] bg-black/35"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-[120] h-[100dvh] w-[min(88vw,20rem)] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-900">Cart</p>
              <p className="text-xs font-semibold text-slate-500">
                {count} item{count === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {lines.map((line) => (
              <div key={line.productId} className="rounded-xl border border-slate-200 px-3 py-2">
                <p className="line-clamp-1 text-sm font-bold text-slate-900">{line.name}</p>
                {line.unitLabel?.trim() ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{line.unitLabel.trim()}</p>
                ) : null}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500">Rs {Math.round(line.price)}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateShopLineQty(line.productId, line.quantity - 1)}
                      className="h-6 w-6 rounded-md border border-slate-300 text-sm font-black text-slate-700 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="min-w-[1.5rem] text-center text-xs font-black text-slate-800">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateShopLineQty(line.productId, line.quantity + 1)}
                      className="h-6 w-6 rounded-md border border-slate-300 text-sm font-black text-slate-700 hover:bg-slate-100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => updateShopLineQty(line.productId, 0)}
                      className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-7 0v12m6-12v12M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">Subtotal</p>
              <p className="text-lg font-black text-slate-900">Rs {Math.round(subtotal)}</p>
            </div>
            <div className="space-y-2">
              <Link
                href="/shop/cart"
                onClick={() => setOpen(false)}
                className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 text-center text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                View Cart
              </Link>
              <Link
                href="/shop/cart"
                onClick={() => setOpen(false)}
                className="block w-full rounded-lg border border-emerald-700 bg-emerald-600 py-2.5 text-center text-sm font-black text-white hover:bg-emerald-700"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
