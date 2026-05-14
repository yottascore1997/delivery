"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminCharts } from "@/components/dashboard/AdminCharts";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useLocale } from "@/contexts/LocaleContext";
import { api, getToken, getUser } from "@/lib/client-api";

type Stats = {
  users: number;
  stores: number;
  orders: number;
  deliveredOrders: number;
  revenue: {
    gross: number;
    commissionPercent: number;
    platformCommission: number;
  };
};

type AdminOrderRow = {
  id: string;
  status: string;
  storeRejected?: boolean;
  totalAmount: number;
  createdAt: string;
  paymentType?: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  itemsCount?: number;
  items?: {
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { id: string; name: string; unitLabel?: string | null };
  }[];
  store: { name: string; address?: string };
  user: { phone: string; name?: string | null };
  delivery:
    | {
        id: string;
        status: string;
        deliveryBoy?: { id: string; name: string; phone: string } | null;
      }
    | null;
};
type AdminListRequestRow = {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  imageUrl: string;
  note: string;
  address: string;
  status: string;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

type UserRoleValue = "CUSTOMER" | "STORE_OWNER" | "DELIVERY" | "ADMIN";
type StoreStatusValue = "PENDING" | "APPROVED" | "REJECTED";

type AdminUserRow = {
  id: string;
  name: string;
  phone: string;
  role: UserRoleValue;
  createdAt: string;
};

type AdminStoreRow = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  shopVertical: string;
  status: StoreStatusValue;
  commissionPercent?: number | null;
  owner: { id: string; name: string; phone: string };
  createdAt: string;
};

type AdminStoreProductRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  mrp: number | null;
  price: number;
  stock: number;
  isActive: boolean;
  unitLabel?: string | null;
  commissionPercent?: number | null;
  effectiveCommissionPercent: number;
  createdAt: string;
};

type AdminStoreProductSummary = {
  platformDefault: number;
  deliveredGross: number;
  deliveredPlatformCommission: number;
  deliveredEstimatedStoreNet: number;
};

type AdminSettlementRow = {
  id: string;
  storeId: string;
  storeName: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "APPROVED" | "PAID" | "FAILED";
  grossAmount: number;
  platformCommission: number;
  refundAdjustment: number;
  bonusAdjustment: number;
  manualAdjustment: number;
  netPayable: number;
  ordersCount: number;
  blendedCommissionPct?: number | null;
  paymentMode?: string | null;
  referenceNo?: string | null;
  paymentProofUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  paidAt?: string | null;
};

type AdminTab =
  | "overview"
  | "orders"
  | "stores"
  | "productAudit"
  | "users"
  | "riders"
  | "finance"
  | "catalog";

type CatalogNotice = { text: string; tone: "success" | "error" };

function scrollToEl(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type MasterCatalog = {
  mains: {
    id: string;
    key: string;
    name: string;
    sortOrder: number;
    subcategories: {
      id: string;
      name: string;
      imageUrl?: string | null;
      sortOrder: number;
      products: {
        id: string;
        name: string;
        description?: string;
        unitLabel?: string | null;
        imageUrl?: string | null;
        sortOrder: number;
      }[];
    }[];
  }[];
};

/**
 * Relative paths like /uploads/... must use the same host as the open admin page.
 * If NEXT_PUBLIC_API_URL is still http://localhost:3000 in a production build,
 * images would wrongly load from the user's PC — always blank / broken.
 */
function publicBaseForRelativeImages(origin: string): string {
  const envRaw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  const o = origin.replace(/\/$/, "");
  if (!envRaw) return o;
  if (typeof window === "undefined") return envRaw || o;
  try {
    const envUrl = new URL(envRaw);
    const envLocal =
      envUrl.hostname === "localhost" || envUrl.hostname === "127.0.0.1";
    if (!o) return envRaw;
    const originUrl = new URL(origin);
    const originLocal =
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1";
    if (envLocal && !originLocal) return o;
  } catch {
    return o || envRaw;
  }
  return envRaw;
}

function resolvedMasterImageSrc(
  url: string | null | undefined,
  origin: string,
): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) {
    const base = publicBaseForRelativeImages(origin);
    return base ? `${base}${u}` : u;
  }
  return u;
}

function MasterProductImageCell({ imageUrl }: { imageUrl?: string | null }) {
  const [origin, setOrigin] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);
  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);
  const src = resolvedMasterImageSrc(imageUrl, origin);
  if (!src) {
    return (
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-[9px] font-bold leading-tight text-zinc-400"
        title="Is item ke liye abhi koi image save nahi hai (ya URL khali hai)"
      >
        No photo
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-only dynamic catalog URLs
        <img
          src={src}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex max-w-[11rem] flex-col gap-1">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-[9px] font-bold text-amber-800"
            title={src}
          >
            Load fail
          </div>
          <span className="text-[10px] leading-snug text-amber-800">
            Neeche <span className="font-mono text-[9px] break-all">{src}</span> — naya tab mein Open try karen
          </span>
        </div>
      )}
      {!broken ? (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-violet-700 underline"
        >
          Open
        </a>
      ) : (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-violet-700 underline"
        >
          Link
        </a>
      )}
    </div>
  );
}

