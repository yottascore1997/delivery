import { notFound } from "next/navigation";
import { isShopVerticalSlug } from "@/lib/shop-verticals";
import { ShopCategoryHubClient } from "./ShopCategoryHubClient";

export default function ShopCategoryPage({ params }: { params: { slug: string } }) {
  if (!isShopVerticalSlug(params.slug)) notFound();
  return <ShopCategoryHubClient slug={params.slug} />;
}
