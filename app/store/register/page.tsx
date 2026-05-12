"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { api, clearSession, getToken, getUser } from "@/lib/client-api";
import { uploadStoreCatalogImage } from "@/lib/store-image-upload-client";

type MineStore = {
  id: string;
  name: string;
  status: string;
};

const VERTICALS = [
  { value: "food", label: "Food & restaurant" },
  { value: "grocery", label: "Grocery" },
  { value: "fruits-vegetables", label: "Fruits & vegetables" },
  { value: "electronics", label: "Electronics" },
  { value: "fashion", label: "Fashion store" },
  { value: "footwear", label: "Footwear" },
] as const;

export default function StoreOwnerRegisterGatePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [stores, setStores] = useState<MineStore[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("28.4595");
  const [lng, setLng] = useState("77.0266");
  const [vertical, setVertical] = useState<string>("food");
  const [submitting, setSubmitting] = useState(false);
  const [photo1Url, setPhoto1Url] = useState<string | null>(null);
  const [photo2Url, setPhoto2Url] = useState<string | null>(null);
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ stores: MineStore[] }>("/api/stores/mine");
    setLoaded(true);
    if (!res.ok || !res.data) {
      setMsg(res.error || "Could not load your account");
      return;
    }
    const list = res.data.stores;
    setStores(list);
    if (list.some((s) => s.status === "APPROVED")) {
      router.replace("/store");
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/store/register");
      return;
    }
    if (getUser()?.role !== "STORE_OWNER") {
      router.replace("/");
      return;
    }
    void load();
  }, [router, load]);

  const pending = stores.filter((s) => s.status === "PENDING");
  const rejected = stores.filter((s) => s.status === "REJECTED");
  const showForm = pending.length === 0;

  async function onPickPhoto(
    slot: 1 | 2,
    e: ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (slot === 1) {
      setUploading1(true);
    } else {
      setUploading2(true);
    }
    setMsg(null);
    const up = await uploadStoreCatalogImage(file);
    if (slot === 1) {
      setUploading1(false);
      if (up.ok) setPhoto1Url(up.imageUrl);
      else setMsg(up.error);
    } else {
      setUploading2(false);
      if (up.ok) setPhoto2Url(up.imageUrl);
      else setMsg(up.error);
    }
  }

  async function submitOutlet() {
    if (!name.trim() || !address.trim()) {
      setMsg("Name and address are required");
      return;
    }
    if (!photo1Url?.trim() || !photo2Url?.trim()) {
      setMsg("Please upload both store photos (required).");
      return;
    }
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setMsg("Enter valid latitude and longitude");
      return;
    }
    setSubmitting(true);
    setMsg(null);
    const res = await api("/api/stores/create", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        latitude: la,
        longitude: ln,
        shopVertical: vertical,
        imageUrl: photo1Url.trim(),
        imageUrl2: photo2Url.trim(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setMsg(res.error || "Could not submit");
      return;
    }
    setName("");
    setAddress("");
    setPhoto1Url(null);
    setPhoto2Url(null);
    await load();
  }

  function captureLocation() {
    setMsg(null);
    if (!navigator.geolocation) {
      setMsg("Geolocation not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLat(String(Math.round(pos.coords.latitude * 1e6) / 1e6));
        setLng(String(Math.round(pos.coords.longitude * 1e6) / 1e6));
        setMsg("Location captured ✓");
      },
      () => {
        setLocating(false);
        setMsg("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-xl font-black text-zinc-900 sm:text-2xl">
            Store partner
          </h1>
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs font-bold text-zinc-500 underline decoration-zinc-300 hover:text-zinc-800"
          >
            Log out
          </button>
        </div>

        {msg ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {msg}
          </div>
        ) : null}

        {pending.length > 0 ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-lg">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-800">
              Application received
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              Your full store panel will be available only after an administrator approves your application.
              Until then, you cannot use the menu or orders.
            </p>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-zinc-800">
              {pending.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
                  <span>{s.name}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">
                    Pending
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-5 w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
            >
              Refresh status
            </button>
          </div>
        ) : null}

        {rejected.length > 0 && pending.length === 0 ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
            Pehle ki application approve nahi hui. Neeche naya outlet dubara submit kar sakte ho.
          </div>
        ) : null}

        {showForm ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg">
            <h2 className="font-display text-lg font-bold text-zinc-900">Outlet details</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Submit karte hi status <strong className="text-zinc-700">Pending</strong> rahega jab tak admin approve na kare.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Store type
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900"
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                >
                  {VERTICALS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Outlet name
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="e.g. Sharma Meals"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Full address
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="Street, area, city"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-700">
                  Store photos (required) — 2 images
                </p>
                <p className="mb-3 text-xs text-zinc-500">
                  JPEG / PNG / Webp, max 5MB each. Cloudinary par upload hoga.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <label className="text-xs font-bold text-zinc-700">
                      Photo 1 (e.g. storefront)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading1}
                      className="mt-2 block w-full text-xs"
                      onChange={(e) => void onPickPhoto(1, e)}
                    />
                    {uploading1 ? (
                      <p className="mt-2 text-xs text-zinc-500">Uploading…</p>
                    ) : null}
                    {photo1Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo1Url}
                        alt=""
                        className="mt-2 h-24 w-full rounded-lg object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <label className="text-xs font-bold text-zinc-700">
                      Photo 2 (e.g. inside / menu board)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading2}
                      className="mt-2 block w-full text-xs"
                      onChange={(e) => void onPickPhoto(2, e)}
                    />
                    {uploading2 ? (
                      <p className="mt-2 text-xs text-zinc-500">Uploading…</p>
                    ) : null}
                    {photo2Url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo2Url}
                        alt=""
                        className="mt-2 h-24 w-full rounded-lg object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <button
                    type="button"
                    disabled={locating}
                    onClick={() => captureLocation()}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-black text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {locating ? "Capturing location…" : "Capture location (auto latitude/longitude)"}
                  </button>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">
                    Browser GPS se latitude/longitude auto fill ho jayega.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Latitude
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Longitude
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitOutlet()}
                className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-black text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit for approval"}
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-zinc-400">
          Customer shopping ke liye{" "}
          <Link href="/shop" className="font-bold text-violet-600 hover:underline">
            shop
          </Link>{" "}
          kholo.
        </p>
      </div>
    </div>
  );
}
