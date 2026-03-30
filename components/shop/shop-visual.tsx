"use client";

import { useState } from "react";

/** Deterministic hue from string for placeholder gradients */
export function brandGradientFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const h1 = h % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 45%) 0%, hsl(${h2}, 65%, 35%) 100%)`;
}

export function StoreCover({
  name,
  className = "",
  variant = "default",
}: {
  name: string;
  className?: string;
  variant?: "default" | "storefront";
}) {
  const bg = brandGradientFromName(name);
  const initial = name.trim().charAt(0).toUpperCase() || "S";
  const isStorefront = variant === "storefront";
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: bg }}
    >
      <div
        className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] ${isStorefront ? "opacity-100" : "opacity-90"}`}
      />
      {isStorefront ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.45) 0%, transparent 55%)",
          }}
        />
      ) : null}
      <span
        className={`relative font-display font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)] ${
          isStorefront ? "text-5xl sm:text-6xl" : "text-4xl text-white/90 drop-shadow-md sm:text-5xl"
        }`}
      >
        {initial}
      </span>
    </div>
  );
}

export function ProductThumb({
  name,
  imageUrl,
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={`object-cover ${className}`}
        onError={() => setBroken(true)}
      />
    );
  }
  const bg = brandGradientFromName(name);
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: bg }}
    >
      <span className="font-display text-xl font-black text-white/90 sm:text-2xl">
        {name.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
