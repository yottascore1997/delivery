import { ShopMobileNav } from "@/components/shop/ShopMobileNav";
import { ShopCartDrawer } from "@/components/shop/ShopCartDrawer";
import { ShopSiteHeader } from "@/components/shop/ShopSiteHeader";
import "./shop.css";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shop-shell min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden">
      <ShopSiteHeader />
      <div className="mx-auto max-w-6xl px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 md:pb-16 md:pt-8">
        {children}
      </div>
      <ShopCartDrawer />
      <ShopMobileNav />
    </div>
  );
}
