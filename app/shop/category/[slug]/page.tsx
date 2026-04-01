import { notFound } from "next/navigation";
import { resolveShopCategoryContext } from "@/lib/shop-category-context";
import { ShopCategoryHubClient } from "./ShopCategoryHubClient";

export default async function ShopCategoryPage({ params }: { params: { slug: string } }) {
  const ctx = await resolveShopCategoryContext(params.slug);
  if (!ctx) notFound();

  return (
    <ShopCategoryHubClient
      routeSlug={ctx.routeSlug}
      catalogMainKey={ctx.catalogMainKey}
      title={ctx.title}
    />
  );
}
