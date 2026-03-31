"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StoreCharts } from "@/components/dashboard/StoreCharts";
import { useLocale } from "@/contexts/LocaleContext";
import { api, getToken, getUser } from "@/lib/client-api";
import { uploadStoreCatalogImage } from "@/lib/store-image-upload-client";

type StoreRow = {
  id: string;
  name: string;
  status: string;
  shopVertical?: string;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  openingHoursEnabled?: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  categories: { id: string; name: string }[];
};

type OrderRow = {
  id: string;
  status: string;
  storeRejected?: boolean;
  totalAmount: number;
  createdAt: string;
  user?: { name: string; phone: string };
  items?: { quantity: number; product: { name: string } }[];
};

const LOW_STOCK_THRESHOLD = 8;

const UNIT_LABEL_PRESETS = ["250 g", "500 g", "1 kg", "1 L", "1 pc", "1 pack", "6 pcs", "12 pcs"];

function statusBadgeLight(status: string) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
    PENDING: "bg-amber-50 text-amber-900 ring-amber-200/80",
    REJECTED: "bg-red-50 text-red-800 ring-red-200/80",
  };
  return map[status] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200/80";
}

function orderStatusStyle(s: string) {
  const m: Record<string, string> = {
    PLACED: "bg-amber-100 text-amber-900",
    PREPARING: "bg-sky-100 text-sky-900",
    READY: "bg-violet-100 text-violet-900",
    OUT_FOR_DELIVERY: "bg-orange-100 text-orange-900",
    DELIVERED: "bg-emerald-100 text-emerald-900",
    CANCELLED: "bg-zinc-200 text-zinc-700",
  };
  return m[s] ?? "bg-zinc-100 text-zinc-800";
}

type Tab = "pulse" | "orders" | "menu" | "setup";

