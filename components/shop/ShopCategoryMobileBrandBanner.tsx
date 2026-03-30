/**
 * Blinkit-style large footer line — shop home + category pages, mobile only.
 * No solid fill so the shell background (shop.css) shows through.
 */
export function ShopCategoryMobileBrandBanner() {
  return (
    <div
      className="pointer-events-none select-none bg-transparent px-3 pb-2 pt-14 md:hidden"
      aria-hidden
    >
      <p className="max-w-[min(100%,20rem)] font-sans text-[2.4rem] font-black leading-[0.9] tracking-[-0.03em] text-slate-300/90">
        <span className="block">Kalmeshwar&apos;s last</span>
        <span className="block">minute app ❤️</span>
      </p>
    </div>
  );
}
