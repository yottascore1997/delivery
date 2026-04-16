/**
 * Mirrors `speedza/lib/shopHeaderTheme.ts` — mobile shop header gradients & accents (Blinkit-style).
 * `activeKey` is main category URL slug / key, or `__shop__` on home.
 */
export type ShopHeaderColors = {
  topBar: string;
  categoryBar: string;
  searchBand: string;
  deliverGold: string;
  goBtn: string;
  logoCircle: string;
  logoText: string;
  chipInactive: string;
  activeChipShadow: string;
  headerGradient: readonly [string, string, string];
};

const SHOP_HOME = "__shop__";

/** `/shop` home (Shop tab) — warm orange, not daily-essentials green */
const SHOP_HOME_ORANGE: ShopHeaderColors = {
  topBar: "#9a3412",
  categoryBar: "#ea580c",
  searchBand: "#fb923c",
  deliverGold: "#ffedd5",
  goBtn: "#c2410c",
  logoCircle: "#ffffff",
  logoText: "#7c2d12",
  chipInactive: "#292524",
  activeChipShadow: "#7c2d12",
  headerGradient: ["#ea580c", "#f59e0b", "#fde68a"],
};

/** Daily essentials / grocery category routes — green */
const DAILY_ESSENTIALS_GREEN: ShopHeaderColors = {
  topBar: "#14532d",
  categoryBar: "#166534",
  searchBand: "#22c55e",
  deliverGold: "#dcfce7",
  goBtn: "#15803d",
  logoCircle: "#ffffff",
  logoText: "#14532d",
  chipInactive: "#292524",
  activeChipShadow: "#052e16",
  headerGradient: ["#166534", "#22c55e", "#bbf7d0"],
};

const FOOD_WARM: ShopHeaderColors = {
  topBar: "#3d2318",
  categoryBar: "#a04520",
  searchBand: "#c0632d",
  deliverGold: "#e8c89a",
  goBtn: "#3d2318",
  logoCircle: "#fbbf24",
  logoText: "#3d2318",
  chipInactive: "#292524",
  activeChipShadow: "#451a03",
  headerGradient: ["#b4532a", "#d9a078", "#f5e0d4"],
};

const BEVERAGE_BLUE: ShopHeaderColors = {
  topBar: "#1e3a8a",
  categoryBar: "#2563eb",
  searchBand: "#60a5fa",
  deliverGold: "#dbeafe",
  goBtn: "#1e3a8a",
  logoCircle: "#fef08a",
  logoText: "#1e3a8a",
  chipInactive: "#292524",
  activeChipShadow: "#172554",
  headerGradient: ["#3d7a9e", "#6bb8d4", "#b8dce8"],
};

const HOUSEHOLD_PURPLE: ShopHeaderColors = {
  topBar: "#4c1d95",
  categoryBar: "#7c3aed",
  searchBand: "#a78bfa",
  deliverGold: "#ede9fe",
  goBtn: "#4c1d95",
  logoCircle: "#fde047",
  logoText: "#4c1d95",
  chipInactive: "#292524",
  activeChipShadow: "#2e1065",
  headerGradient: ["#7c6bb8", "#a78bfa", "#d8d0f0"],
};

const PRODUCE_GREEN: ShopHeaderColors = {
  topBar: "#14532d",
  categoryBar: "#16a34a",
  searchBand: "#4ade80",
  deliverGold: "#dcfce7",
  goBtn: "#14532d",
  logoCircle: "#fef9c3",
  logoText: "#14532d",
  chipInactive: "#292524",
  activeChipShadow: "#052e16",
  headerGradient: ["#3d8f5c", "#6bbd82", "#b8e6c8"],
};

const SNACK_AMBER: ShopHeaderColors = {
  topBar: "#92400e",
  categoryBar: "#d97706",
  searchBand: "#fbbf24",
  deliverGold: "#fef3c7",
  goBtn: "#78350f",
  logoCircle: "#ffffff",
  logoText: "#78350f",
  chipInactive: "#292524",
  activeChipShadow: "#451a03",
  headerGradient: ["#c27803", "#eab308", "#fde68a"],
};