export default function StorePanelPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pulse");
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [catalog, setCatalog] = useState<{
    categories: {
      id: string;
      name: string;
      products: {
        id: string;
        name: string;
        price: number;
        stock: number;
        categoryId: string;
        isActive?: boolean;
        masterProductId?: string | null;
        unitLabel?: string | null;
        unitLabelHint?: string | null;
        unitLabelEffective?: string | null;
      }[];
    }[];
  } | null>(null);
  const [earnings, setEarnings] = useState<{
    deliveredOrders: number;
    gross: number;
    estimatedNet: number;
  } | null>(null);
  const [plans, setPlans] = useState<
    { id: string; name: string; price: number }[]
  >([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddr, setNewStoreAddr] = useState("");
  const [newStoreLat, setNewStoreLat] = useState("28.4595");
  const [newStoreLng, setNewStoreLng] = useState("77.0266");
  const [newStorePhoto1, setNewStorePhoto1] = useState<string | null>(null);
  const [newStorePhoto2, setNewStorePhoto2] = useState<string | null>(null);
  const [newStoreUp1, setNewStoreUp1] = useState(false);
  const [newStoreUp2, setNewStoreUp2] = useState(false);

  const [catName, setCatName] = useState("");
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pStock, setPStock] = useState("");
  const [pUnitLabel, setPUnitLabel] = useState("");
  const [pCat, setPCat] = useState("");
  const [pImage, setPImage] = useState("");
  const [pImage2, setPImage2] = useState("");
  const [storeCoverUrl, setStoreCoverUrl] = useState("");
  const [hoursEnabled, setHoursEnabled] = useState(false);
  const [hoursOpen, setHoursOpen] = useState("09:00");
  const [hoursClose, setHoursClose] = useState("22:00");

  const [masterCatalog, setMasterCatalog] = useState<{
    mainCategory?: { id: string; key: string; name: string };
    categories: {
      id: string;
      name: string;
      products: {
        id: string;
        name: string;
        description?: string;
        imageUrl?: string | null;
        unitLabel?: string | null;
      }[];
    }[];
  } | null>(null);
  const [masterMainKey, setMasterMainKey] = useState<string>("grocery");
  const [masterCatId, setMasterCatId] = useState<string>("");
  const [importPrices, setImportPrices] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [unitDraft, setUnitDraft] = useState<Record<string, string>>({});

  // Add Product: cascading master category -> subcategory (but product name/details manual)
  const [addMasterCatalog, setAddMasterCatalog] = useState<{
    mainCategory?: { id: string; key: string; name: string };
    categories: {
      id: string;
      name: string;
      products: { id: string; name: string }[];
    }[];
  } | null>(null);
  const [addMainKey, setAddMainKey] = useState<string>("grocery");
  const [addSubCatId, setAddSubCatId] = useState<string>("");

  const [msg, setMsg] = useState<string | null>(null);

  const { t } = useLocale();

  const [coverUploading, setCoverUploading] = useState(false);

  const viewOrder = useMemo(
    () => (viewOrderId ? orders.find((o) => o.id === viewOrderId) ?? null : null),
    [orders, viewOrderId],
  );

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied order id ✓");
      window.setTimeout(() => setMsg(null), 1600);
    } catch {
      setMsg("Could not copy order id");
      window.setTimeout(() => setMsg(null), 1600);
    }
  }

  async function loadStores() {
    const res = await api<{ stores: StoreRow[] }>("/api/stores/mine");
    if (res.ok && res.data) {
      const list = res.data.stores;
      const hasApproved = list.some((s) => s.status === "APPROVED");
      if (!hasApproved) {
        router.replace("/store/register");
        return;
      }
      setStores(list);
    } else {
      setMsg(res.error ?? t("storeLoadStoresError"));
    }
  }

  async function loadCatalog(id: string) {
    type Cat = {
      id: string;
      name: string;
      products: {
        id: string;
        name: string;
        price: number;
        stock: number;
        categoryId: string;
        isActive?: boolean;
        masterProductId?: string | null;
        unitLabel?: string | null;
        unitLabelHint?: string | null;
        unitLabelEffective?: string | null;
      }[];
    };
    const res = await api<{ store: { categories: Cat[] } }>(
      `/api/store/catalog?storeId=${id}`,
    );
    if (res.ok && res.data) {
      const cats = res.data.store.categories;
      setCatalog({ categories: cats });
      setPCat((prev) =>
        prev && cats.some((c) => c.id === prev) ? prev : cats[0]?.id ?? "",
      );
    } else {
      setCatalog(null);
      setMsg(res.error ?? t("storeLoadCatalogError"));
    }
  }

  async function loadRest(id: string) {
    const e = await api<typeof earnings>(`/api/store/earnings?storeId=${id}`);
    if (e.ok && e.data) setEarnings(e.data);

    const pl = await api<{ plans: typeof plans }>("/api/subscription-plans");
    if (pl.ok && pl.data) setPlans(pl.data.plans);

    const o = await api<{ orders: OrderRow[] }>(
      `/api/orders/store?storeId=${id}&limit=80`,
    );
    if (o.ok && o.data) setOrders(o.data.orders);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (getUser()?.role !== "STORE_OWNER") {
      router.replace("/");
      return;
    }
    void loadStores();
  }, [router]);

  useEffect(() => {
    if (!stores.length) return;
    const approved = stores.filter((s) => s.status === "APPROVED");
    if (!approved.length) return;
    const valid = Boolean(storeId && approved.some((s) => s.id === storeId));
    if (!valid) {
      setStoreId(approved[0].id);
    }
  }, [stores, storeId]);

  useEffect(() => {
    if (!storeId) return;
    void loadCatalog(storeId);
    void loadRest(storeId);
  }, [storeId]);

  useEffect(() => {
    if (tab !== "menu") return;
    if (!storeId) return;
    const storeDefault =
      stores.find((s) => s.id === storeId)?.shopVertical?.trim() || "grocery";
    const mainKey = masterMainKey || storeDefault;
    void (async () => {
      const res = await api<{
        mainCategory?: { id: string; key: string; name: string };
        categories: {
          id: string;
          name: string;
          products: {
            id: string;
            name: string;
            description?: string;
            imageUrl?: string | null;
            unitLabel?: string | null;
          }[];
        }[];
      }>(`/api/master/catalog?mainKey=${encodeURIComponent(mainKey)}`);
      if (res.ok && res.data) {
        const data = res.data;
        setMasterCatalog(data);
        setMasterMainKey((prev) => prev || mainKey);
        setMasterCatId((prev) =>
          prev && data.categories.some((c) => c.id === prev)
            ? prev
            : data.categories[0]?.id ?? "",
        );
        setImportPrices({});
      }
    })();
  }, [tab, storeId, stores, masterMainKey]);

  useEffect(() => {
    if (tab !== "menu") return;
    if (!storeId) return;
    const mainKey = addMainKey || "grocery";
    void (async () => {
      const res = await api<{
        mainCategory?: { id: string; key: string; name: string };
        categories: {
          id: string;
          name: string;
          products: { id: string; name: string }[];
        }[];
      }>(`/api/master/catalog?mainKey=${encodeURIComponent(mainKey)}`);
      if (res.ok && res.data) {
        const data = res.data;
        setAddMasterCatalog(data);
        setAddSubCatId((prev) =>
          prev && data.categories.some((c) => c.id === prev)
            ? prev
            : data.categories[0]?.id ?? "",
        );
      }
    })();
  }, [tab, storeId, addMainKey]);

  async function refreshAll() {
    const res = await api<{ stores: StoreRow[] }>("/api/stores/mine");
    if (res.ok && res.data) {
      setStores(res.data.stores);
      const list = res.data.stores;
      const id =
        storeId && list.some((s) => s.id === storeId)
          ? storeId
          : list[0]?.id ?? "";
      if (id) {
        setStoreId(id);
        await loadCatalog(id);
        await loadRest(id);
      } else {
        setStoreId("");
        setCatalog(null);
        setOrders([]);
        setEarnings(null);
      }
    }
  }

  async function createStore() {
    if (!newStoreName.trim() || !newStoreAddr.trim()) {
      setMsg(t("storeFillOutletDetails"));
      return;
    }
    if (!newStorePhoto1?.trim() || !newStorePhoto2?.trim()) {
      setMsg(t("storeBothPhotosRequired"));
      return;
    }
    const la = Number(newStoreLat);
    const ln = Number(newStoreLng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setMsg(t("storeInvalidLatLng"));
      return;
    }
    setMsg(null);
    const res = await api("/api/stores/create", {
      method: "POST",
      body: JSON.stringify({
        name: newStoreName.trim(),
        address: newStoreAddr.trim(),
        latitude: la,
        longitude: ln,
        imageUrl: newStorePhoto1.trim(),
        imageUrl2: newStorePhoto2.trim(),
      }),
    });
    setMsg(
      res.ok ? "Store submitted — admin approval pending ✓" : res.error || "Error",
    );
    setNewStoreName("");
    setNewStoreAddr("");
    setNewStorePhoto1(null);
    setNewStorePhoto2(null);
    await loadStores();
  }

  async function onNewStorePhoto(slot: 1 | 2, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (slot === 1) setNewStoreUp1(true);
    else setNewStoreUp2(true);
    setMsg(null);
    const up = await uploadStoreCatalogImage(file);
    if (slot === 1) {
      setNewStoreUp1(false);
      if (up.ok) setNewStorePhoto1(up.imageUrl);
      else setMsg(up.error);
    } else {
      setNewStoreUp2(false);
      if (up.ok) setNewStorePhoto2(up.imageUrl);
      else setMsg(up.error);
    }
  }

  async function addCategory() {
    if (!storeId) {
      setMsg(t("storeNeedStore"));
      return;
    }
    if (!catName.trim()) {
      setMsg(t("storeFillCategoryName"));
      return;
    }
    setMsg(null);
    const res = await api("/api/store/categories", {
      method: "POST",
      body: JSON.stringify({ storeId, name: catName }),
    });
    setMsg(res.ok ? "Category added ✓" : res.error || "Error");
    setCatName("");
    await loadCatalog(storeId);
  }

  async function addProduct() {
    if (!storeId) {
      setMsg(t("storeNeedStore"));
      return;
    }
    if (!pCat) {
      setMsg(t("storeAddCategoryFirst"));
      return;
    }
    const price = Number(pPrice);
    const stock = Number(pStock);
    if (!pName.trim() || !Number.isFinite(price) || price <= 0) {
      setMsg(t("storeInvalidProductPrice"));
      return;
    }
    if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
      setMsg(t("storeInvalidStock"));
      return;
    }
    setMsg(null);
    const u = pUnitLabel.trim();
    const res = await api("/api/products/create", {
      method: "POST",
      body: JSON.stringify({
        storeId,
        categoryId: pCat,
        name: pName.trim(),
        description: "",
        price,
        stock,
        imageUrl: pImage || undefined,
        imageUrl2: pImage2 || undefined,
        ...(u ? { unitLabel: u.slice(0, 40) } : {}),
      }),
    });
    setMsg(res.ok ? "Product live ✓" : res.error || "Error");
    setPName("");
    setPPrice("");
    setPStock("");
    setPUnitLabel("");
    setPImage2("");
    await loadCatalog(storeId);
  }

  async function importFromMaster() {
    if (!storeId) {
      setMsg(t("storeNeedStore"));
      return;
    }
    if (!masterCatalog || !masterCatId) {
      setMsg("Pick a category to import");
      return;
    }
    const cat = masterCatalog.categories.find((c) => c.id === masterCatId);
    if (!cat) {
      setMsg("Invalid category");
      return;
    }
    const products = cat.products
      .map((p) => {
        const raw = (importPrices[p.id] ?? "").trim();
        const price = Number(raw);
        if (!raw) return null;
        if (!Number.isFinite(price) || price <= 0) return null;
        return { masterProductId: p.id, price };
      })
      .filter(Boolean) as { masterProductId: string; price: number }[];
    if (!products.length) {
      setMsg("Enter at least one price");
      return;
    }

    setImporting(true);
    setMsg(null);
    const res = await api<{ imported: number }>("/api/store/import-master", {
      method: "POST",
      body: JSON.stringify({
        storeId,
        masterCategoryId: masterCatId,
        products,
      }),
    });
    setImporting(false);
    setMsg(res.ok ? "Imported ✓" : res.error || "Error");
    if (storeId) await loadCatalog(storeId);
  }

  async function ensureStoreCategoryByName(name: string) {
    const existing = (catalog?.categories ?? []).find((c) => c.name === name);
    if (existing) return existing.id;
    const res = await api<{ category: { id: string; name: string } }>(
      "/api/store/categories",
      {
        method: "POST",
        body: JSON.stringify({ storeId, name }),
      },
    );
    if (!res.ok || !res.data) {
      setMsg(res.error || "Could not create category");
      return "";
    }
    return res.data.category.id;
  }

  async function setProductActive(productId: string, next: boolean) {
    const res = await api("/api/products/update", {
      method: "PATCH",
      body: JSON.stringify({ productId, isActive: next }),
    });
    if (!res.ok) setMsg(res.error || "Error");
    if (storeId) await loadCatalog(storeId);
  }

  async function setProductStock(productId: string, stock: number) {
    const res = await api("/api/products/update", {
      method: "PATCH",
      body: JSON.stringify({ productId, stock }),
    });
    if (!res.ok) setMsg(res.error || "Error");
    if (storeId) await loadCatalog(storeId);
  }

  async function setProductUnitLabel(productId: string, raw: string) {
    const trimmed = raw.trim().slice(0, 40);
    const res = await api("/api/products/update", {
      method: "PATCH",
      body: JSON.stringify({
        productId,
        unitLabel: trimmed.length ? trimmed : null,
      }),
    });
    if (!res.ok) setMsg(res.error || "Error");
    else setUnitDraft((m) => {
      const next = { ...m };
      delete next[productId];
      return next;
    });
    if (storeId) await loadCatalog(storeId);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    setMsg(null);
    const res = await api("/api/products/delete", {
      method: "POST",
      body: JSON.stringify({ productId: id }),
    });
    setMsg(res.ok ? "Removed" : res.error || "Error");
    if (storeId) await loadCatalog(storeId);
  }

  async function saveStoreCover() {
    if (!storeId) return;
    setMsg(null);
    const res = await api(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: storeCoverUrl.trim() || "" }),
    });
    setMsg(
      res.ok
        ? "Store cover saved — shows on top of your public menu page"
        : res.error || "Could not save cover",
    );
    if (res.ok) await loadStores();
  }

  async function onPickStoreCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverUploading(true);
    setMsg(null);
    const up = await uploadStoreCatalogImage(file);
    setCoverUploading(false);
    if (!up.ok) {
      setMsg(up.error);
      return;
    }
    setStoreCoverUrl(up.imageUrl);
  }

  function captureNewStoreLocation() {
    setMsg(null);
    if (!navigator.geolocation) {
      setMsg("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewStoreLat(String(Math.round(pos.coords.latitude * 1e6) / 1e6));
        setNewStoreLng(String(Math.round(pos.coords.longitude * 1e6) / 1e6));
        setMsg("Location captured ✓");
      },
      () => setMsg("Location permission denied."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function saveOpeningHours() {
    if (!storeId) {
      setMsg(t("storeNeedStore"));
      return;
    }
    setMsg(null);
    const res = await api(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openingHoursEnabled: hoursEnabled,
        openingTime: hoursOpen.trim(),
        closingTime: hoursClose.trim(),
      }),
    });
    setMsg(
      res.ok
        ? "Opening hours saved — customers see Open/Closed by India time ✓"
        : res.error || "Could not save hours",
    );
    if (res.ok) await loadStores();
  }

  async function subscribe(planId: string) {
    if (!storeId) return;
    setMsg(null);
    const res = await api("/api/store/subscribe", {
      method: "POST",
      body: JSON.stringify({ storeId, planId }),
    });
    setMsg(res.ok ? "Subscription recorded ✓" : res.error || "Error");
  }

  async function orderAction(
    orderId: string,
    status: "PREPARING" | "READY" | "CANCELLED",
  ) {
    setMsg(null);
    const res = await api("/api/orders/update-status", {
      method: "POST",
      body: JSON.stringify({ orderId, status }),
    });
    setMsg(res.ok ? "Order updated ✓" : res.error || "Error");
    if (storeId) await loadRest(storeId);
  }

  const categories = catalog?.categories ?? [];
  const currentStore = stores.find((s) => s.id === storeId);

  useEffect(() => {
    setStoreCoverUrl(currentStore?.imageUrl?.trim() ?? "");
  }, [currentStore?.id, currentStore?.imageUrl]);

  useEffect(() => {
    if (!currentStore) return;
    setHoursEnabled(Boolean(currentStore.openingHoursEnabled));
    setHoursOpen(currentStore.openingTime?.trim() || "09:00");
    setHoursClose(currentStore.closingTime?.trim() || "22:00");
  }, [
    currentStore?.id,
    currentStore?.openingHoursEnabled,
    currentStore?.openingTime,
    currentStore?.closingTime,
  ]);

  const analytics = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const products = categories.flatMap((c) => c.products);
    const lowStock = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD);
    const ordersToday = orders.filter(
      (o) => new Date(o.createdAt) >= start,
    );
    const revenueToday = ordersToday.reduce((s, o) => s + o.totalAmount, 0);
    const pipeline = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const needsAction = orders.filter((o) => o.status === "PLACED").length;
    const inKitchen = orders.filter((o) => o.status === "PREPARING").length;
    const ready = orders.filter((o) => o.status === "READY").length;
    const activeFulfillment = orders.filter((o) =>
      ["PLACED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status),
    ).length;
    const totalPipeline = Object.values(pipeline).reduce((a, b) => a + b, 0);
    const avgTicket =
      orders.length > 0
        ? orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length
        : 0;
    return {
      productCount: products.length,
      categoryCount: categories.length,
      lowStock,
      ordersToday: ordersToday.length,
      revenueToday,
      pipeline,
      totalPipeline,
      needsAction,
      inKitchen,
      ready,
      activeFulfillment,
      avgTicket,
    };
  }, [categories, orders]);

  const pipelineKeys = [
    "PLACED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ] as const;

  const breadcrumb =
    tab === "pulse"
      ? t("storeBreadcrumbPulse")
      : tab === "orders"
        ? t("storeBreadcrumbOrders")
        : tab === "menu"
          ? t("storeBreadcrumbMenu")
          : t("storeBreadcrumbSetup");

  const sessionUser = getUser();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setViewOrderId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <DashboardShell
        roleLabel={t("roleStore")}
        breadcrumb={breadcrumb}
        headerTitle={currentStore?.name ?? sessionUser?.name ?? "—"}
        headerSubtitle={
          currentStore?.name && sessionUser?.name ? sessionUser.name : undefined
        }
        activeId={tab}
        onNav={(id) => setTab(id as Tab)}
        onRefresh={() => void refreshAll()}
        navItems={[
          {
            id: "pulse",
            label: t("storeNavPulse"),
            icon: <IconNavDash />,
          },
          {
            id: "orders",
            label: t("storeNavOrders"),
            icon: <IconNavOrdersNav />,
          },
          {
            id: "menu",
            label: t("storeNavMenu"),
            icon: <IconNavBox />,
          },
          {
            id: "setup",
            label: t("storeNavSetup"),
            icon: <IconNavGear />,
          },
        ]}
        bottomLinks={[]}
      >
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            {t("storeOutlet")}
          </p>
          <p className="font-display text-lg font-bold text-zinc-900">
            {currentStore?.name ?? "—"}
          </p>
          {currentStore && (
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusBadgeLight(currentStore.status)}`}
            >
              {currentStore.status}
            </span>
          )}
          <p className="mt-2 max-w-xl text-sm text-zinc-500">{t("storeTagline")}</p>
        </div>
        <select
          className="ui-input w-full min-w-0 shrink-0 sm:max-w-xs"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          disabled={stores.length === 0}
        >
          {stores.length === 0 ? (
            <option value="">{t("storeNoOutletsOption")}</option>
          ) : (
            stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))
          )}
        </select>
      </div>

      {msg && (
        <div className="mb-6 rounded-2xl border border-violet-300/50 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-950">
          {msg}
        </div>
      )}

      {/* PULSE TAB */}
      {tab === "pulse" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t("storeTodayOrders")}
              value={String(analytics.ordersToday)}
              sub={t("storeTodayOrdersSub")}
              accent="from-violet-600 to-fuchsia-600"
              icon={<IconOrders />}
            />
            <KpiCard
              title={t("storeTodayRev")}
              value={`₹${Math.round(analytics.revenueToday * 100) / 100}`}
              sub={t("storeTodayRevSub")}
              accent="from-amber-500 to-orange-600"
              icon={<IconRupee />}
            />
            <KpiCard
              title={t("storeSkus")}
              value={String(analytics.productCount)}
              sub={`${analytics.categoryCount} ${t("storeCats")}`}
              accent="from-violet-600 to-indigo-600"
              icon={<IconBox />}
            />
            <KpiCard
              title={t("storeStockAlerts")}
              value={String(analytics.lowStock.length)}
              sub={`≤ ${LOW_STOCK_THRESHOLD} ${t("storeUnits")}`}
              accent={
                analytics.lowStock.length > 0
                  ? "from-red-500 to-rose-600"
                  : "from-zinc-600 to-zinc-700"
              }
              icon={<IconAlert />}
            />
          </div>

          <StoreCharts
            orders={orders}
            titleBar={t("storeChartBar")}
            titleDonut={t("storeChartDonut")}
          />

          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50">
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {t("storeRecentOrders")}
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">{t("adminColOrder")}</th>
                    <th className="pb-3 pr-3">{t("adminColCustomer")}</th>
                    <th className="pb-3 pr-3">{t("storeColDate")}</th>
                    <th className="pb-3 pr-3">{t("adminColAmount")}</th>
                    <th className="pb-3">{t("adminColStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map((o) => (
                    <tr key={o.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-3 font-mono text-xs text-zinc-600">
                        {o.id.slice(0, 8)}…
                      </td>
                      <td className="py-3 pr-3 font-medium text-zinc-900">
                        {o.user?.name ?? o.user?.phone ?? "—"}
                      </td>
                      <td className="py-3 pr-3 text-zinc-600">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-zinc-900">
                        ₹{Math.round(o.totalAmount * 100) / 100}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${orderStatusStyle(o.status)}`}
                        >
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p className="py-6 text-center text-sm text-zinc-500">
                  {t("storeNoOrders")}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-zinc-900">
                    {t("storePipeline")}
                  </h3>
                  <p className="text-sm text-zinc-500">{t("storePipelineSub")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("orders")}
                  className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                >
                  {t("storeOpenQueue")}
                </button>
              </div>
              <div className="mt-6 space-y-3">
                {pipelineKeys.map((key) => {
                  const n = analytics.pipeline[key] ?? 0;
                  const pct =
                    analytics.totalPipeline > 0
                      ? Math.round((n / analytics.totalPipeline) * 100)
                      : 0;
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-xs font-semibold text-zinc-600">
                        <span>{key.replace(/_/g, " ")}</span>
                        <span>
                          {n} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/80 p-6 shadow-lg">
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-500">
                  {t("storeFulfillmentSnap")}
                </h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-600">{t("storeNeedsAccept")}</span>
                    <span className="font-bold text-amber-600">
                      {analytics.needsAction}
                    </span>
                  </li>
                  <li className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-600">{t("storePreparing")}</span>
                    <span className="font-bold text-sky-600">
                      {analytics.inKitchen}
                    </span>
                  </li>
                  <li className="flex justify-between border-b border-zinc-100 pb-2">
                    <span className="text-zinc-600">{t("storeReadyRider")}</span>
                    <span className="font-bold text-violet-600">
                      {analytics.ready}
                    </span>
                  </li>
                  <li className="flex justify-between pt-1">
                    <span className="text-zinc-600">{t("storeAvgTicket")}</span>
                    <span className="font-bold text-zinc-900">
                      ₹{Math.round(analytics.avgTicket * 100) / 100}
                    </span>
                  </li>
                </ul>
              </div>

              {earnings && (
                <div className="rounded-3xl border border-violet-200/60 bg-violet-50/50 p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-violet-800">
                    {t("storeDeliveredAll")}
                  </h3>
                  <p className="font-display mt-2 text-2xl font-black text-violet-900">
                    ₹{earnings.estimatedNet}
                  </p>
                  <p className="mt-1 text-xs text-violet-700/90">
                    {t("storeEstNet")} · {earnings.deliveredOrders}{" "}
                    {t("storeOrdersCount")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Low stock */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-zinc-900">
                  {t("storeInvRisk")}
                </h3>
                <p className="text-sm text-zinc-500">
                  {t("storeInvRiskSub").replace(
                    "{n}",
                    String(LOW_STOCK_THRESHOLD),
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTab("menu")}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                {t("storeUpdateStock")}
              </button>
            </div>
            {analytics.lowStock.length === 0 ? (
              <p className="mt-6 text-center text-sm font-medium text-violet-700">
                {t("storeAllClear")}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {analytics.lowStock.slice(0, 12).map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
                  >
                    {p.name}{" "}
                    <span className="text-amber-600">
                      ({p.stock} {t("storeStockLeft")})
                    </span>
                  </span>
                ))}
                {analytics.lowStock.length > 12 && (
                  <span className="self-center text-xs text-zinc-500">
                    {t("storeMoreSkus").replace(
                      "{n}",
                      String(analytics.lowStock.length - 12),
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50">
          <h3 className="font-display text-xl font-bold text-zinc-900">
            {t("storeFulfillTitle")}
          </h3>
          <p className="text-sm text-zinc-500">{t("storeFulfillSub")}</p>
          {!orders.length ? (
            <div className="py-16 text-center text-zinc-500">
              {t("storeNoOrders")}
            </div>
          ) : (
            <>
              {/* Mobile: compact cards */}
              <ul className="mt-5 space-y-2 md:hidden">
                {orders.map((o) => {
                  const itemsText =
                    o.items && o.items.length > 0
                      ? o.items
                          .map((i) => `${i.quantity}× ${i.product.name}`)
                          .join(" · ")
                      : "—";
                  return (
                    <li
                      key={o.id}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${orderStatusStyle(o.status)}`}
                            >
                              {o.status.replace(/_/g, " ")}
                            </span>
                            <button
                              type="button"
                              title={o.id}
                              onClick={() => void copyText(o.id)}
                              className="font-mono text-[11px] text-zinc-400 hover:text-zinc-700"
                            >
                              {o.id.slice(0, 10)}… <span className="font-sans">Copy</span>
                            </button>
                            <span className="ml-auto text-sm font-black text-zinc-900">
                              ₹{o.totalAmount}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-600">
                            <span className="font-semibold text-zinc-800">
                              {o.user?.name ?? o.user?.phone ?? "—"}
                            </span>
                            {o.user?.name && o.user?.phone ? (
                              <span className="text-zinc-400">·</span>
                            ) : null}
                            {o.user?.name && o.user?.phone ? (
                              <span>{o.user.phone}</span>
                            ) : null}
                            <span className="text-zinc-400">·</span>
                            <span className="text-zinc-500">
                              {new Date(o.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {o.storeRejected ? (
                            <p className="mt-1 text-[11px] font-bold text-rose-600">
                              Rejected by store (sent to admin)
                            </p>
                          ) : null}
                          <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                            {itemsText}
                          </p>
                        </div>
                      </div>
                      {(o.status === "PLACED" || o.status === "PREPARING") && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewOrderId(o.id)}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                          >
                            View
                          </button>
                          {o.status === "PLACED" ? (
                            <>
                              <button
                                type="button"
                                className="ui-btn-primary !rounded-xl !py-2 !text-xs"
                                onClick={() => void orderAction(o.id, "PREPARING")}
                              >
                                {t("storeAccept")}
                              </button>
                              <button
                                type="button"
                                className="ui-btn-danger !rounded-xl !px-4"
                                onClick={() => void orderAction(o.id, "CANCELLED")}
                              >
                                {t("storeReject")}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void orderAction(o.id, "READY")}
                              className="ui-btn-rush !rounded-xl !py-2 !text-xs"
                            >
                              {t("storeMarkReady")}
                            </button>
                          )}
                        </div>
                      )}
                      {(o.status !== "PLACED" && o.status !== "PREPARING") && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setViewOrderId(o.id)}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Desktop: table layout */}
              <div className="mt-6 hidden md:block overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                      <th className="pb-3 pr-3">Status</th>
                      <th className="pb-3 pr-3">Order</th>
                      <th className="pb-3 pr-3">Amount</th>
                      <th className="pb-3 pr-3">Customer</th>
                      <th className="pb-3 pr-3">Items</th>
                      <th className="pb-3 pr-3">Time</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.map((o) => {
                      const itemsText =
                        o.items && o.items.length > 0
                          ? o.items
                              .map((i) => `${i.quantity}× ${i.product.name}`)
                              .join(" · ")
                          : "—";
                      return (
                        <tr key={o.id} className="align-top hover:bg-zinc-50/60">
                          <td className="py-3 pr-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${orderStatusStyle(o.status)}`}
                            >
                              {o.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 pr-3 font-mono text-xs text-zinc-600">
                            <button
                              type="button"
                              title={o.id}
                              onClick={() => void copyText(o.id)}
                              className="hover:underline"
                            >
                              {o.id.slice(0, 12)}…
                            </button>
                          </td>
                          <td className="py-3 pr-3 font-black text-zinc-900">
                            ₹{o.totalAmount}
                          </td>
                          <td className="py-3 pr-3 text-zinc-700">
                            <div className="font-semibold text-zinc-900">
                              {o.user?.name ?? "—"}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {o.user?.phone ?? ""}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <div className="max-w-[360px] truncate text-zinc-600">
                              {itemsText}
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-xs text-zinc-500">
                            {new Date(o.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setViewOrderId(o.id)}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                              >
                                View
                              </button>
                              {o.status === "PLACED" ? (
                                <>
                                  <button
                                    type="button"
                                    className="ui-btn-primary !rounded-xl !py-2 !text-xs"
                                    onClick={() =>
                                      void orderAction(o.id, "PREPARING")
                                    }
                                  >
                                    {t("storeAccept")}
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-btn-danger !rounded-xl !px-4"
                                    onClick={() =>
                                      void orderAction(o.id, "CANCELLED")
                                    }
                                  >
                                    {t("storeReject")}
                                  </button>
                                </>
                              ) : o.status === "PREPARING" ? (
                                <button
                                  type="button"
                                  onClick={() => void orderAction(o.id, "READY")}
                                  className="ui-btn-rush !rounded-xl !py-2 !text-xs"
                                >
                                  {t("storeMarkReady")}
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-zinc-400">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MENU TAB */}
      {tab === "menu" && (
        <div className="space-y-8">
          {stores.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950">
              <p className="font-semibold">{t("storeNoOutletsBanner")}</p>
              <button
                type="button"
                onClick={() => setTab("setup")}
                className="mt-3 rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800"
              >
                {t("storeGoSetup")}
              </button>
            </div>
          )}
          {stores.length > 0 && categories.length === 0 && (
            <p className="rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900">
              {t("storeAddCategoryFirstHint")}
            </p>
          )}
          {storeId ? (
            <div className="rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-rose-50/40 to-white p-6 shadow-lg">
              <h3 className="font-display text-lg font-bold text-zinc-900">Store cover image</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Upload from your computer — shows on top of your public shop page (full width).
              </p>
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={coverUploading}
                    className="block w-full text-xs sm:w-auto"
                    onChange={(e) => void onPickStoreCover(e)}
                  />
                  <button
                    type="button"
                    disabled={coverUploading}
                    onClick={() => void saveStoreCover()}
                    className="rounded-xl bg-[#e23744] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#c81d2e] disabled:opacity-60"
                  >
                    {coverUploading ? "Uploading…" : "Save cover"}
                  </button>
                  <button
                    type="button"
                    disabled={coverUploading}
                    onClick={() => setStoreCoverUrl("")}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    Clear
                  </button>
                </div>
                {storeCoverUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storeCoverUrl}
                    alt=""
                    className="mt-4 h-40 w-full rounded-xl object-cover"
                  />
                ) : (
                  <p className="mt-3 text-xs font-semibold text-zinc-500">
                    No cover set yet.
                  </p>
                )}
              </div>
            </div>
          ) : null}
          {storeId ? (
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-lg">
              <h3 className="font-display text-lg font-bold text-zinc-900">Opening hours (customer shop)</h3>
              <p className="mt-1 text-sm text-zinc-500">
                India time (IST). Jab tak ye slot ke andar ho tab tak store &quot;Open&quot; dikhega; bahar &quot;Store closed&quot; aur Add to cart band.
              </p>
              <label className="mt-4 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={hoursEnabled}
                  onChange={(e) => setHoursEnabled(e.target.checked)}
                />
                <span className="text-sm font-semibold text-zinc-800">Use fixed opening hours</span>
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="ui-label">Opens at</label>
                  <input
                    type="time"
                    className="ui-input"
                    disabled={!hoursEnabled}
                    value={hoursOpen}
                    onChange={(e) => setHoursOpen(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ui-label">Closes at</label>
                  <input
                    type="time"
                    className="ui-input"
                    disabled={!hoursEnabled}
                    value={hoursClose}
                    onChange={(e) => setHoursClose(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void saveOpeningHours()}
                className="mt-4 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
              >
                Save hours
              </button>
            </div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-lg">
              <h3 className="font-display text-lg font-bold text-zinc-900">
                {t("storeCatNew")}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  className="ui-input min-w-[200px] flex-1"
                  placeholder={t("storeCategoryPh")}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void addCategory()}
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  {t("storeAdd")}
                </button>
              </div>
            </div>
            <div className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 to-white p-6 shadow-lg">
              <h3 className="font-display text-lg font-bold text-zinc-900">
                {t("storeAddProd")}
              </h3>
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="ui-label">Master category</label>
                    <select
                      className="ui-input"
                      value={addMainKey}
                      onChange={(e) => {
                        setAddMainKey(e.target.value);
                        setAddSubCatId("");
                      }}
                    >
                      <option value="grocery">Grocery</option>
                      <option value="food-beverages">Food &amp; Beverages</option>
                      <option value="electronics">Electronics</option>
                      <option value="fruits-vegetables">Fruits &amp; Vegetables</option>
                    </select>
                  </div>
                  <div>
                    <label className="ui-label">Subcategory</label>
                    <select
                      className="ui-input"
                      value={addSubCatId}
                      onChange={async (e) => {
                        const next = e.target.value;
                        setAddSubCatId(next);
                        const picked = addMasterCatalog?.categories.find(
                          (c) => c.id === next,
                        );
                        if (!picked) return;
                        const id = await ensureStoreCategoryByName(picked.name);
                        if (id) {
                          setPCat(id);
                          await loadCatalog(storeId);
                        }
                      }}
                      disabled={!addMasterCatalog || addMasterCatalog.categories.length === 0}
                    >
                      {(addMasterCatalog?.categories ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="ui-label">{t("storeNameLabel")}</label>
                  <input
                    className="ui-input"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ui-label">{t("adminPrice")}</label>
                    <input
                      className="ui-input"
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ui-label">{t("storeStock")}</label>
                    <input
                      className="ui-input"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="ui-label">Unit / pack (customer)</label>
                  <input
                    className="ui-input"
                    list="store-unit-presets"
                    placeholder="e.g. 500 g, 1 pc"
                    maxLength={40}
                    value={pUnitLabel}
                    onChange={(e) => setPUnitLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ui-label">Product photos (optional) — 2 images</label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                      <label className="text-xs font-bold text-zinc-700">Photo 1</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="mt-2 block w-full text-xs"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          setMsg(null);
                          const up = await uploadStoreCatalogImage(file);
                          if (up.ok) setPImage(up.imageUrl);
                          else setMsg(up.error);
                        }}
                      />
                      {pImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pImage}
                          alt=""
                          className="mt-2 h-24 w-full rounded-lg object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                      <label className="text-xs font-bold text-zinc-700">Photo 2</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="mt-2 block w-full text-xs"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          setMsg(null);
                          const up = await uploadStoreCatalogImage(file);
                          if (up.ok) setPImage2(up.imageUrl);
                          else setMsg(up.error);
                        }}
                      />
                      {pImage2 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pImage2}
                          alt=""
                          className="mt-2 h-24 w-full rounded-lg object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void addProduct()}
                  className="ui-btn-primary w-full !rounded-2xl"
                >
                  {t("storePublish")}
                </button>
              </div>
            </div>
          </div>

          {/* Import from master catalog */}
          {storeId && masterCatalog ? (
            <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-zinc-900">
                    Import products (fast)
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Category select karo, price bhar do, products auto-add ho jayenge. Remove ke liye status toggle use karo.
                  </p>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-2">
                  <div className="w-full min-w-0 sm:w-[200px]">
                    <label className="ui-label">Master category</label>
                    <select
                      className="ui-input"
                      value={masterMainKey}
                      onChange={(e) => {
                        setMasterMainKey(e.target.value);
                        setImportPrices({});
                      }}
                    >
                      <option value="grocery">Grocery</option>
                      <option value="food-beverages">Food &amp; Beverages</option>
                      <option value="electronics">Electronics</option>
                      <option value="fruits-vegetables">Fruits &amp; Vegetables</option>
                    </select>
                  </div>
                  <div className="w-full min-w-0 sm:w-[200px]">
                    <label className="ui-label">Subcategory</label>
                    <select
                      className="ui-input"
                      value={masterCatId}
                      onChange={(e) => {
                        setMasterCatId(e.target.value);
                        setImportPrices({});
                      }}
                    >
                      {masterCatalog.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {(() => {
                const cat = masterCatalog.categories.find((c) => c.id === masterCatId);
                if (!cat) return null;
                return (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
                        {cat.name} products
                      </p>
                      <button
                        type="button"
                        disabled={importing}
                        onClick={() => void importFromMaster()}
                        className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
                          importing ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {importing ? "Importing…" : "Import selected"}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-zinc-100 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                          <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Unit</th>
                            <th className="px-4 py-3">Customer price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {cat.products.map((p) => (
                            <tr key={p.id} className="bg-white">
                              <td className="px-4 py-3 font-semibold text-zinc-900">
                                {p.name}
                              </td>
                              <td className="px-4 py-3 text-zinc-500">
                                {p.unitLabel ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  className="ui-input !py-2"
                                  placeholder="e.g. 40"
                                  value={importPrices[p.id] ?? ""}
                                  onChange={(e) =>
                                    setImportPrices((m) => ({
                                      ...m,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <datalist id="store-unit-presets">
              {UNIT_LABEL_PRESETS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {t("storeCatalog")}
            </h3>
            <div className="mt-6 space-y-8">
              {categories.map((c) => (
                <div key={c.id}>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {c.name}
                  </h4>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs font-bold uppercase text-zinc-500">
                        <tr>
                          <th className="px-4 py-3">{t("storeProduct")}</th>
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3">{t("storePrice")}</th>
                          <th className="px-4 py-3">{t("storeStock")}</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">
                            {t("storeAction")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {c.products.map((p) => (
                          <tr key={p.id} className="bg-white hover:bg-zinc-50/80">
                            <td className="px-4 py-3 font-medium text-zinc-900">
                              {p.name}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  list="store-unit-presets"
                                  maxLength={40}
                                  className="ui-input !max-w-[8.5rem] !py-2 text-xs"
                                  placeholder={
                                    p.unitLabelHint && !p.unitLabel
                                      ? p.unitLabelHint
                                      : "—"
                                  }
                                  title={
                                    p.unitLabelEffective
                                      ? `Shown to customers: ${p.unitLabelEffective}`
                                      : undefined
                                  }
                                  value={unitDraft[p.id] ?? p.unitLabel ?? ""}
                                  onChange={(e) =>
                                    setUnitDraft((m) => ({
                                      ...m,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    void setProductUnitLabel(
                                      p.id,
                                      unitDraft[p.id] ?? p.unitLabel ?? "",
                                    )
                                  }
                                  className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-800 hover:bg-zinc-50"
                                >
                                  Save
                                </button>
                              </div>
                              {!p.unitLabel && p.unitLabelHint ? (
                                <p className="mt-1 text-[10px] font-medium text-zinc-400">
                                  Customers see: {p.unitLabelHint} (from master)
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-violet-700">
                              ₹{p.price}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void setProductStock(p.id, p.stock > 0 ? 0 : 100)
                                    }
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                      p.stock > 0 ? "bg-emerald-600" : "bg-zinc-200"
                                    }`}
                                    aria-pressed={p.stock > 0}
                                    aria-label="Toggle stock"
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                        p.stock > 0 ? "translate-x-5" : "translate-x-1"
                                      }`}
                                    />
                                  </button>
                                  <span
                                    className={`text-xs font-bold ${
                                      p.stock > 0 ? "text-emerald-700" : "text-zinc-500"
                                    }`}
                                  >
                                    {p.stock > 0 ? "In stock" : "Out of stock"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    className={`ui-input !w-24 !py-2 ${
                                      p.stock <= LOW_STOCK_THRESHOLD
                                        ? "!border-amber-300"
                                        : ""
                                    }`}
                                    value={stockDraft[p.id] ?? String(p.stock)}
                                    onChange={(e) =>
                                      setStockDraft((m) => ({
                                        ...m,
                                        [p.id]: e.target.value,
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const raw = (stockDraft[p.id] ?? String(p.stock)).trim();
                                      const n = Number(raw);
                                      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                                        setMsg(t("storeInvalidStock"));
                                        return;
                                      }
                                      void setProductStock(p.id, n);
                                    }}
                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void setProductActive(p.id, p.isActive === false)
                                  }
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                    p.isActive === false
                                      ? "bg-zinc-200"
                                      : "bg-emerald-600"
                                  }`}
                                  aria-pressed={p.isActive !== false}
                                  aria-label="Toggle active"
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                      p.isActive === false
                                        ? "translate-x-1"
                                        : "translate-x-5"
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-xs font-bold ${
                                    p.isActive === false
                                      ? "text-zinc-500"
                                      : "text-emerald-700"
                                  }`}
                                >
                                  {p.isActive === false ? "Inactive" : "Active"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void setProductActive(p.id, !(p.isActive !== false))
                                  }
                                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                                >
                                  {p.isActive !== false ? "Turn off" : "Turn on"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteProduct(p.id)}
                                  className="text-xs font-bold text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETUP TAB */}
      {tab === "setup" && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {t("storeRegOutlet")}
            </h3>
            <p className="text-sm text-zinc-500">{t("storeRegSub")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="ui-label">{t("storeStoreName")}</label>
                <input
                  className="ui-input"
                  placeholder={t("storeNamePh")}
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="ui-label">{t("storeAddress")}</label>
                <input
                  className="ui-input"
                  placeholder={t("storeAddrPh")}
                  value={newStoreAddr}
                  onChange={(e) => setNewStoreAddr(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => captureNewStoreLocation()}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 shadow-sm hover:bg-zinc-50"
                >
                  Capture location (auto latitude/longitude)
                </button>
                <p className="mt-2 text-xs font-semibold text-zinc-500">
                  If you don’t capture, you can still type them manually below.
                </p>
              </div>
              <div>
                <label className="ui-label">{t("storeLatitude")}</label>
                <input
                  className="ui-input"
                  value={newStoreLat}
                  onChange={(e) => setNewStoreLat(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">{t("storeLongitude")}</label>
                <input
                  className="ui-input"
                  value={newStoreLng}
                  onChange={(e) => setNewStoreLng(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                  {t("storePhotosRequiredHeading")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {t("storePhotosRequiredHint")}
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <label className="text-xs font-bold text-zinc-700">
                      {t("storePhoto1Label")}
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={newStoreUp1}
                      className="mt-2 block w-full text-xs"
                      onChange={(e) => void onNewStorePhoto(1, e)}
                    />
                    {newStoreUp1 ? (
                      <p className="mt-2 text-xs text-zinc-500">Uploading…</p>
                    ) : null}
                    {newStorePhoto1 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={newStorePhoto1}
                        alt=""
                        className="mt-2 h-24 w-full rounded-lg object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <label className="text-xs font-bold text-zinc-700">
                      {t("storePhoto2Label")}
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={newStoreUp2}
                      className="mt-2 block w-full text-xs"
                      onChange={(e) => void onNewStorePhoto(2, e)}
                    />
                    {newStoreUp2 ? (
                      <p className="mt-2 text-xs text-zinc-500">Uploading…</p>
                    ) : null}
                    {newStorePhoto2 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={newStorePhoto2}
                        alt=""
                        className="mt-2 h-24 w-full rounded-lg object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void createStore()}
              className="ui-btn-primary mt-6"
            >
              {t("storeSubmit")}
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/50 to-white p-6 shadow-lg">
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {t("storeSubPlans")}
            </h3>
            <p className="text-sm text-zinc-500">{t("storeSubSub")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-bold text-zinc-900">{p.name}</p>
                    <p className="text-sm font-semibold text-violet-600">
                      ₹{p.price}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void subscribe(p.id)}
                    className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100"
                  >
                    {t("storeSubscribe")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </DashboardShell>

      {viewOrder ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewOrderId(null);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${orderStatusStyle(viewOrder.status)}`}
                  >
                    {viewOrder.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    {new Date(viewOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs font-bold text-zinc-900 break-all">
                  {viewOrder.id}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText(viewOrder.id)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100"
                  >
                    Copy ID
                  </button>
                  <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-800">
                    ₹{viewOrder.totalAmount}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewOrderId(null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                  Customer
                </p>
                <p className="mt-2 font-semibold text-zinc-900">
                  {viewOrder.user?.name ?? "—"}
                </p>
                <p className="text-sm text-zinc-600">
                  {viewOrder.user?.phone ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                  Actions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewOrder.status === "PLACED" ? (
                    <>
                      <button
                        type="button"
                        className="ui-btn-primary !rounded-xl !py-2 !text-xs"
                        onClick={() => void orderAction(viewOrder.id, "PREPARING")}
                      >
                        {t("storeAccept")}
                      </button>
                      <button
                        type="button"
                        className="ui-btn-danger !rounded-xl !px-4"
                        onClick={() => void orderAction(viewOrder.id, "CANCELLED")}
                      >
                        {t("storeReject")}
                      </button>
                    </>
                  ) : viewOrder.status === "PREPARING" ? (
                    <button
                      type="button"
                      onClick={() => void orderAction(viewOrder.id, "READY")}
                      className="ui-btn-rush !rounded-xl !py-2 !text-xs"
                    >
                      {t("storeMarkReady")}
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-zinc-500">
                      No actions for this status.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-500">
                  Items
                </div>
                <div className="max-h-[240px] overflow-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-zinc-100 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {viewOrder.items?.length ? (
                        viewOrder.items.map((it, idx) => (
                          <tr key={`${it.product.name}-${idx}`} className="bg-white">
                            <td className="px-4 py-3 font-semibold text-zinc-900">
                              {it.product.name}
                            </td>
                            <td className="px-4 py-3 text-zinc-700">
                              {it.quantity}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-zinc-500" colSpan={2}>
                            —
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function IconNavDash() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

function IconNavOrdersNav() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconNavBox() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconNavGear() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function KpiCard({
  title,
  value,
  sub,
  accent,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-lg shadow-zinc-200/40 transition hover:shadow-xl">
      <div
        className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-[0.12] blur-2xl transition group-hover:opacity-20`}
      />
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <p className="font-display mt-1 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function IconOrders() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function IconRupee() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconBox() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
