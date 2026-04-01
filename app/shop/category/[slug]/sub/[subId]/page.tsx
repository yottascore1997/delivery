import { Suspense } from "react";
import { notFound } from "next/navigation";
import { resolveShopCategoryContext } from "@/lib/shop-category-context";
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

export default async function ShopCategorySubProductsPage({
  params,
}: {
  params: { slug: string; subId: string };
}) {
  const ctx = await resolveShopCategoryContext(params.slug);
  if (!ctx) notFound();

  const subId = params.subId.trim();
  if (!subId || subId.length > 80) notFound();

  return (
    <Suspense fallback={<ProductsFallback />}>
      <ShopCategoryProductsClient
        routeSlug={ctx.routeSlug}
        catalogMainKey={ctx.catalogMainKey}
        categoryTitle={ctx.title}
        masterCategoryId={subId}
      />
    </Suspense>
  );
}