const PERSONAL_ROSE: ShopHeaderColors = {
  topBar: "#9f1239",
  categoryBar: "#e11d48",
  searchBand: "#fb7185",
  deliverGold: "#ffe4e6",
  goBtn: "#881337",
  logoCircle: "#fce7f3",
  logoText: "#881337",
  chipInactive: "#292524",
  activeChipShadow: "#4c0519",
  headerGradient: ["#c45c7a", "#e895b0", "#f0d0dc"],
};

const FROZEN_TEAL: ShopHeaderColors = {
  topBar: "#134e4a",
  categoryBar: "#0d9488",
  searchBand: "#5eead4",
  deliverGold: "#ccfbf1",
  goBtn: "#0f766e",
  logoCircle: "#e0f2fe",
  logoText: "#134e4a",
  chipInactive: "#292524",
  activeChipShadow: "#042f2e",
  headerGradient: ["#2d8a7e", "#4fb8a8", "#9ee5d8"],
};

/** Electronics / gadgets — avoids falling back to grocery orange */
const ELECTRONICS_SLATE: ShopHeaderColors = {
  topBar: "#0f172a",
  categoryBar: "#334155",
  searchBand: "#64748b",
  deliverGold: "#e2e8f0",
  goBtn: "#0f172a",
  logoCircle: "#e2e8f0",
  logoText: "#0f172a",
  chipInactive: "#292524",
  activeChipShadow: "#0f172a",
  headerGradient: ["#475569", "#64748b", "#cbd5e1"],
};

function norm(k: string): string {
  return k.toLowerCase().replace(/\s+/g, "-").trim();
}

const KEY_THEMES: Record<string, ShopHeaderColors> = {
  grocery: DAILY_ESSENTIALS_GREEN,
  "daily-essentials": DAILY_ESSENTIALS_GREEN,
  essentials: DAILY_ESSENTIALS_GREEN,
  food: FOOD_WARM,
  beverages: BEVERAGE_BLUE,
  beverage: BEVERAGE_BLUE,
  drinks: BEVERAGE_BLUE,
  household: HOUSEHOLD_PURPLE,
  "house-hold": HOUSEHOLD_PURPLE,
  vegetables: PRODUCE_GREEN,
  vegetable: PRODUCE_GREEN,
  fruits: PRODUCE_GREEN,
  "fruits-vegetables": PRODUCE_GREEN,
  snacks: SNACK_AMBER,
  "personal-care": PERSONAL_ROSE,
  beauty: PERSONAL_ROSE,
  frozen: FROZEN_TEAL,
  dairy: FROZEN_TEAL,
  electronics: ELECTRONICS_SLATE,
};

export function getShopHeaderColors(activeKey: string): ShopHeaderColors {
  const k = norm(activeKey);
  if (k === norm(SHOP_HOME) || k === "") {
    return SHOP_HOME_ORANGE;
  }
  if (KEY_THEMES[k]) {
    return KEY_THEMES[k];
  }
  if (k.includes("food") || k.includes("meal") || k.includes("restaurant")) return FOOD_WARM;
  if (k.includes("daily") || k.includes("essential") || k.includes("grocery") || k.includes("pantry"))
    return DAILY_ESSENTIALS_GREEN;
  if (k.includes("beverage") || k.includes("drink") || k.includes("juice")) return BEVERAGE_BLUE;
  if (k.includes("house") || k.includes("cleaning") || k.includes("laundry")) return HOUSEHOLD_PURPLE;
  if (k.includes("vegetable") || k.includes("fruit") || k.includes("farm")) return PRODUCE_GREEN;
  if (k.includes("snack") || k.includes("packaged")) return SNACK_AMBER;
  if (k.includes("personal") || k.includes("beauty") || k.includes("care")) return PERSONAL_ROSE;
  if (k.includes("frozen") || k.includes("dairy") || k.includes("cold")) return FROZEN_TEAL;
  if (k.includes("electronic") || k.includes("gadget") || k.includes("mobile") || k.includes("phone"))
    return ELECTRONICS_SLATE;
  return SHOP_HOME_ORANGE;
}