/** Form mein upload ke turant baad dikhne wala preview */
function PendingCatalogImagePreview({
  imageUrl,
  caption,
}: {
  imageUrl: string;
  caption: string;
}) {
  const [origin, setOrigin] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);
  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);
  const src = resolvedMasterImageSrc(imageUrl, origin);
  if (!src) return null;
  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-white p-2 shadow-sm">
      <p className="mb-2 text-[11px] font-bold text-emerald-900">{caption}</p>
      <div className="flex flex-wrap items-start gap-3">
        {!broken ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview
          <img
            src={src}
            alt=""
            className="h-24 w-24 shrink-0 rounded-lg border border-zinc-200 object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-center text-[10px] font-bold text-rose-800">
            Preview nahi khula
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-zinc-500">Stored path / URL</p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-zinc-600" title={imageUrl}>
            {imageUrl}
          </p>
          {imageUrl.trim().startsWith("/") ? (
            <p className="mt-1 break-all font-mono text-[9px] text-violet-700" title="Browser isi URL se image maangta hai">
              Browser open karega: {src}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingStores, setPendingStores] = useState<
    { id: string; name: string; owner: { phone: string } }[]
  >([]);
  const [approvedStores, setApprovedStores] = useState<AdminStoreRow[]>([]);
  const [allStores, setAllStores] = useState<AdminStoreRow[]>([]);
  const [auditStoreId, setAuditStoreId] = useState("");
  const [auditProducts, setAuditProducts] = useState<AdminStoreProductRow[]>([]);
  const [auditSummary, setAuditSummary] = useState<AdminStoreProductSummary | null>(null);
  const [auditPriceDraft, setAuditPriceDraft] = useState<Record<string, string>>({});
  const [auditMrpDraft, setAuditMrpDraft] = useState<Record<string, string>>({});
  const [auditStockDraft, setAuditStockDraft] = useState<Record<string, string>>({});
  const [auditCommissionDraft, setAuditCommissionDraft] = useState<Record<string, string>>({});
  const [auditActiveDraft, setAuditActiveDraft] = useState<Record<string, boolean>>({});
  const [auditQuery, setAuditQuery] = useState("");
  const [storeDraft, setStoreDraft] = useState<
    Record<string, { name: string; status: StoreStatusValue; shopVertical: string }>
  >({});
  const [storeCommissionDraft, setStoreCommissionDraft] = useState<Record<string, string>>({});
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<"ALL" | UserRoleValue>("ALL");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRoleValue>("CUSTOMER");
  const [userNameDraft, setUserNameDraft] = useState<Record<string, string>>({});
  const [userRoleDraft, setUserRoleDraft] = useState<Record<string, UserRoleValue>>({});
  const [newStoreOwnerId, setNewStoreOwnerId] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [newStoreLat, setNewStoreLat] = useState("");
  const [newStoreLng, setNewStoreLng] = useState("");
  const [newStoreVertical, setNewStoreVertical] = useState("food");
  const [newStoreStatus, setNewStoreStatus] = useState<StoreStatusValue>("PENDING");
  const [readyOrders, setReadyOrders] = useState<AdminOrderRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrderRow[]>([]);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderRiderDraft, setOrderRiderDraft] = useState<Record<string, string>>({});
  const [orderActionDraft, setOrderActionDraft] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);
  const [listRequests, setListRequests] = useState<AdminListRequestRow[]>([]);
  const [deliveryUsers, setDeliveryUsers] = useState<
    { id: string; name: string; phone: string }[]
  >([]);
  const [commission, setCommission] = useState("10");
  const [settlements, setSettlements] = useState<AdminSettlementRow[]>([]);
  const [settlementStoreId, setSettlementStoreId] = useState("");
  const [settlementPeriodStart, setSettlementPeriodStart] = useState("");
  const [settlementPeriodEnd, setSettlementPeriodEnd] = useState("");
  const [settlementRefundAdj, setSettlementRefundAdj] = useState("0");
  const [settlementBonusAdj, setSettlementBonusAdj] = useState("0");
  const [settlementManualAdj, setSettlementManualAdj] = useState("0");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [settlementReferenceDraft, setSettlementReferenceDraft] = useState<Record<string, string>>({});
  const [settlementPaymentModeDraft, setSettlementPaymentModeDraft] = useState<Record<string, "CASH" | "CHEQUE" | "ONLINE">>({});
  const [settlementProofDraft, setSettlementProofDraft] = useState<Record<string, string>>({});
  const [uploadingSettlementProofId, setUploadingSettlementProofId] = useState<string | null>(null);
  const settlementProofInputRef = useRef<HTMLInputElement>(null);
  const settlementProofTargetIdRef = useRef<string | null>(null);
  const [todaysMatchBannerUrl, setTodaysMatchBannerUrl] = useState<string | null>(
    null,
  );
  const [uploadingTodaysMatchBanner, setUploadingTodaysMatchBanner] =
    useState(false);
  const todaysMatchInputRef = useRef<HTMLInputElement>(null);
  const [assignOrderId, setAssignOrderId] = useState("");
  const [assignBoyId, setAssignBoyId] = useState("");
  const [newBoyPhone, setNewBoyPhone] = useState("");
  const [newBoyName, setNewBoyName] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planDays, setPlanDays] = useState("30");
  const [masterCatalog, setMasterCatalog] = useState<MasterCatalog | null>(null);
  const [newMainKey, setNewMainKey] = useState("");
  const [newMainName, setNewMainName] = useState("");
  const [pickMainId, setPickMainId] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubImage, setNewSubImage] = useState("");
  const [newSubFile, setNewSubFile] = useState<File | null>(null);
  const [uploadingSubImage, setUploadingSubImage] = useState(false);
  const [pickSubId, setPickSubId] = useState("");
  const [newProdName, setNewProdName] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdFile, setNewProdFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newProdImage2, setNewProdImage2] = useState("");
  const [newProdFile2, setNewProdFile2] = useState<File | null>(null);
  const [uploadingImage2, setUploadingImage2] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [catalogNotice, setCatalogNotice] = useState<CatalogNotice | null>(null);
  const [catalogImgStorage, setCatalogImgStorage] = useState<{
    cloudinary: boolean;
  } | null>(null);
  const catalogMainListRef = useRef<HTMLDivElement>(null);
  const catalogSubListRef = useRef<HTMLDivElement>(null);
  const catalogProdListRef = useRef<HTMLDivElement>(null);
  const subPhotoInputRef = useRef<HTMLInputElement>(null);
  const subPhotoTargetIdRef = useRef<string | null>(null);
  const prodPhotoInputRef = useRef<HTMLInputElement>(null);
  const prodPhotoTargetIdRef = useRef<string | null>(null);
  const [uploadingSubPhotoId, setUploadingSubPhotoId] = useState<string | null>(null);
  const [uploadingProdPhotoId, setUploadingProdPhotoId] = useState<string | null>(null);

  async function refresh() {
    const s = await api<Stats>("/api/admin/stats");
    if (s.ok && s.data) setStats(s.data);

    const st = await api<{ stores: typeof pendingStores }>(
      "/api/admin/stores?status=PENDING",
    );
    if (st.ok && st.data) setPendingStores(st.data.stores);

    const stApproved = await api<{ stores: typeof approvedStores }>(
      "/api/admin/stores?status=APPROVED&limit=200",
    );
    if (stApproved.ok && stApproved.data) {
      setApprovedStores(stApproved.data.stores);
      setSettlementStoreId((prev) => prev || stApproved.data!.stores[0]?.id || "");
      setAuditStoreId((prev) => prev || stApproved.data!.stores[0]?.id || "");
      setStoreCommissionDraft((prev) => {
        const next = { ...prev };
        for (const sRow of stApproved.data!.stores) {
          if (next[sRow.id] === undefined) {
            next[sRow.id] =
              typeof sRow.commissionPercent === "number" ? String(sRow.commissionPercent) : "";
          }
        }
        return next;
      });
    }
    const stAll = await api<{ stores: AdminStoreRow[] }>("/api/admin/stores?limit=300");
    if (stAll.ok && stAll.data) {
      setAllStores(stAll.data.stores);
      setStoreDraft((prev) => {
        const next = { ...prev };
        for (const sRow of stAll.data!.stores) {
          if (!next[sRow.id]) {
            next[sRow.id] = {
              name: sRow.name,
              status: sRow.status,
              shopVertical: sRow.shopVertical || "food",
            };
          }
        }
        return next;
      });
    }

    const orReady = await api<{ orders: AdminOrderRow[] }>(
      "/api/admin/orders?status=READY&limit=80",
    );
    if (orReady.ok && orReady.data) setReadyOrders(orReady.data.orders);

    const orRecent = await api<{ orders: AdminOrderRow[] }>(
      "/api/admin/orders?limit=50",
    );
    if (orRecent.ok && orRecent.data) setRecentOrders(orRecent.data.orders);

    const lr = await api<{ requests: AdminListRequestRow[] }>(
      "/api/admin/list-requests?limit=60",
    );
    if (lr.ok && lr.data?.requests) setListRequests(lr.data.requests);

    const du = await api<{ users: typeof deliveryUsers }>(
      "/api/admin/users?role=DELIVERY",
    );
    if (du.ok && du.data) setDeliveryUsers(du.data.users);

    const c = await api<{ commissionPercent: number }>("/api/admin/commission");
    if (c.ok && c.data) setCommission(String(c.data.commissionPercent));

    const setRes = await api<{ settlements: AdminSettlementRow[] }>(
      "/api/admin/settlements?limit=120",
    );
    if (setRes.ok && setRes.data?.settlements) {
      setSettlements(setRes.data.settlements);
      setSettlementReferenceDraft((prev) => {
        const next = { ...prev };
        for (const s of setRes.data!.settlements) {
          if (next[s.id] === undefined) next[s.id] = s.referenceNo ?? "";
        }
        return next;
      });
      setSettlementPaymentModeDraft((prev) => {
        const next = { ...prev };
        for (const s of setRes.data!.settlements) {
          const mode = (s.paymentMode ?? "ONLINE") as "CASH" | "CHEQUE" | "ONLINE";
          if (next[s.id] === undefined) next[s.id] = mode;
        }
        return next;
      });
      setSettlementProofDraft((prev) => {
        const next = { ...prev };
        for (const s of setRes.data!.settlements) {
          if (next[s.id] === undefined) next[s.id] = s.paymentProofUrl ?? "";
        }
        return next;
      });
    }

    const usersPath =
      userRoleFilter === "ALL"
        ? "/api/admin/users?limit=200"
        : `/api/admin/users?role=${userRoleFilter}&limit=200`;
    const usersRes = await api<{ users: AdminUserRow[] }>(usersPath);
    if (usersRes.ok && usersRes.data) {
      setAdminUsers(usersRes.data.users);
      setUserNameDraft((prev) => {
        const next = { ...prev };
        for (const u of usersRes.data!.users) {
          if (next[u.id] === undefined) next[u.id] = u.name;
        }
        return next;
      });
      setUserRoleDraft((prev) => {
        const next = { ...prev };
        for (const u of usersRes.data!.users) {
          if (next[u.id] === undefined) next[u.id] = u.role;
        }
        return next;
      });
    }

    const tm = await api<{ imageUrl: string | null }>(
      "/api/shop/todays-match-banner",
    );
    if (tm.ok && tm.data) setTodaysMatchBannerUrl(tm.data.imageUrl ?? null);

    await loadMasterCatalogIntoState();
  }

  async function uploadTodaysMatchBanner(file: File) {
    const token = getToken();
    if (!token) {
      setMsg("Please log in again.");
      return;
    }
    setUploadingTodaysMatchBanner(true);
    setMsg(null);
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/admin/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const raw = (await up.json().catch(() => null)) as
      | { imageUrl?: string; error?: string }
      | null;
    if (!up.ok) {
      setUploadingTodaysMatchBanner(false);
      setMsg(raw?.error || "Image upload failed");
      return;
    }
    const imageUrl = raw?.imageUrl?.trim();
    if (!imageUrl) {
      setUploadingTodaysMatchBanner(false);
      setMsg("Upload did not return an image URL");
      return;
    }
    const put = await api<{ ok?: boolean; imageUrl?: string | null }>(
      "/api/admin/todays-match-banner",
      {
        method: "PUT",
        body: JSON.stringify({ imageUrl }),
      },
    );
    setUploadingTodaysMatchBanner(false);
    if (!put.ok) {
      setMsg(put.error || "Could not save banner");
      return;
    }
    const saved = put.data?.imageUrl ?? imageUrl;
    setTodaysMatchBannerUrl(saved || null);
    setMsg("Today's match banner saved — visible on the shop home.");
  }

  function onTodaysMatchFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void uploadTodaysMatchBanner(file);
  }

  async function clearTodaysMatchBanner() {
    setMsg(null);
    setUploadingTodaysMatchBanner(true);
    const res = await api<{ imageUrl?: string | null }>(
      "/api/admin/todays-match-banner",
      {
        method: "PUT",
        body: JSON.stringify({ imageUrl: "" }),
      },
    );
    setUploadingTodaysMatchBanner(false);
    if (!res.ok) {
      setMsg(res.error || "Could not remove banner");
      return;
    }
    setTodaysMatchBannerUrl(null);
    setMsg("Banner removed from shop home.");
  }

  /** Sirf catalog tree — stats/orders wagairah nahi (Network tab clean, subcategory add ke baad). */
  async function loadMasterCatalogIntoState() {
    const mc = await api<MasterCatalog>("/api/admin/master-catalog");
    if (mc.ok && mc.data) {
      setMasterCatalog(mc.data);
      const main = mc.data.mains[0];
      if (main) {
        setPickMainId((prev) => prev || main.id);
        const sub = main.subcategories[0];
        if (sub) setPickSubId((prev) => prev || sub.id);
      }
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/admin");
      return;
    }
    const u = getUser();
    if (u?.role !== "ADMIN") {
      router.replace("/login?next=/admin&admin=1");
      return;
    }
    void refresh();
  }, [router]);

  useEffect(() => {
    if (settlementPeriodStart && settlementPeriodEnd) return;
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);
    setSettlementPeriodStart(toDateInput(periodStart));
    setSettlementPeriodEnd(toDateInput(periodEnd));
  }, [settlementPeriodStart, settlementPeriodEnd]);

  useEffect(() => {
    if (tab !== "catalog") setCatalogNotice(null);
  }, [tab]);

  useEffect(() => {
    if (tab !== "catalog") return;
    void (async () => {
      const r = await api<{ cloudinary: boolean }>("/api/admin/catalog-storage");
      if (r.ok && r.data) setCatalogImgStorage(r.data);
      else setCatalogImgStorage(null);
    })();
  }, [tab]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRoleFilter]);

  useEffect(() => {
    if (!catalogNotice) return;
    const t = window.setTimeout(() => setCatalogNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [catalogNotice]);

  useEffect(() => {
    if (tab !== "stores" && tab !== "productAudit") return;
    if (!auditStoreId) return;
    void loadAuditProducts(auditStoreId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, auditStoreId]);

  /** Approved stores load async; re-fetch audit when list arrives while on Product Audit tab. */
  useEffect(() => {
    if (tab !== "productAudit") return;
    if (!auditStoreId) return;
    if (!approvedStores.some((s) => s.id === auditStoreId)) return;
    void loadAuditProducts(auditStoreId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedStores, tab, auditStoreId]);

  useEffect(() => {
    if (!msg?.trim()) return;
    setToastMsg(msg.trim());
    const t = window.setTimeout(() => setToastMsg(null), 4200);
    return () => window.clearTimeout(t);
  }, [msg]);

  async function setStoreStatus(id: string, status: "APPROVED" | "REJECTED") {
    setMsg(null);
    const res = await api("/api/admin/store-status", {
      method: "POST",
      body: JSON.stringify({ storeId: id, status }),
    });
    setMsg(res.ok ? t("adminMsgUpdated") : res.error || t("adminMsgError"));
    await refresh();
  }

  async function saveCommission() {
    setMsg(null);
    const res = await api("/api/admin/commission", {
      method: "POST",
      body: JSON.stringify({ commissionPercent: Number(commission) }),
    });
    setMsg(
      res.ok ? t("adminMsgCommissionSaved") : res.error || t("adminMsgError"),
    );
  }

  async function saveStoreCommission(storeId: string) {
    setMsg(null);
    const raw = (storeCommissionDraft[storeId] ?? "").trim();
    const val = raw === "" ? null : Number(raw);
    if (val !== null && (!Number.isFinite(val) || val < 0 || val > 100)) {
      setMsg("Commission must be between 0 and 100.");
      return;
    }
    const res = await api("/api/admin/store-commission", {
      method: "POST",
      body: JSON.stringify({ storeId, commissionPercent: val }),
    });
    setMsg(res.ok ? "Store commission saved ✓" : res.error || t("adminMsgError"));
    await refresh();
  }

  async function generateSettlement() {
    setMsg(null);
    if (!settlementStoreId) {
      setMsg("Pick a store first.");
      return;
    }
    if (!settlementPeriodStart || !settlementPeriodEnd) {
      setMsg("Select settlement period start and end.");
      return;
    }
    const res = await api<{ settlement: AdminSettlementRow }>("/api/admin/settlements", {
      method: "POST",
      body: JSON.stringify({
        storeId: settlementStoreId,
        periodStart: new Date(settlementPeriodStart).toISOString(),
        periodEnd: new Date(settlementPeriodEnd).toISOString(),
        refundAdjustment: Number(settlementRefundAdj || "0"),
        bonusAdjustment: Number(settlementBonusAdj || "0"),
        manualAdjustment: Number(settlementManualAdj || "0"),
        notes: settlementNotes.trim(),
      }),
    });
    setMsg(res.ok ? "Settlement draft generated ✓" : res.error || "Could not generate settlement");
    if (res.ok) {
      setSettlementRefundAdj("0");
      setSettlementBonusAdj("0");
      setSettlementManualAdj("0");
      setSettlementNotes("");
      await refresh();
    }
  }

  async function updateSettlementStatus(
    settlementId: string,
    status: "APPROVED" | "PAID" | "FAILED",
  ) {
    setMsg(null);
    const payload: {
      status: "APPROVED" | "PAID" | "FAILED";
      referenceNo?: string;
      paymentMode?: "CASH" | "CHEQUE" | "ONLINE";
      paymentProofUrl?: string;
      notes?: string;
    } = { status };
    if (status === "PAID") {
      const ref = (settlementReferenceDraft[settlementId] ?? "").trim();
      const mode = settlementPaymentModeDraft[settlementId] ?? "ONLINE";
      const proof = (settlementProofDraft[settlementId] ?? "").trim();
      if (!ref) {
        setMsg("Reference is required to mark settlement as paid.");
        return;
      }
      if (!proof) {
        setMsg("Payment screenshot/proof upload required before marking paid.");
        return;
      }
      payload.referenceNo = ref;
      payload.paymentMode = mode;
      payload.paymentProofUrl = proof;
    }
    const res = await api<{ settlement: AdminSettlementRow }>(
      `/api/admin/settlements/${encodeURIComponent(settlementId)}/status`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    setMsg(res.ok ? `Settlement moved to ${status}.` : res.error || "Could not update settlement");
    if (res.ok) await refresh();
  }

  async function uploadSettlementProof(settlementId: string, file: File) {
    const token = getToken();
    if (!token) {
      setMsg("Please log in again.");
      return;
    }
    setUploadingSettlementProofId(settlementId);
    setMsg(null);
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/admin/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const raw = (await up.json().catch(() => null)) as { imageUrl?: string; error?: string } | null;
    setUploadingSettlementProofId(null);
    if (!up.ok) {
      setMsg(raw?.error || "Payment proof upload failed");
      return;
    }
    const imageUrl = raw?.imageUrl?.trim();
    if (!imageUrl) {
      setMsg("Upload did not return image URL");
      return;
    }
    setSettlementProofDraft((m) => ({ ...m, [settlementId]: imageUrl }));
    setMsg("Payment proof uploaded ✓");
  }

  function onSettlementProofFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const id = settlementProofTargetIdRef.current;
    if (!file || !id) return;
    void uploadSettlementProof(id, file);
  }

  async function createDelivery() {
    setMsg(null);
    const res = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        phone: newBoyPhone,
        name: newBoyName,
        role: "DELIVERY",
      }),
    });
    setMsg(res.ok ? t("adminMsgRiderSaved") : res.error || t("adminMsgError"));
    setNewBoyPhone("");
    setNewBoyName("");
    await refresh();
  }

  async function createAdminUser() {
    setMsg(null);
    const res = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        phone: newUserPhone,
        name: newUserName,
        role: newUserRole,
      }),
    });
    setMsg(res.ok ? "User saved successfully." : res.error || t("adminMsgError"));
    if (res.ok) {
      setNewUserPhone("");
      setNewUserName("");
      setNewUserRole("CUSTOMER");
      await refresh();
    }
  }

  async function saveUser(userId: string) {
    setMsg(null);
    const name = (userNameDraft[userId] ?? "").trim();
    const role = userRoleDraft[userId];
    if (!name || !role) {
      setMsg("Name and role are required.");
      return;
    }
    const res = await api("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ id: userId, name, role }),
    });
    setMsg(res.ok ? "User updated." : res.error || t("adminMsgError"));
    if (res.ok) await refresh();
  }

  async function deleteUser(userId: string) {
    if (!window.confirm("Delete this user? This action cannot be undone.")) return;
    setMsg(null);
    const res = await api("/api/admin/users", {
      method: "DELETE",
      body: JSON.stringify({ id: userId }),
    });
    setMsg(res.ok ? "User deleted." : res.error || t("adminMsgError"));
    if (res.ok) await refresh();
  }

  async function createStoreByAdmin() {
    setMsg(null);
    const latitude = Number(newStoreLat);
    const longitude = Number(newStoreLng);
    if (!newStoreOwnerId.trim() || !newStoreName.trim() || !newStoreAddress.trim()) {
      setMsg("Owner, name and address are required.");
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMsg("Valid latitude and longitude are required.");
      return;
    }
    const res = await api("/api/admin/stores", {
      method: "POST",
      body: JSON.stringify({
        ownerId: newStoreOwnerId.trim(),
        name: newStoreName.trim(),
        address: newStoreAddress.trim(),
        latitude,
        longitude,
        shopVertical: newStoreVertical.trim() || "food",
        status: newStoreStatus,
      }),
    });
    setMsg(res.ok ? "Store created." : res.error || t("adminMsgError"));
    if (res.ok) {
      setNewStoreOwnerId("");
      setNewStoreName("");
      setNewStoreAddress("");
      setNewStoreLat("");
      setNewStoreLng("");
      setNewStoreVertical("food");
      setNewStoreStatus("PENDING");
      await refresh();
    }
  }

  async function saveStore(storeId: string) {
    setMsg(null);
    const draft = storeDraft[storeId];
    const commissionRaw = (storeCommissionDraft[storeId] ?? "").trim();
    const commission =
      commissionRaw === "" ? null : Number.isFinite(Number(commissionRaw)) ? Number(commissionRaw) : NaN;
    if (!draft?.name?.trim()) {
      setMsg("Store name is required.");
      return;
    }
    if (Number.isNaN(commission) || (commission !== null && (commission < 0 || commission > 100))) {
      setMsg("Commission must be between 0 and 100.");
      return;
    }
    const res = await api("/api/admin/stores", {
      method: "PATCH",
      body: JSON.stringify({
        id: storeId,
        name: draft.name.trim(),
        status: draft.status,
        shopVertical: draft.shopVertical.trim() || "food",
        commissionPercent: commission,
      }),
    });
    setMsg(res.ok ? "Store updated." : res.error || t("adminMsgError"));
    if (res.ok) await refresh();
  }

  async function deleteStore(storeId: string) {
    if (!window.confirm("Delete this store? Products, categories and orders may be affected.")) return;
    setMsg(null);
    const res = await api("/api/admin/stores", {
      method: "DELETE",
      body: JSON.stringify({ id: storeId }),
    });
    setMsg(res.ok ? "Store deleted." : res.error || t("adminMsgError"));
    if (res.ok) await refresh();
  }

  async function loadAuditProducts(storeId: string) {
    if (!storeId) {
      setAuditProducts([]);
      setAuditSummary(null);
      return;
    }
    const res = await api<{
      products: AdminStoreProductRow[];
      commissionSummary: AdminStoreProductSummary;
    }>(`/api/admin/store-products?storeId=${encodeURIComponent(storeId)}`);
    if (!res.ok || !res.data) {
      setAuditProducts([]);
      setAuditSummary(null);
      if (tab === "productAudit") {
        setMsg(res.error || "Product audit load failed — check login / API.");
      }
      return;
    }
    setAuditProducts(res.data.products ?? []);
    setAuditSummary(res.data.commissionSummary ?? null);
    setAuditPriceDraft((prev) => {
      const next = { ...prev };
      for (const p of res.data!.products ?? []) if (next[p.id] === undefined) next[p.id] = String(p.price);
      return next;
    });
    setAuditMrpDraft((prev) => {
      const next = { ...prev };
      for (const p of res.data!.products ?? []) if (next[p.id] === undefined) next[p.id] = p.mrp != null ? String(p.mrp) : "";
      return next;
    });
    setAuditStockDraft((prev) => {
      const next = { ...prev };
      for (const p of res.data!.products ?? []) if (next[p.id] === undefined) next[p.id] = String(p.stock);
      return next;
    });
    setAuditCommissionDraft((prev) => {
      const next = { ...prev };
      for (const p of res.data!.products ?? []) if (next[p.id] === undefined) next[p.id] = typeof p.commissionPercent === "number" ? String(p.commissionPercent) : "";
      return next;
    });
    setAuditActiveDraft((prev) => {
      const next = { ...prev };
      for (const p of res.data!.products ?? []) if (next[p.id] === undefined) next[p.id] = p.isActive;
      return next;
    });
  }

  async function saveAuditProduct(productId: string) {
    const price = Number(auditPriceDraft[productId] ?? "");
    const stock = Number(auditStockDraft[productId] ?? "");
    const mrpRaw = (auditMrpDraft[productId] ?? "").trim();
    const commRaw = (auditCommissionDraft[productId] ?? "").trim();
    if (!Number.isFinite(price) || price <= 0) {
      setMsg("Valid selling price required.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setMsg("Valid stock required.");
      return;
    }
    const mrp = mrpRaw === "" ? null : Number(mrpRaw);
    if (mrp != null && (!Number.isFinite(mrp) || mrp <= 0)) {
      setMsg("MRP must be positive or empty.");
      return;
    }
    const commissionPercent = commRaw === "" ? null : Number(commRaw);
    if (commissionPercent != null && (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)) {
      setMsg("Commission must be 0-100 or empty.");
      return;
    }
    const res = await api("/api/products/update", {
      method: "PATCH",
      body: JSON.stringify({
        productId,
        price,
        stock: Math.round(stock),
        ...(mrp != null ? { mrp } : {}),
        commissionPercent,
        isActive: auditActiveDraft[productId] ?? true,
      }),
    });
    setMsg(res.ok ? "Product saved ✓" : res.error || "Could not save product");
    if (res.ok && auditStoreId) await loadAuditProducts(auditStoreId);
  }

  async function assign() {
    setMsg(null);
    const res = await api("/api/delivery/assign", {
      method: "POST",
      body: JSON.stringify({
        orderId: assignOrderId,
        deliveryBoyId: assignBoyId,
      }),
    });
    setMsg(res.ok ? t("adminMsgAssigned") : res.error || t("adminMsgError"));
    await refresh();
  }

  async function assignOrderRider(orderId: string) {
    const deliveryBoyId = (orderRiderDraft[orderId] ?? "").trim();
    if (!deliveryBoyId) {
      setMsg("Please select rider first.");
      return;
    }
    setMsg(null);
    const res = await api("/api/delivery/assign", {
      method: "POST",
      body: JSON.stringify({ orderId, deliveryBoyId }),
    });
    setMsg(res.ok ? "Rider assigned successfully." : res.error || t("adminMsgError"));
    if (res.ok) await refresh();
  }

  async function updateOrderStatus(orderId: string, status: string) {
    setMsg(null);
    const res = await api("/api/orders/update-status", {
      method: "POST",
      body: JSON.stringify({ orderId, status }),
    });
    setMsg(res.ok ? "Order status updated" : res.error || t("adminMsgError"));
    await refresh();
  }

  async function copyText(label: string, value?: string | null) {
    const clean = (value ?? "").trim();
    if (!clean) {
      setMsg(`${label} unavailable`);
      return;
    }
    try {
      await navigator.clipboard.writeText(clean);
      setMsg(`${label} copied`);
    } catch {
      setMsg(`Could not copy ${label.toLowerCase()}`);
    }
  }

  async function downloadInvoice(orderId: string) {
    const token = getToken();
    if (!token) {
      setMsg("Session expired. Please login again.");
      return;
    }
    try {
      const res = await fetch(`/api/orders/store/${encodeURIComponent(orderId)}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        setMsg(txt || "Could not download bill.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `speedza-order-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Bill downloaded.");
    } catch {
      setMsg("Could not download bill.");
    }
  }

  async function applyOrderAction(order: AdminOrderRow) {
    const action = orderActionDraft[order.id] || "";
    if (!action) return;
    if (action === "ASSIGN_RIDER") {
      await assignOrderRider(order.id);
      return;
    }
    if (action === "OUT_FOR_DELIVERY") {
      if (!order.delivery) {
        setMsg("Assign rider first, then mark OUT_FOR_DELIVERY.");
        return;
      }
      await updateOrderStatus(order.id, "OUT_FOR_DELIVERY");
      return;
    }
    await updateOrderStatus(order.id, action);
  }

  async function updateListRequestStatus(id: string, status: string) {
    setMsg(null);
    const res = await api("/api/admin/list-requests", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    setMsg(res.ok ? "List request updated" : res.error || t("adminMsgError"));
    await refresh();
  }

  async function addPlan() {
    setMsg(null);
    const res = await api("/api/subscription-plans", {
      method: "POST",
      body: JSON.stringify({
        name: planName,
        price: Number(planPrice),
        durationDays: Number(planDays),
      }),
    });
    setMsg(res.ok ? t("adminMsgPlanAdded") : res.error || t("adminMsgError"));
    setPlanName("");
    setPlanPrice("");
    await refresh();
  }

  async function addMainCategory() {
    if (!newMainKey.trim() || !newMainName.trim()) {
      setCatalogNotice({
        text: "Main category ke liye key aur name dono bharen.",
        tone: "error",
      });
      return;
    }
    const name = newMainName.trim();
    const res = await api("/api/admin/master-catalog", {
      method: "POST",
      body: JSON.stringify({
        type: "main",
        key: newMainKey.trim(),
        name,
      }),
    });
    if (res.ok) {
      setCatalogNotice({
        text: `Ho gaya — "${name}" ab neeche Main categories list mein dikhega.`,
        tone: "success",
      });
      setNewMainKey("");
      setNewMainName("");
      await loadMasterCatalogIntoState();
      scrollToEl(catalogMainListRef.current);
    } else {
      setCatalogNotice({
        text: res.error || "Main category add nahi ho payi.",
        tone: "error",
      });
    }
  }

  async function addSubcategory() {
    if (uploadingSubImage) {
      setCatalogNotice({
        text: "Pehle image upload khatam hone do — Network mein /api/admin/upload-image dekhen.",
        tone: "error",
      });
      return;
    }
    if (!pickMainId) {
      setCatalogNotice({
        text: "Pehle dropdown se main category chunen.",
        tone: "error",
      });
      return;
    }
    if (!newSubName.trim()) {
      setCatalogNotice({
        text: "Subcategory ka naam likhen.",
        tone: "error",
      });
      return;
    }
    const name = newSubName.trim();
    const res = await api("/api/admin/master-catalog", {
      method: "POST",
      body: JSON.stringify({
        type: "subcategory",
        mainCategoryId: pickMainId,
        name,
        imageUrl: newSubImage.trim() || undefined,
      }),
    });
    if (res.ok) {
      const hadPhoto = Boolean(newSubImage.trim());
      setCatalogNotice({
        text: hadPhoto
          ? `Ho gaya — "${name}" save ho gayi, Cloudinary URL DB mein hai.`
          : `Ho gaya — "${name}" save ho gayi bina photo (imageUrl null). Neeche is row par "Set photo" dabakar upload karen, ya nayi sub ke liye pehle Upload image phir Add subcategory.`,
        tone: "success",
      });
      setNewSubName("");
      setNewSubImage("");
      setNewSubFile(null);
      await loadMasterCatalogIntoState();
      scrollToEl(catalogSubListRef.current);
    } else {
      setCatalogNotice({
        text: res.error || "Subcategory add nahi ho payi.",
        tone: "error",
      });
    }
  }

  /** Yahi function Cloudinary par bhejta hai — POST /api/admin/upload-image */
  async function performSubcategoryImageUpload(file: File) {
    const token = getToken();
    if (!token) {
      setCatalogNotice({ text: "Dobara login karen.", tone: "error" });
      return;
    }
    setUploadingSubImage(true);
    setCatalogNotice({
      text: "Upload chal raha hai: POST /api/admin/upload-image → Cloudinary",
      tone: "success",
    });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = (await res.json().catch(() => null)) as
      | { imageUrl?: string; error?: string }
      | null;
    setUploadingSubImage(false);
    if (!res.ok) {
      setCatalogNotice({
        text: data?.error || "POST /api/admin/upload-image fail — Cloudinary .env + server restart check karen.",
        tone: "error",
      });
      return;
    }
    const url = (data?.imageUrl ?? "").trim();
    setNewSubImage(url);
    setCatalogNotice({
      text: url
        ? `Cloudinary URL mil gayi (${url.length > 52 ? `${url.slice(0, 52)}…` : url}). Ab Add subcategory dabayein.`
        : "Upload response mein imageUrl nahi mila — response body dekhen.",
      tone: url ? "success" : "error",
    });
  }

  async function uploadSubcategoryImage() {
    if (!newSubFile) {
      setCatalogNotice({ text: "Pehle image file chunen.", tone: "error" });
      return;
    }
    await performSubcategoryImageUpload(newSubFile);
  }

  function openSubcategoryPhotoPicker(subId: string) {
    subPhotoTargetIdRef.current = subId;
    subPhotoInputRef.current?.click();
  }

  async function onSubcategoryPhotoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const subId = subPhotoTargetIdRef.current;
    e.target.value = "";
    subPhotoTargetIdRef.current = null;
    if (!file || !subId) return;
    const token = getToken();
    if (!token) {
      setCatalogNotice({ text: "Dobara login karen.", tone: "error" });
      return;
    }
    setUploadingSubPhotoId(subId);
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/admin/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const raw = (await up.json().catch(() => null)) as
      | { imageUrl?: string; error?: string }
      | null;
    setUploadingSubPhotoId(null);
    if (!up.ok) {
      setCatalogNotice({
        text: raw?.error || "Upload fail — Cloudinary .env + restart check karen.",
        tone: "error",
      });
      return;
    }
    const imageUrl = raw?.imageUrl?.trim();
    if (!imageUrl) {
      setCatalogNotice({ text: "Upload OK lekin imageUrl khali — API response dekhen.", tone: "error" });
      return;
    }
    const patch = await api("/api/admin/master-catalog", {
      method: "PATCH",
      body: JSON.stringify({
        type: "subcategory",
        id: subId,
        imageUrl,
      }),
    });
    if (patch.ok) {
      setCatalogNotice({
        text: "Subcategory photo DB mein save ho gayi — GET mein ab imageUrl dikhega.",
        tone: "success",
      });
      await loadMasterCatalogIntoState();
    } else {
      setCatalogNotice({
        text: patch.error || "PATCH fail — subcategory update nahi hua.",
        tone: "error",
      });
    }
  }

  function openProductPhotoPicker(productId: string) {
    prodPhotoTargetIdRef.current = productId;
    prodPhotoInputRef.current?.click();
  }

  async function onProductPhotoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const productId = prodPhotoTargetIdRef.current;
    e.target.value = "";
    prodPhotoTargetIdRef.current = null;
    if (!file || !productId) return;
    const token = getToken();
    if (!token) {
      setCatalogNotice({ text: "Dobara login karen.", tone: "error" });
      return;
    }
    setUploadingProdPhotoId(productId);
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/admin/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const raw = (await up.json().catch(() => null)) as
      | { imageUrl?: string; error?: string }
      | null;
    setUploadingProdPhotoId(null);
    if (!up.ok) {
      setCatalogNotice({
        text: raw?.error || "Upload fail.",
        tone: "error",
      });
      return;
    }
    const imageUrl = raw?.imageUrl?.trim();
    if (!imageUrl) {
      setCatalogNotice({ text: "Upload OK lekin imageUrl khali.", tone: "error" });
      return;
    }
    const patch = await api("/api/admin/master-catalog", {
      method: "PATCH",
      body: JSON.stringify({
        type: "product",
        id: productId,
        imageUrl,
      }),
    });
    if (patch.ok) {
      setCatalogNotice({ text: "Product photo DB mein save ho gayi.", tone: "success" });
      await loadMasterCatalogIntoState();
    } else {
      setCatalogNotice({ text: patch.error || "PATCH fail.", tone: "error" });
    }
  }

  async function addMasterProduct() {
    if (uploadingImage || uploadingImage2) {
      setCatalogNotice({
        text: "Pehle image upload khatam hone do — /api/admin/upload-image.",
        tone: "error",
      });
      return;
    }
    if (!pickSubId) {
      setCatalogNotice({
        text: "Product ke liye pehle subcategory dropdown se ek option chunen.",
        tone: "error",
      });
      return;
    }
    if (!newProdName.trim()) {
      setCatalogNotice({
        text: "Product ka naam likhen.",
        tone: "error",
      });
      return;
    }
    const name = newProdName.trim();
    const res = await api("/api/admin/master-catalog", {
      method: "POST",
      body: JSON.stringify({
        type: "product",
        subcategoryId: pickSubId,
        name,
        unitLabel: newProdUnit.trim() || undefined,
        imageUrl: newProdImage.trim() || undefined,
        imageUrl2: newProdImage2.trim() || undefined,
      }),
    });
    if (res.ok) {
      setCatalogNotice({
        text: `Ho gaya — "${name}" Products table mein hai. Image column mein thumbnail tab dikhega jab aapne upload ke baad Add product dabaya ho.`,
        tone: "success",
      });
      setNewProdName("");
      setNewProdUnit("");
      setNewProdImage("");
      setNewProdFile(null);
      setNewProdImage2("");
      setNewProdFile2(null);
      await loadMasterCatalogIntoState();
      scrollToEl(catalogProdListRef.current);
    } else {
      setCatalogNotice({
        text: res.error || "Product add nahi ho paya.",
        tone: "error",
      });
    }
  }

  async function performProductImageUpload(file: File, slot: 1 | 2) {
    const token = getToken();
    if (!token) {
      setCatalogNotice({ text: "Dobara login karen.", tone: "error" });
      return;
    }
    if (slot === 1) setUploadingImage(true);
    else setUploadingImage2(true);
    setCatalogNotice({
      text: "Upload chal raha hai: POST /api/admin/upload-image → Cloudinary",
      tone: "success",
    });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = (await res.json().catch(() => null)) as
      | { imageUrl?: string; error?: string }
      | null;
    if (slot === 1) setUploadingImage(false);
    else setUploadingImage2(false);
    if (!res.ok) {
      setCatalogNotice({
        text: data?.error || "POST /api/admin/upload-image fail.",
        tone: "error",
      });
      return;
    }
    const url = (data?.imageUrl ?? "").trim();
    if (slot === 1) setNewProdImage(url);
    else setNewProdImage2(url);
    setCatalogNotice({
      text: url
        ? `Cloudinary URL mil gayi. Ab Add product dabayein taaki DB mein save ho.`
        : "Response mein imageUrl khali.",
      tone: url ? "success" : "error",
    });
  }

  async function uploadProductImage() {
    if (!newProdFile) {
      setCatalogNotice({ text: "Pehle image file chunen.", tone: "error" });
      return;
    }
    await performProductImageUpload(newProdFile, 1);
  }

  async function uploadProductImage2() {
    if (!newProdFile2) {
      setCatalogNotice({ text: "Pehle image file #2 chunen.", tone: "error" });
      return;
    }
    await performProductImageUpload(newProdFile2, 2);
  }

  async function removeEntity(type: "main" | "subcategory" | "product", id: string) {
    const res = await api("/api/admin/master-catalog", {
      method: "DELETE",
      body: JSON.stringify({ type, id }),
    });
    if (res.ok) {
      const labels: Record<typeof type, string> = {
        main: "Main category hata di gayi.",
        subcategory: "Subcategory hata di gayi.",
        product: "Product hata diya gaya.",
      };
      setCatalogNotice({ text: labels[type], tone: "success" });
      await loadMasterCatalogIntoState();
    } else {
      setCatalogNotice({
        text: res.error || "Delete nahi ho paya.",
        tone: "error",
      });
    }
  }

  const breadcrumb =
    tab === "overview"
      ? t("adminBreadcrumbOverview")
      : tab === "orders"
        ? "Orders"
      : tab === "stores"
        ? t("adminBreadcrumbStores")
        : tab === "productAudit"
          ? "Product Audit"
        : tab === "users"
          ? "Users"
        : tab === "riders"
          ? t("adminBreadcrumbRiders")
          : tab === "finance"
            ? t("adminBreadcrumbFinance")
            : "Master Catalog";

  const chartStats = stats
    ? {
        users: stats.users,
        stores: stats.stores,
        orders: stats.orders,
        deliveredOrders: stats.deliveredOrders,
      }
    : null;
  const selectedMain = masterCatalog?.mains.find((m) => m.id === pickMainId);
  const selectedSub = selectedMain?.subcategories.find((s) => s.id === pickSubId);
  const filteredAdminOrders = recentOrders.filter((o) => {
    if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
    const q = orderQuery.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      o.id,
      o.store?.name ?? "",
      o.user?.name ?? "",
      o.user?.phone ?? "",
      o.deliveryAddress ?? "",
      o.delivery?.deliveryBoy?.name ?? "",
      o.delivery?.deliveryBoy?.phone ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
  const orderStatusCounts = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const filteredAuditProducts = auditProducts.filter((p) => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q);
  });

  return (
    <DashboardShell
      roleLabel={t("roleAdmin")}
      breadcrumb={breadcrumb}
      activeId={tab}
      onNav={(id) => setTab(id as AdminTab)}
      onRefresh={() => void refresh()}
      navItems={[
        {
          id: "overview",
          label: t("adminNavOverview"),
          icon: <IconAdminDash />,
        },
        {
          id: "orders",
          label: "Orders",
          icon: <IconAdminOrders />,
        },
        {
          id: "stores",
          label: t("adminNavStores"),
          icon: <IconAdminStore />,
        },
        {
          id: "productAudit",
          label: "Product Audit",
          icon: <IconAdminCatalog />,
        },
        {
          id: "users",
          label: "Users",
          icon: <IconAdminUsers />,
        },
        {
          id: "riders",
          label: t("adminNavRiders"),
          icon: <IconAdminRider />,
        },
        {
          id: "finance",
          label: t("adminNavFinance"),
          icon: <IconAdminFinance />,
        },
        {
          id: "catalog",
          label: "Catalog",
          icon: <IconAdminCatalog />,
        },
      ]}
      bottomLinks={[
        { href: "/", label: t("home") },
        { href: "/store", label: t("adminLinkStore") },
        { href: "/delivery", label: t("adminLinkRider") },
      ]}
    >
      {msg && tab !== "catalog" && (
        <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-950">
          {msg}
        </div>
      )}
      {toastMsg ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[200] max-w-sm rounded-2xl border border-zinc-200 bg-zinc-900/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toastMsg}
        </div>
      ) : null}

      {tab === "overview" && (
        <div className="space-y-8">
          {stats && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                emoji="👥"
                label={t("adminKpiUsers")}
                value={stats.users}
                tint="from-violet-500 to-purple-600"
              />
              <StatCard
                emoji="🏪"
                label={t("adminKpiStores")}
                value={stats.stores}
                tint="from-violet-500 to-fuchsia-600"
              />
              <StatCard
                emoji="📦"
                label={t("adminKpiOrders")}
                value={stats.orders}
                tint="from-amber-500 to-orange-600"
              />
              <StatCard
                emoji="✅"
                label={t("adminKpiDelivered")}
                value={stats.deliveredOrders}
                tint="from-sky-500 to-blue-600"
              />
            </section>
          )}

          <section className="rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white p-6 shadow-lg shadow-violet-100/50">
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {t("adminTodaysMatchTitle")}
            </h3>
            <p className="mt-1 text-sm font-medium text-zinc-600">
              {t("adminTodaysMatchSub")}
            </p>
            <input
              ref={todaysMatchInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploadingTodaysMatchBanner}
              onChange={onTodaysMatchFileChange}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={uploadingTodaysMatchBanner}
                onClick={() => todaysMatchInputRef.current?.click()}
                className="rounded-xl border border-violet-300 bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
              >
                {uploadingTodaysMatchBanner
                  ? t("adminTodaysMatchUploading")
                  : t("adminTodaysMatchSave")}
              </button>
              <button
                type="button"
                disabled={uploadingTodaysMatchBanner || !todaysMatchBannerUrl}
                onClick={() => void clearTodaysMatchBanner()}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {t("adminTodaysMatchClear")}
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold text-zinc-500">
              {t("adminTodaysMatchPreview")}
            </p>
            {todaysMatchBannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={todaysMatchBannerUrl}
                alt=""
                className="mt-2 max-h-48 w-full max-w-2xl rounded-2xl border border-zinc-200 object-contain object-left"
              />
            ) : (
              <p className="mt-2 text-sm text-zinc-500">{t("adminTodaysMatchNone")}</p>
            )}
          </section>

          <section className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-xl shadow-emerald-100/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-zinc-900">
                Photo list requests
              </h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {listRequests.filter((r) => r.status !== "DELIVERED" && r.status !== "REJECTED").length} active
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              Customer uploaded grocery lists. Review and mark delivery status.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">Photo</th>
                    <th className="pb-3 pr-3">Customer</th>
                    <th className="pb-3 pr-3">Address / note</th>
                    <th className="pb-3 pr-3">Created</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listRequests.slice(0, 15).map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100 align-top last:border-0">
                      <td className="py-3 pr-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.imageUrl}
                          alt=""
                          className="h-16 w-16 rounded-xl border border-zinc-200 object-cover"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-zinc-900">{r.userName || "Customer"}</p>
                        <p className="text-xs text-zinc-500">{r.userPhone}</p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-400">#{r.id.slice(0, 8)}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="max-w-xs text-xs text-zinc-700">{r.address || "No address"}</p>
                        {r.note ? <p className="mt-1 max-w-xs text-xs text-zinc-500">Note: {r.note}</p> : null}
                      </td>
                      <td className="py-3 pr-3 text-xs text-zinc-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${listRequestStatusStyle(r.status)}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void updateListRequestStatus(r.id, "IN_REVIEW")}
                            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateListRequestStatus(r.id, "OUT_FOR_DELIVERY")}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
                          >
                            Out
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateListRequestStatus(r.id, "DELIVERED")}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                          >
                            Delivered
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listRequests.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">No photo list requests yet.</p>
              ) : null}
            </div>
          </section>

          <AdminCharts
            stats={chartStats}
            orders={recentOrders}
            titleBar={t("adminChartPlatform")}
            titleDonut={t("adminChartMix")}
          />

          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50">
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {t("adminRecentInvoices")}
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">{t("adminColOrder")}</th>
                    <th className="pb-3 pr-3">{t("adminColStore")}</th>
                    <th className="pb-3 pr-3">{t("adminColCustomer")}</th>
                    <th className="pb-3 pr-3">{t("storeColDate")}</th>
                    <th className="pb-3 pr-3">{t("adminColAmount")}</th>
                    <th className="pb-3">{t("adminColStatus")}</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.slice(0, 10).map((o) => (
                    <tr key={o.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-3 font-mono text-xs text-zinc-600">
                        {o.id.slice(0, 8)}…
                      </td>
                      <td className="py-3 pr-3 font-medium text-zinc-900">
                        {o.store.name}
                      </td>
                      <td className="py-3 pr-3 text-zinc-600">
                        {o.user?.name ?? o.user?.phone ?? "—"}
                      </td>
                      <td className="py-3 pr-3 text-zinc-600">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-zinc-900">
                        ₹{Math.round(o.totalAmount * 100) / 100}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${adminOrderStatusStyle(o.status)}`}
                          >
                            {o.status.replace(/_/g, " ")}
                          </span>
                          {o.storeRejected ? (
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-800">
                              Store rejected
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        {o.status === "PLACED" ? (
                          <button
                            type="button"
                            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"
                            onClick={() => void updateOrderStatus(o.id, "PREPARING")}
                          >
                            Take over
                          </button>
                        ) : o.status === "PREPARING" ? (
                          <button
                            type="button"
                            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"
                            onClick={() => void updateOrderStatus(o.id, "READY")}
                          >
                            Mark READY
                          </button>
                        ) : o.status === "READY" ? (
                          <span className="text-xs font-semibold text-zinc-500">Assign rider below</span>
                        ) : (
                          <span className="text-xs font-semibold text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentOrders.length === 0 && (
                <p className="py-6 text-center text-sm text-zinc-500">
                  {t("adminNoRecentOrders")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-zinc-900">Orders control center</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Saare orders ka detailed view: customer, store, rider, address aur quick actions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Total", recentOrders.length],
                  ["Ready", orderStatusCounts.READY ?? 0],
                  ["Out", orderStatusCounts.OUT_FOR_DELIVERY ?? 0],
                  ["Delivered", orderStatusCounts.DELIVERED ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-center"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</p>
                    <p className="text-lg font-black text-zinc-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <input
                className="ui-input sm:col-span-2"
                placeholder="Search by order id, store, customer, rider or address"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
              />
              <select
                className="ui-input"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="ALL">All status</option>
                <option value="PLACED">PLACED</option>
                <option value="PREPARING">PREPARING</option>
                <option value="READY">READY</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-3">Order</th>
                    <th className="pb-3 pr-3">Store</th>
                    <th className="pb-3 pr-3">Customer</th>
                    <th className="pb-3 pr-3">Address</th>
                    <th className="pb-3 pr-3">Rider</th>
                    <th className="pb-3 pr-3">Payment</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Created</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAdminOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 pr-3">
                        <p className="font-mono text-xs font-semibold text-zinc-700">#{o.id.slice(0, 10)}…</p>
                        <p className="mt-1 text-xs text-zinc-500">{o.itemsCount ?? 0} items</p>
                        <p className="text-xs font-semibold text-zinc-800">₹{Math.round(o.totalAmount * 100) / 100}</p>
                        <button
                          type="button"
                          className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-100"
                          onClick={() => setSelectedOrder(o)}
                        >
                          View details
                        </button>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-zinc-900">{o.store.name}</p>
                        <p className="mt-1 max-w-[220px] text-xs text-zinc-500">{o.store.address ?? "No store address"}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-zinc-900">{o.user?.name || "Customer"}</p>
                        <p className="text-xs text-zinc-600">{o.user?.phone ?? "—"}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="max-w-[260px] text-xs text-zinc-700">{o.deliveryAddress || "No delivery address"}</p>
                      </td>
                      <td className="py-3 pr-3">
                        {o.delivery?.deliveryBoy ? (
                          <>
                            <p className="font-semibold text-zinc-900">{o.delivery.deliveryBoy.name}</p>
                            <p className="text-xs text-zinc-600">{o.delivery.deliveryBoy.phone}</p>
                            <button
                              type="button"
                              className="mt-1 rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-black text-zinc-700 hover:bg-zinc-50"
                              onClick={() => void copyText("Rider ID", o.delivery?.deliveryBoy?.id)}
                            >
                              Copy rider ID
                            </button>
                          </>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-zinc-500">Not assigned</p>
                            <select
                              className="ui-input !py-1.5 text-xs"
                              value={orderRiderDraft[o.id] ?? ""}
                              onChange={(e) =>
                                setOrderRiderDraft((prev) => ({ ...prev, [o.id]: e.target.value }))
                              }
                            >
                              <option value="">Select rider</option>
                              {deliveryUsers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.phone})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                              onClick={() => void assignOrderRider(o.id)}
                            >
                              Assign rider
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                          {o.paymentType || "COD"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${adminOrderStatusStyle(o.status)}`}
                          >
                            {o.status.replace(/_/g, " ")}
                          </span>
                          {o.storeRejected ? (
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-800">
                              Store rejected
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-zinc-600">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex min-w-[280px] flex-wrap justify-end gap-1.5">
                          <select
                            className="ui-input !w-[170px] !py-1.5 text-xs"
                            value={orderActionDraft[o.id] ?? ""}
                            onChange={(e) =>
                              setOrderActionDraft((prev) => ({ ...prev, [o.id]: e.target.value }))
                            }
                          >
                            <option value="">Quick action</option>
                            <option value="PREPARING">Mark PREPARING</option>
                            <option value="READY">Mark READY</option>
                            <option value="OUT_FOR_DELIVERY">Mark OUT_FOR_DELIVERY</option>
                            <option value="CANCELLED">Cancel order</option>
                            <option value="ASSIGN_RIDER">Assign selected rider</option>
                          </select>
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
                            onClick={() => void applyOrderAction(o)}
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                            onClick={() => void downloadInvoice(o.id)}
                          >
                            Download bill
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
                            onClick={() => setSelectedOrder(o)}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAdminOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-zinc-500">
                        No orders found for selected filter/search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {selectedOrder ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-zinc-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-violet-600">Order detail view</p>
                <h3 className="font-display text-xl font-bold text-zinc-900">
                  #{selectedOrder.id.slice(0, 12)}…
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {selectedOrder.store.name} · {selectedOrder.user?.name || selectedOrder.user?.phone || "Customer"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Amount</p>
                <p className="mt-1 text-lg font-black text-zinc-900">
                  ₹{Math.round(selectedOrder.totalAmount * 100) / 100}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Status</p>
                <p className="mt-1 text-sm font-bold text-zinc-800">{selectedOrder.status.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Payment</p>
                <p className="mt-1 text-sm font-bold text-zinc-800">{selectedOrder.paymentType || "COD"}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-200">
              <div className="border-b border-zinc-200 px-4 py-3">
                <h4 className="text-sm font-black text-zinc-900">Products in this order</h4>
              </div>
              <div className="divide-y divide-zinc-100">
                {selectedOrder.items?.length ? (
                  selectedOrder.items.map((it) => (
                    <div key={`${selectedOrder.id}-${it.product.id}`} className="flex items-center justify-between px-4 py-2.5">
                      <p className="text-sm text-zinc-800">
                        <span className="font-semibold">{it.quantity}x</span> {it.product.name}
                        <span className="text-xs text-zinc-500"> ({it.product.unitLabel || "unit"})</span>
                      </p>
                      <p className="text-sm font-bold text-zinc-900">₹{Math.round(it.lineTotal * 100) / 100}</p>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-zinc-500">No item details available.</p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <p>
                <span className="font-black text-zinc-900">Delivery address:</span>{" "}
                {selectedOrder.deliveryAddress || "No address"}
              </p>
              <p className="mt-1">
                <span className="font-black text-zinc-900">Rider:</span>{" "}
                {selectedOrder.delivery?.deliveryBoy
                  ? `${selectedOrder.delivery.deliveryBoy.name} (${selectedOrder.delivery.deliveryBoy.phone})`
                  : "Not assigned"}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                onClick={() => void copyText("Order ID", selectedOrder.id)}
              >
                Copy order ID
              </button>
              <button
                type="button"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800"
                onClick={() => void downloadInvoice(selectedOrder.id)}
              >
                Download bill
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "stores" && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                {t("adminPending")}
              </h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                {pendingStores.length} {t("adminWaiting")}
              </span>
            </div>
            <ul className="mt-5 space-y-3">
              {pendingStores.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">{s.name}</p>
                    <p className="text-sm text-zinc-500">{s.owner.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ui-btn-primary !py-2 !px-4 !text-xs"
                      onClick={() => void setStoreStatus(s.id, "APPROVED")}
                    >
                      {t("adminApprove")}
                    </button>
                    <button
                      type="button"
                      className="ui-btn-danger !rounded-xl !px-4"
                      onClick={() => void setStoreStatus(s.id, "REJECTED")}
                    >
                      {t("adminReject")}
                    </button>
                  </div>
                </li>
              ))}
              {!pendingStores.length && (
                <li className="py-8 text-center text-sm text-zinc-500">
                  {t("adminNoPending")}
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold text-zinc-900">Create Store</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Owner user id must belong to a STORE_OWNER account.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="ui-input"
                placeholder="Owner User ID"
                value={newStoreOwnerId}
                onChange={(e) => setNewStoreOwnerId(e.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Store name"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
              />
              <input
                className="ui-input sm:col-span-2"
                placeholder="Address"
                value={newStoreAddress}
                onChange={(e) => setNewStoreAddress(e.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Latitude"
                value={newStoreLat}
                onChange={(e) => setNewStoreLat(e.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Longitude"
                value={newStoreLng}
                onChange={(e) => setNewStoreLng(e.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Vertical (food/grocery)"
                value={newStoreVertical}
                onChange={(e) => setNewStoreVertical(e.target.value)}
              />
              <select
                className="ui-input"
                value={newStoreStatus}
                onChange={(e) => setNewStoreStatus(e.target.value as StoreStatusValue)}
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <button
              type="button"
              className="ui-btn-dark mt-4 !rounded-2xl !px-6 !py-3"
              onClick={() => void createStoreByAdmin()}
            >
              Create Store
            </button>
          </section>

          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900">Stores CRUD</h2>
              <span className="text-xs font-semibold text-zinc-500">{allStores.length} total</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">Store</th>
                    <th className="pb-3 pr-3">Owner</th>
                    <th className="pb-3 pr-3">Vertical</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Commission %</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {allStores.map((s) => (
                    <tr key={s.id} className="bg-white">
                      <td className="py-3 pr-3">
                        <input
                          className="ui-input !py-2 min-w-[190px]"
                          value={storeDraft[s.id]?.name ?? s.name}
                          onChange={(e) =>
                            setStoreDraft((m) => ({
                              ...m,
                              [s.id]: {
                                name: e.target.value,
                                status: m[s.id]?.status ?? s.status,
                                shopVertical: m[s.id]?.shopVertical ?? s.shopVertical,
                              },
                            }))
                          }
                        />
                        <p className="mt-1 text-[10px] font-mono text-zinc-500">{s.id.slice(0, 12)}…</p>
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">
                        <p className="font-semibold text-zinc-900">{s.owner?.name ?? "—"}</p>
                        <p className="text-xs text-zinc-500">{s.owner?.phone ?? ""}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          className="ui-input !py-2 w-32"
                          value={storeDraft[s.id]?.shopVertical ?? s.shopVertical}
                          onChange={(e) =>
                            setStoreDraft((m) => ({
                              ...m,
                              [s.id]: {
                                name: m[s.id]?.name ?? s.name,
                                status: m[s.id]?.status ?? s.status,
                                shopVertical: e.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          className="ui-input !py-2 w-36"
                          value={storeDraft[s.id]?.status ?? s.status}
                          onChange={(e) =>
                            setStoreDraft((m) => ({
                              ...m,
                              [s.id]: {
                                name: m[s.id]?.name ?? s.name,
                                status: e.target.value as StoreStatusValue,
                                shopVertical: m[s.id]?.shopVertical ?? s.shopVertical,
                              },
                            }))
                          }
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          className="ui-input !py-2 w-24"
                          placeholder={commission}
                          value={storeCommissionDraft[s.id] ?? ""}
                          onChange={(e) =>
                            setStoreCommissionDraft((m) => ({ ...m, [s.id]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800"
                            onClick={() => void saveStore(s.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                            onClick={() => void deleteStore(s.id)}
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
          </section>

        </div>
      )}

      {tab === "productAudit" && (
        <section className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white p-6 shadow-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-900">Store product audit & manage</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Admin can view all products, effective commission, stock, price and active state.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <select
                className="ui-input min-w-[240px]"
                value={auditStoreId}
                onChange={(e) => setAuditStoreId(e.target.value)}
              >
                <option value="">Select store</option>
                {approvedStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className="ui-input min-w-[220px]"
                placeholder="Search product/category"
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
              />
            </div>
          </div>
          {auditSummary ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Delivered gross</p>
                <p className="mt-1 text-xl font-black text-zinc-900">₹{auditSummary.deliveredGross}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Platform commission</p>
                <p className="mt-1 text-xl font-black text-rose-700">₹{auditSummary.deliveredPlatformCommission}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Store estimated net</p>
                <p className="mt-1 text-xl font-black text-emerald-700">₹{auditSummary.deliveredEstimatedStoreNet}</p>
              </div>
            </div>
          ) : null}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1220px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-3">Product</th>
                  <th className="pb-3 pr-3">Category</th>
                  <th className="pb-3 pr-3">MRP</th>
                  <th className="pb-3 pr-3">Price</th>
                  <th className="pb-3 pr-3">Stock</th>
                  <th className="pb-3 pr-3">Product %</th>
                  <th className="pb-3 pr-3">Effective %</th>
                  <th className="pb-3 pr-3">Active</th>
                  <th className="pb-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAuditProducts.map((p) => (
                  <tr key={p.id} className="bg-white">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-zinc-900">{p.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{p.id.slice(0, 10)}…</p>
                    </td>
                    <td className="py-3 pr-3 text-zinc-700">{p.categoryName}</td>
                    <td className="py-3 pr-3">
                      <input
                        className="ui-input !py-2 w-24"
                        value={auditMrpDraft[p.id] ?? ""}
                        onChange={(e) => setAuditMrpDraft((m) => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="MRP"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        className="ui-input !py-2 w-24"
                        value={auditPriceDraft[p.id] ?? String(p.price)}
                        onChange={(e) => setAuditPriceDraft((m) => ({ ...m, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        className="ui-input !py-2 w-20"
                        value={auditStockDraft[p.id] ?? String(p.stock)}
                        onChange={(e) => setAuditStockDraft((m) => ({ ...m, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        className="ui-input !py-2 w-20"
                        value={auditCommissionDraft[p.id] ?? ""}
                        onChange={(e) => setAuditCommissionDraft((m) => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="default"
                      />
                    </td>
                    <td className="py-3 pr-3 font-semibold text-zinc-700">
                      {p.effectiveCommissionPercent}%
                    </td>
                    <td className="py-3 pr-3">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700">
                        <input
                          type="checkbox"
                          checked={auditActiveDraft[p.id] ?? p.isActive}
                          onChange={(e) =>
                            setAuditActiveDraft((m) => ({ ...m, [p.id]: e.target.checked }))
                          }
                        />
                        {auditActiveDraft[p.id] ?? p.isActive ? "Active" : "Inactive"}
                      </label>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800"
                        onClick={() => void saveAuditProduct(p.id)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAuditProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-zinc-500">
                      {auditStoreId ? "No products found for this store." : "Select a store to audit products."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "users" && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900">Create User</h2>
              <span className="text-xs font-semibold text-zinc-500">
                Use this for CUSTOMER / STORE_OWNER / DELIVERY accounts
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                className="ui-input"
                placeholder="Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <input
                className="ui-input"
                placeholder="Phone"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
              />
              <select
                className="ui-input"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRoleValue)}
              >
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="STORE_OWNER">STORE_OWNER</option>
                <option value="DELIVERY">DELIVERY</option>
              </select>
            </div>
            <button
              type="button"
              className="ui-btn-dark mt-4 !rounded-2xl !px-6 !py-3"
              onClick={() => void createAdminUser()}
            >
              Create / Upsert User
            </button>
          </section>

          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-zinc-900">Users CRUD</h2>
              <select
                className="ui-input !w-52"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as "ALL" | UserRoleValue)}
              >
                <option value="ALL">All roles</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="STORE_OWNER">STORE_OWNER</option>
                <option value="DELIVERY">DELIVERY</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">Name</th>
                    <th className="pb-3 pr-3">Phone</th>
                    <th className="pb-3 pr-3">Role</th>
                    <th className="pb-3 pr-3">Joined</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="bg-white">
                      <td className="py-3 pr-3">
                        <input
                          className="ui-input !py-2 min-w-[180px]"
                          value={userNameDraft[u.id] ?? u.name}
                          onChange={(e) => setUserNameDraft((m) => ({ ...m, [u.id]: e.target.value }))}
                        />
                        <p className="mt-1 text-[10px] font-mono text-zinc-500">{u.id.slice(0, 12)}…</p>
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">{u.phone}</td>
                      <td className="py-3 pr-3">
                        <select
                          className="ui-input !py-2 w-44"
                          value={userRoleDraft[u.id] ?? u.role}
                          onChange={(e) =>
                            setUserRoleDraft((m) => ({ ...m, [u.id]: e.target.value as UserRoleValue }))
                          }
                          disabled={u.role === "ADMIN"}
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="STORE_OWNER">STORE_OWNER</option>
                          <option value="DELIVERY">DELIVERY</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 pr-3 text-zinc-600">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800"
                            onClick={() => void saveUser(u.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
                            disabled={u.role === "ADMIN"}
                            onClick={() => void deleteUser(u.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                        No users found for selected filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "riders" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold text-zinc-900">
              {t("adminAddRider")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{t("adminRiderOtp")}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="ui-label">{t("adminRiderName")}</label>
                <input
                  className="ui-input"
                  placeholder={t("adminRiderNamePh")}
                  value={newBoyName}
                  onChange={(e) => setNewBoyName(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">{t("adminPhone")}</label>
                <input
                  className="ui-input"
                  placeholder={t("adminMobilePh")}
                  value={newBoyPhone}
                  onChange={(e) => setNewBoyPhone(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => void createDelivery()}
                className="ui-btn-dark w-full !rounded-2xl !py-3.5"
              >
                {t("adminCreateRider")}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold text-zinc-900">
              {t("adminAssignTitle")}
            </h2>
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-600">
              {readyOrders.map((o) => (
                <li key={o.id} className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-zinc-100">
                  <span className="font-mono text-zinc-400">
                    {o.id.slice(0, 8)}
                  </span>
                  {" · "}
                  {o.store.name} · {o.user.phone}
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-3">
              <div>
                <label className="ui-label">{t("adminOrderId")}</label>
                <input
                  className="ui-input font-mono text-sm"
                  placeholder={t("adminPasteOrderId")}
                  value={assignOrderId}
                  onChange={(e) => setAssignOrderId(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">{t("adminSelectRider")}</label>
                <select
                  className="ui-input"
                  value={assignBoyId}
                  onChange={(e) => setAssignBoyId(e.target.value)}
                >
                  <option value="">{t("adminChooseRider")}</option>
                  {deliveryUsers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void assign()}
                className="ui-btn-primary w-full !rounded-2xl"
              >
                {t("adminAssignBtn")}
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === "finance" && stats && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/40 p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold text-zinc-900">
              {t("adminRevSnap")}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{t("adminRevDelivered")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-zinc-100">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {t("adminGross")}
                </p>
                <p className="font-display mt-1 text-2xl font-black text-zinc-900">
                  ₹{stats.revenue.gross}
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-zinc-100">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {t("adminCommission")} {stats.revenue.commissionPercent}%
                </p>
                <p className="font-display mt-1 text-2xl font-black text-rose-600">
                  ₹{stats.revenue.platformCommission}
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-zinc-100">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {t("adminYouKeepTitle")}
                </p>
                <p className="mt-1 text-sm text-zinc-600">{t("adminModelHint")}</p>
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                {t("adminCommissionPct")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{t("adminPlatformFee")}</p>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <div className="min-w-[120px] flex-1">
                  <label className="ui-label">{t("adminPercentInput")}</label>
                  <input
                    className="ui-input"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void saveCommission()}
                  className="ui-btn-dark !rounded-2xl !px-6 !py-3.5"
                >
                  {t("adminSave")}
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50/30 to-white p-6 shadow-xl">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                {t("adminNewPlan")}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="ui-label">{t("adminPlanName")}</label>
                  <input
                    className="ui-input"
                    placeholder={t("adminPlanPh")}
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ui-label">{t("adminPrice")}</label>
                  <input
                    className="ui-input"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ui-label">{t("adminDuration")}</label>
                  <input
                    className="ui-input"
                    value={planDays}
                    onChange={(e) => setPlanDays(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void addPlan()}
                className="ui-btn-rush mt-4 w-full sm:w-auto"
              >
                {t("adminAddPlan")}
              </button>
            </section>
          </div>

          <section className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 to-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                Store settlements (admin-controlled)
              </h2>
              <p className="text-xs font-semibold text-zinc-600">
                Flow: DRAFT → APPROVED → PAID
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="ui-label">Store</label>
                <select
                  className="ui-input"
                  value={settlementStoreId}
                  onChange={(e) => setSettlementStoreId(e.target.value)}
                >
                  <option value="">Select store</option>
                  {approvedStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ui-label">Period start</label>
                <input
                  type="date"
                  className="ui-input"
                  value={settlementPeriodStart}
                  onChange={(e) => setSettlementPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">Period end (exclusive)</label>
                <input
                  type="date"
                  className="ui-input"
                  value={settlementPeriodEnd}
                  onChange={(e) => setSettlementPeriodEnd(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">Refund adjustment (−)</label>
                <input
                  className="ui-input"
                  inputMode="decimal"
                  value={settlementRefundAdj}
                  onChange={(e) => setSettlementRefundAdj(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">Bonus (+)</label>
                <input
                  className="ui-input"
                  inputMode="decimal"
                  value={settlementBonusAdj}
                  onChange={(e) => setSettlementBonusAdj(e.target.value)}
                />
              </div>
              <div>
                <label className="ui-label">Manual (+/−)</label>
                <input
                  className="ui-input"
                  inputMode="decimal"
                  value={settlementManualAdj}
                  onChange={(e) => setSettlementManualAdj(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="ui-label">Notes (optional)</label>
                <input
                  className="ui-input"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="Reason, references, payout notes"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void generateSettlement()}
              className="ui-btn-primary mt-4 !rounded-2xl"
            >
              Generate draft settlement
            </button>

            <div className="mt-5 overflow-x-auto">
              <input
                ref={settlementProofInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onSettlementProofFileChange}
              />
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">Store / Period</th>
                    <th className="pb-3 pr-3">Orders</th>
                    <th className="pb-3 pr-3">Gross</th>
                    <th className="pb-3 pr-3">Platform</th>
                    <th className="pb-3 pr-3">Adjustments</th>
                    <th className="pb-3 pr-3">Net</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Payment details</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {settlements.map((s) => (
                    <tr key={s.id} className="bg-white">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-zinc-900">{s.storeName}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(s.periodStart).toLocaleDateString()} →{" "}
                          {new Date(s.periodEnd).toLocaleDateString()}
                        </p>
                        {s.referenceNo ? (
                          <p className="text-[11px] font-semibold text-emerald-700">
                            Ref: {s.referenceNo}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-zinc-800">{s.ordersCount}</td>
                      <td className="py-3 pr-3 font-semibold text-zinc-900">₹{s.grossAmount}</td>
                      <td className="py-3 pr-3 text-rose-700">
                        ₹{s.platformCommission}
                        {typeof s.blendedCommissionPct === "number" ? (
                          <p className="text-[11px] text-zinc-500">~{s.blendedCommissionPct}%</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-xs text-zinc-600">
                        <p>-₹{s.refundAdjustment}</p>
                        <p>+₹{s.bonusAdjustment}</p>
                        <p>{s.manualAdjustment >= 0 ? "+" : ""}₹{s.manualAdjustment}</p>
                      </td>
                      <td className="py-3 pr-3 font-black text-emerald-700">₹{s.netPayable}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            s.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.status === "APPROVED"
                                ? "bg-sky-100 text-sky-800"
                                : s.status === "FAILED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="space-y-1.5">
                          <select
                            className="ui-input !py-1.5 text-xs"
                            value={settlementPaymentModeDraft[s.id] ?? "ONLINE"}
                            onChange={(e) =>
                              setSettlementPaymentModeDraft((m) => ({
                                ...m,
                                [s.id]: e.target.value as "CASH" | "CHEQUE" | "ONLINE",
                              }))
                            }
                            disabled={s.status === "PAID"}
                          >
                            <option value="ONLINE">Online transfer</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="CASH">Cash</option>
                          </select>
                          <input
                            className="ui-input !py-1.5 text-xs"
                            placeholder="Reference / cheque no / UTR"
                            value={settlementReferenceDraft[s.id] ?? ""}
                            onChange={(e) =>
                              setSettlementReferenceDraft((m) => ({ ...m, [s.id]: e.target.value }))
                            }
                            disabled={s.status === "PAID"}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                              disabled={uploadingSettlementProofId === s.id || s.status === "PAID"}
                              onClick={() => {
                                settlementProofTargetIdRef.current = s.id;
                                settlementProofInputRef.current?.click();
                              }}
                            >
                              {uploadingSettlementProofId === s.id ? "Uploading…" : "Upload proof"}
                            </button>
                            {settlementProofDraft[s.id] ? (
                              <a
                                href={settlementProofDraft[s.id]}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-violet-700 underline"
                              >
                                View proof
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {s.status === "DRAFT" || s.status === "FAILED" ? (
                            <button
                              type="button"
                              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-800"
                              onClick={() => void updateSettlementStatus(s.id, "APPROVED")}
                            >
                              Approve
                            </button>
                          ) : null}
                          {s.status === "APPROVED" ? (
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700"
                              onClick={() => void updateSettlementStatus(s.id, "PAID")}
                            >
                              Mark paid
                            </button>
                          ) : null}
                          {s.status !== "PAID" && s.status !== "FAILED" ? (
                            <button
                              type="button"
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
                              onClick={() => void updateSettlementStatus(s.id, "FAILED")}
                            >
                              Fail
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-zinc-500">
                        No settlements yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                Store-wise commission override
              </h2>
              <p className="text-xs font-semibold text-zinc-500">
                Empty = platform default ({commission}%)
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">Store</th>
                    <th className="pb-3 pr-3">Owner</th>
                    <th className="pb-3 pr-3">Commission %</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {approvedStores.map((s) => (
                    <tr key={s.id} className="bg-white">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-zinc-900">{s.name}</p>
                        <p className="text-[11px] font-mono text-zinc-500">
                          {s.id.slice(0, 10)}…
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">
                        <p className="font-semibold text-zinc-900">{s.owner?.name ?? "—"}</p>
                        <p className="text-xs text-zinc-500">{s.owner?.phone ?? ""}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          className="ui-input !py-2 w-32"
                          inputMode="decimal"
                          placeholder={commission}
                          value={storeCommissionDraft[s.id] ?? ""}
                          onChange={(e) =>
                            setStoreCommissionDraft((m) => ({ ...m, [s.id]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800"
                          onClick={() => void saveStoreCommission(s.id)}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                  {approvedStores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                        No approved stores yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}

      {tab === "catalog" && (
        <section className="space-y-6">
          {catalogNotice ? (
            <div
              role="status"
              aria-live="polite"
              className={
                catalogNotice.tone === "success"
                  ? "sticky top-2 z-30 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-900/10"
                  : "sticky top-2 z-30 rounded-2xl border-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-950 shadow-lg shadow-rose-900/10"
              }
            >
              {catalogNotice.text}
            </div>
          ) : null}
          {catalogImgStorage ? (
            <div
              className={
                catalogImgStorage.cloudinary
                  ? "rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[11px] font-semibold text-emerald-950"
                  : "rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950"
              }
            >
              {catalogImgStorage.cloudinary ? (
                <>
                  <span className="font-black">Cloudinary ON</span> — file chunte hi{" "}
                  <code className="font-mono text-[10px]">POST /api/admin/upload-image</code> chalega,
                  URL Cloudinary se aayega; phir <code className="font-mono text-[10px]">POST …/master-catalog</code>{" "}
                  se naam + URL DB mein save.
                </>
              ) : (
                <>
                  <span className="font-black">Upload band hai</span> — ab sirf Cloudinary se
                  kaam chalega. <code className="font-mono text-[10px]">.env</code> / Railway par
                  bina space ke likhen:{" "}
                  <code className="rounded bg-white/80 px-1 font-mono text-[10px]">
                    CLOUDINARY_CLOUD_NAME
                  </code>
                  ,{" "}
                  <code className="rounded bg-white/80 px-1 font-mono text-[10px]">
                    CLOUDINARY_API_KEY
                  </code>
                  ,{" "}
                  <code className="rounded bg-white/80 px-1 font-mono text-[10px]">
                    CLOUDINARY_API_SECRET
                  </code>
                  — phir dev server / deploy dubara chalayein.
                </>
              )}
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-[1fr_1.35fr]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Add main category</p>
                <input
                  className="ui-input mt-3"
                  placeholder="key (e.g. grocery)"
                  value={newMainKey}
                  onChange={(e) => setNewMainKey(e.target.value)}
                />
                <input
                  className="ui-input mt-2"
                  placeholder="name (e.g. Grocery)"
                  value={newMainName}
                  onChange={(e) => setNewMainName(e.target.value)}
                />
                <button
                  type="button"
                  className="ui-btn-primary mt-3 w-full !rounded-xl !py-2.5 !text-xs"
                  onClick={() => void addMainCategory()}
                >
                  Add main category
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Add subcategory</p>
                <select
                  className="ui-input mt-3"
                  value={pickMainId}
                  onChange={(e) => {
                    setPickMainId(e.target.value);
                    const m = masterCatalog?.mains.find((x) => x.id === e.target.value);
                    setPickSubId(m?.subcategories[0]?.id ?? "");
                  }}
                >
                  <option value="">Select main category</option>
                  {masterCatalog?.mains.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <input
                  className="ui-input mt-2"
                  placeholder="Subcategory name"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
                <div className="mt-2 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  {newSubImage ? (
                    <>
                      <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-emerald-700">
                        <span>Image upload ho chuki hai</span>
                        <button
                          type="button"
                          className="text-xs font-bold text-zinc-600 underline"
                          onClick={() => {
                            setNewSubImage("");
                            setNewSubFile(null);
                          }}
                        >
                          Remove
                        </button>
                      </p>
                      <PendingCatalogImagePreview
                        imageUrl={newSubImage}
                        caption="Neeche preview — yahi subcategory ke sath tab save hogi jab aap Add subcategory dabayenge."
                      />
                    </>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-zinc-700 sm:w-auto"
                      onChange={(e) => {
                        const input = e.target;
                        const f = input.files?.[0] ?? null;
                        input.value = "";
                        setNewSubFile(f);
                        setNewSubImage("");
                        if (f) void performSubcategoryImageUpload(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void uploadSubcategoryImage()}
                      disabled={uploadingSubImage || !newSubFile}
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-60"
                      title="File chunte hi upload ho jata hai; yeh dubara retry ke liye"
                    >
                      {uploadingSubImage ? "Uploading…" : "Retry upload"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-btn-primary mt-3 w-full !rounded-xl !py-2.5 !text-xs"
                  onClick={() => void addSubcategory()}
                >
                  Add subcategory
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Add product</p>
              <select
                className="ui-input mt-3"
                value={pickSubId}
                onChange={(e) => setPickSubId(e.target.value)}
              >
                <option value="">Select subcategory</option>
                {selectedMain?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className="ui-input mt-2"
                placeholder="Product name"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
              />
              <input
                className="ui-input mt-2"
                placeholder="Unit (e.g. 1kg, 500ml, 1 pc)"
                value={newProdUnit}
                onChange={(e) => setNewProdUnit(e.target.value)}
              />
              <div className="mt-2 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                {newProdImage ? (
                  <>
                    <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-emerald-700">
                      <span>Image upload ho chuki hai</span>
                      <button
                        type="button"
                        className="text-xs font-bold text-zinc-600 underline"
                        onClick={() => {
                          setNewProdImage("");
                          setNewProdFile(null);
                        }}
                      >
                        Remove
                      </button>
                    </p>
                    <PendingCatalogImagePreview
                      imageUrl={newProdImage}
                      caption="Neeche preview — yahi product ke sath tab save hogi jab aap Add product dabayenge."
                    />
                  </>
                ) : null}
                {newProdImage2 ? (
                  <>
                    <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-emerald-700">
                      <span>Image #2 upload ho chuki hai</span>
                      <button
                        type="button"
                        className="text-xs font-bold text-zinc-600 underline"
                        onClick={() => {
                          setNewProdImage2("");
                          setNewProdFile2(null);
                        }}
                      >
                        Remove
                      </button>
                    </p>
                    <PendingCatalogImagePreview
                      imageUrl={newProdImage2}
                      caption="Optional image #2 — yahi product ke sath save hogi jab aap Add product dabayenge."
                    />
                  </>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-zinc-700 sm:w-auto"
                    onChange={(e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      input.value = "";
                      setNewProdFile(f);
                      setNewProdImage("");
                      if (f) void performProductImageUpload(f, 1);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void uploadProductImage()}
                    disabled={uploadingImage || !newProdFile}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-60"
                    title="File chunte hi upload ho jata hai"
                  >
                    {uploadingImage ? "Uploading…" : "Retry upload"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-zinc-700 sm:w-auto"
                    onChange={(e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      input.value = "";
                      setNewProdFile2(f);
                      setNewProdImage2("");
                      if (f) void performProductImageUpload(f, 2);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void uploadProductImage2()}
                    disabled={uploadingImage2 || !newProdFile2}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-60"
                    title="File chunte hi upload ho jata hai"
                  >
                    {uploadingImage2 ? "Uploading #2…" : "Retry upload #2"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="ui-btn-primary mt-3 w-full !rounded-xl !py-2.5 !text-xs"
                onClick={() => void addMasterProduct()}
              >
                Add product
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div
              ref={catalogMainListRef}
              className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xl scroll-mt-24"
            >
              <h2 className="font-display text-lg font-bold text-zinc-900">Main categories</h2>
              <div className="mt-3 max-h-72 overflow-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-400">
                      <th className="pb-3 pr-3">Name</th>
                      <th className="pb-3 pr-3">Key</th>
                      <th className="pb-3 pr-3">Subcategories</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterCatalog?.mains.map((m) => (
                      <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-3 pr-3 font-semibold text-zinc-900">{m.name}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-zinc-500">{m.key}</td>
                        <td className="py-3 pr-3 text-zinc-600">{m.subcategories.length}</td>
                        <td className="py-3 text-right">
                          <div className="flex w-full flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700"
                              onClick={() => {
                                setPickMainId(m.id);
                                setPickSubId(m.subcategories[0]?.id ?? "");
                              }}
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
                              onClick={() => void removeEntity("main", m.id)}
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

            <div
              ref={catalogSubListRef}
              className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xl scroll-mt-24"
            >
              <input
                ref={subPhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => void onSubcategoryPhotoFileChange(e)}
              />
              <h2 className="font-display text-lg font-bold text-zinc-900">Subcategories</h2>
              <div className="mt-3 max-h-72 overflow-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-400">
                      <th className="pb-3 pr-3">Name</th>
                      <th className="pb-3 pr-3">Image</th>
                      <th className="pb-3 pr-3">Products</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMain?.subcategories.map((s) => (
                      <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-3 pr-3 font-semibold text-zinc-900">{s.name}</td>
                        <td className="py-3 pr-3 text-zinc-600">
                          <MasterProductImageCell imageUrl={s.imageUrl} />
                        </td>
                        <td className="py-3 pr-3 text-zinc-600">{s.products.length}</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700"
                              onClick={() => setPickSubId(s.id)}
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              disabled={uploadingSubPhotoId === s.id}
                              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-50"
                              onClick={() => openSubcategoryPhotoPicker(s.id)}
                            >
                              {uploadingSubPhotoId === s.id ? "…" : "Set photo"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
                              onClick={() => void removeEntity("subcategory", s.id)}
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
          </div>

          <div
            ref={catalogProdListRef}
            className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xl scroll-mt-24"
          >
            <input
              ref={prodPhotoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => void onProductPhotoFileChange(e)}
            />
            <h2 className="font-display text-lg font-bold text-zinc-900">Products</h2>
            <div className="mt-3 max-h-72 overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-3">Name</th>
                    <th className="pb-3 pr-3">Unit</th>
                    <th className="pb-3 pr-3">Image</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSub?.products.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-3 font-semibold text-zinc-900">{p.name}</td>
                      <td className="py-3 pr-3 text-zinc-600">{p.unitLabel ?? "—"}</td>
                      <td className="py-3 pr-3 text-zinc-600">
                        <MasterProductImageCell imageUrl={p.imageUrl} />
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={uploadingProdPhotoId === p.id}
                            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-50"
                            onClick={() => openProductPhotoPicker(p.id)}
                          >
                            {uploadingProdPhotoId === p.id ? "…" : "Set photo"}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
                            onClick={() => void removeEntity("product", p.id)}
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
        </section>
      )}
    </DashboardShell>
  );
}

function adminOrderStatusStyle(s: string) {
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

function listRequestStatusStyle(s: string) {
  const m: Record<string, string> = {
    NEW: "bg-amber-100 text-amber-900",
    IN_REVIEW: "bg-sky-100 text-sky-900",
    CONFIRMED: "bg-violet-100 text-violet-900",
    OUT_FOR_DELIVERY: "bg-orange-100 text-orange-900",
    DELIVERED: "bg-emerald-100 text-emerald-900",
    REJECTED: "bg-rose-100 text-rose-900",
  };
  return m[s] ?? "bg-zinc-100 text-zinc-800";
}

function IconAdminDash() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

function IconAdminOrders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function IconAdminStore() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function IconAdminUsers() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 20h5V18a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.653-.126-1.276-.356-1.846M7 20H2V18a4 4 0 015-3.87m0 5v-2c0-.653.126-1.276.356-1.846m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function IconAdminRider() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconAdminFinance() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconAdminCatalog() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16M8 4v16" />
    </svg>
  );
}

function StatCard({
  emoji,
  label,
  value,
  tint,
}: {
  emoji: string;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-card">
      <div className={`bg-gradient-to-br ${tint} p-5 text-white`}>
        <span className="text-2xl">{emoji}</span>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider opacity-90">
          {label}
        </p>
        <p className="font-display mt-1 text-3xl font-black">{value}</p>
      </div>
    </div>
  );
}
