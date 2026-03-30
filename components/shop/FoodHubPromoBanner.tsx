"use client";

/**
 * Food category hub — promo strip under “What’s on your mind?” (not IPL / match banners).
 */
export function FoodHubPromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-[#fff7ed] via-[#ffedd5] to-[#ffe4e6] shadow-[0_12px_40px_-18px_rgba(234,88,12,0.25)] ring-1 ring-orange-100/80">
      <div
        className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-orange-300/50 to-amber-200/40 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-0 h-24 w-40 rounded-full bg-rose-200/35 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/4 top-1/2 h-px w-24 -translate-y-1/2 rotate-[-8deg] bg-gradient-to-r from-transparent via-orange-300/40 to-transparent"
        aria-hidden
      />

      <div className="relative flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-md ring-1 ring-orange-200/80 sm:h-12 sm:w-12"
            aria-hidden
          >
            🍽️
          </span>
          <div className="min-w-0">
            <p className="font-display text-[0.95rem] font-black leading-tight tracking-tight text-slate-900 sm:text-lg">
              Fresh meals, local taste
            </p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-600 sm:text-sm">
              Handpicked outlets nearby · Hot &amp; fast to your door
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-800 shadow-sm ring-1 ring-orange-200/90">
            Same-day delivery
          </span>
          <span className="hidden text-xs font-bold text-slate-500 sm:inline">·</span>
          <span className="text-[11px] font-bold text-slate-700 sm:text-xs">
            Tap a dish above to explore
          </span>
        </div>
      </div>
    </div>
  );
}
