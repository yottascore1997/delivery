"use client";

import Image from "next/image";
import Link from "next/link";
import { StoreCover } from "@/components/shop/shop-visual";

export function ShopNearbyStoreCard({
  href,
  name,
  address,
  distanceKm,
  badgeLabel,
  imageUrl,
  rating = 4.5,
  openingHours,
}: {
  href: string;
  name: string;
  address: string;
  distanceKm: number;
  badgeLabel: string;
  imageUrl?: string | null;
  rating?: number;
  openingHours?: {
    enabled: boolean;
    isOpenNow: boolean;
  };
}) {
  const showClosed =
    Boolean(openingHours?.enabled) && openingHours?.isOpenNow === false;
  const dist =
    distanceKm < 0.05 ? "Nearby" : `${distanceKm.toFixed(1)} km`;

  return (
    <Link
      href={href}
      className="shop-card-premium shop-store-card group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl"
    >
      <div className="shop-store-card-media relative aspect-[16/10] w-full shrink-0 overflow-hidden sm:aspect-[5/3]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 360px"
          />
        ) : (
          <StoreCover
            name={name}
            variant="storefront"
            className="h-full w-full scale-100 transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/20 to-slate-900/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
          <span className="rounded-full border border-white/25 bg-slate-950/45 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-lg backdrop-blur-md">
            {dist}
          </span>
          <div className="flex flex-col items-end gap-1.5">
            {showClosed ? (
              <span className="rounded-full border border-rose-300/80 bg-rose-600/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
                Closed
              </span>
            ) : null}
            <span className="rounded-full border border-emerald-400/40 bg-emerald-600/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
              {badgeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col border-t border-white/70 bg-gradient-to-b from-white via-white to-slate-50/95 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display min-w-0 flex-1 text-[1.05rem] font-black leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-[#c81d2e] sm:text-xl">
            {name}
          </h3>
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 shadow-sm ring-1 ring-amber-200/70"
            style={{
              background: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)",
            }}
          >
            <span className="text-[13px] leading-none text-amber-500" aria-hidden>
              ★
            </span>
            <span className="text-xs font-black tabular-nums text-amber-950">{rating.toFixed(1)}</span>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">
          <span className="mr-1.5 inline-block text-slate-400" aria-hidden>
            <svg className="inline h-3.5 w-3.5 -translate-y-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          {address}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu & offers</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-md transition group-hover:bg-[#e23744] group-hover:shadow-[0_8px_24px_rgba(226,55,68,0.35)]">
            Enter store
            <svg className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
