import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isShopVerticalSlug } from "@/lib/shop-verticals";
import { ShopCategoryProductsClient } from "../../ShopCategoryProductsClient";

function ProductsFallback() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

export default function ShopCategorySubProductsPage({
  params,
}: {
  params: { slug: string; subId: string };
}) {
  if (!isShopVerticalSlug(params.slug)) notFound();
  const subId = params.subId.trim();
  if (!subId || subId.length > 80) notFound();

  return (
    <Suspense fallback={<ProductsFallback />}>
      <ShopCategoryProductsClient slug={params.slug} masterCategoryId={subId} />
    </Suspense>
  );
}
