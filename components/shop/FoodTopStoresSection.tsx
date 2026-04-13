"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { ShopNearbyStoreCard } from "@/components/shop/ShopNearbyStoreCard";
import { SHOP_VERTICAL_LABELS, isShopVerticalSlug } from "@/lib/shop-verticals";

const DEFAULT_LAT = 28.4595;
const DEFAULT_LNG = 77.0266;

type StoreRow = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  shopVertical: string;
  imageUrl?: string | null;
  openingHours?: {
    enabled: boolean;
    isOpenNow: boolean;
    open: string | null;
    close: string | null;
  };
};

function isBlockedFoodStore(name: string) {
  return name.trim().toLowerCase() === "gajanan kirana store";
}

function badgeForStore(shopVertical: string) {
  if (isShopVerticalSlug(shopVertical)) {
    return SHOP_VERTICAL_LABELS[shopVertical];
  }
  return shopVertical;
}

/**
 * Zomato/Swiggy-style “Top stores” — horizontal on small screens, grid on md+.
 */
export function FoodTopStoresSection({
  subtitle,
}: {
  /** Extra line under the title (e.g. current subcategory context). */
  subtitle?: string;
}) {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const q = new URLSearchParams({
        lat: String(DEFAULT_LAT),
        lng: String(DEFAULT_LNG),
        radiusKm: "60",
        limit: "12",
        vertical: "food",
      });
      const res = await api<{ stores: StoreRow[] }>(`/api/stores/nearby?${q}`);
      setLoading(false);
      if (res.ok && res.data) setStores(res.data.stores.filter((s) => !isBlockedFoodStore(s.name)));
      else setStores([]);
    })();
  }, []);

  if (loading) {
    return (
      <section className="mt-2" aria-busy="true" aria-label="Loading top stores">
        <div className="mb-3 h-7 w-56 animate-pulse rounded-lg bg-slate-200/90" />
        <div className="flex gap-3 overflow-hidden pb-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 min-w-[260px] shrink-0 animate-pulse rounded-2xl bg-slate-200/80 sm:h-56"
            />
          ))}
        </div>
      </section>
    );
  }

  if (stores.length === 0) return null;

  return (
    <section className="mt-2" aria-labelledby="food-top-stores-heading">
      <div className="mb-3 sm:mb-4">
        <h2
          id="food-top-stores-heading"
          className="font-display text-lg font-black tracking-tight text-slate-900 sm:text-xl"
        >
          Top stores near you
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
          {subtitle ??
            "Open outlets first · then nearest — like food apps"}
        </p>
      </div>
      <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
        {stores.map((s) => (
          <div
            key={s.id}
            className="min-w-[min(88vw,300px)] shrink-0 snap-start sm:min-w-0"
          >
            <ShopNearbyStoreCard
              href={`/shop/${s.id}`}
              name={s.name}
              address={s.address}
              distanceKm={s.distanceKm}
              imageUrl={s.imageUrl}
              openingHours={s.openingHours}
              badgeLabel={badgeForStore(s.shopVertical)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
