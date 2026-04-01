/** MRP (strikethrough) + selling price + optional “X% off” for shop UIs. */
export function ShopPriceDisplay(props: {
  price: number;
  mrp?: number | null;
  discountPercent?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const { price, mrp, discountPercent, size = "sm" } = props;
  const showMrp = mrp != null && mrp > price;
  const priceCls =
    size === "lg"
      ? "text-3xl font-black text-slate-900"
      : size === "md"
        ? "text-lg font-extrabold text-slate-900"
        : "text-[13px] font-extrabold text-slate-900 sm:text-[15px]";

  return (
    <div className="flex flex-wrap items-end gap-x-1.5 gap-y-0.5 sm:gap-2">
      {showMrp ? (
        <span
          className={
            size === "lg"
              ? "text-lg font-bold text-slate-400 line-through"
              : "text-[11px] font-semibold text-slate-400 line-through sm:text-xs"
          }
        >
          ₹{Math.round(mrp)}
        </span>
      ) : null}
      <span className={`leading-none ${priceCls}`}>₹{Math.round(price)}</span>
      {discountPercent != null && discountPercent > 0 ? (
        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-700 sm:text-[10px]">
          {discountPercent}% off
        </span>
      ) : null}
    </div>
  );
}
