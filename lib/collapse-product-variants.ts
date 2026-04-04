import { effectiveProductUnitLabel } from "@/lib/product-unit";
import { publicProductPricingFields } from "@/lib/product-pricing";

type ProductForCollapse = {
  id: string;
  name: string;
  description: string;
  price: Parameters<typeof publicProductPricingFields>[0]["price"];
  mrp: Parameters<typeof publicProductPricingFields>[0]["mrp"];
  stock: number;
  imageUrl: string | null;
  categoryId: string;
  unitLabel: string | null;
  masterProduct?: { unitLabel: string | null } | null;
  variantGroupId: string | null;
  variantLabel: string | null;
  variantSort: number;
};

export type StorefrontProductCollapsed = {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp?: number | null;
  discountPercent?: number | null;
  stock: number;
  imageUrl?: string | null;
  categoryId: string;
  unitLabel?: string | null;
  /** More than one pack size → customer picks on product page */
  variantOptionsCount?: number;
  priceMax?: number;
};

function mapProduct(p: ProductForCollapse): StorefrontProductCollapsed {
  const pricing = publicProductPricingFields({ price: p.price, mrp: p.mrp });
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: pricing.price,
    mrp: pricing.mrp,
    discountPercent: pricing.discountPercent,
    stock: p.stock,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    unitLabel: effectiveProductUnitLabel(p.unitLabel, p.masterProduct?.unitLabel),
  };
}

/** One card per variant group; link id opens product page with pack selector. */
export function collapseProductsForStorefront(
  products: ProductForCollapse[],
): StorefrontProductCollapsed[] {
  const standalone: ProductForCollapse[] = [];
  const byGroup = new Map<string, ProductForCollapse[]>();

  for (const p of products) {
    const gid = p.variantGroupId?.trim();
    if (!gid) {
      standalone.push(p);
      continue;
    }
    const arr = byGroup.get(gid) ?? [];
    arr.push(p);
    byGroup.set(gid, arr);
  }

  const out: StorefrontProductCollapsed[] = standalone.map(mapProduct);

  byGroup.forEach((arr) => {
    arr.sort((a, b) => a.variantSort - b.variantSort || a.id.localeCompare(b.id));
    const rep = arr[0];
    if (!rep) return;

    const priced = arr.map((x) => publicProductPricingFields({ price: x.price, mrp: x.mrp }));
    const prices = priced.map((x) => x.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const anyStock = arr.some((x) => x.stock > 0);

    const base = mapProduct(rep);
    out.push({
      ...base,
      id: rep.id,
      price: minP,
      ...(maxP > minP ? { priceMax: maxP } : {}),
      stock: anyStock ? Math.max(...arr.map((x) => x.stock)) : 0,
      variantOptionsCount: arr.length,
      unitLabel:
        arr.length > 1
          ? `${arr.length} options`
          : base.unitLabel,
    });
  });

  return out;
}
