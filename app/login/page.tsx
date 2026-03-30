"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setSession, updateSessionUser } from "@/lib/client-api";
import { getFirebaseAuth } from "@/lib/firebase-client";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

const ALLOWED_NEXT = [
  "/admin",
  "/store",
  "/store/register",
  "/delivery",
  "/shop",
  "/shop/cart",
  "/shop/orders",
  "/shop/profile",
  "/shop/help",
] as const;

function readNext(raw: string | null): (typeof ALLOWED_NEXT)[number] | null {
  if (!raw) return null;
  return ALLOWED_NEXT.includes(raw as (typeof ALLOWED_NEXT)[number])
    ? (raw as (typeof ALLOWED_NEXT)[number])
    : null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = readNext(searchParams.get("next"));
  const adminHint = searchParams.get("admin") === "1";
  const customerHint = searchParams.get("customer") === "1";
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fbConfirm, setFbConfirm] = useState<ConfirmationResult | null>(null);
  const [fbIdToken, setFbIdToken] = useState<string | null>(null);

  // Onboarding (only for new customers)
  const [onboardName, setOnboardName] = useState("");
  const [onboardAddr, setOnboardAddr] = useState("");
  const [onboardLat, setOnboardLat] = useState<number | null>(null);
  const [onboardLng, setOnboardLng] = useState<number | null>(null);
  const [onboardFile, setOnboardFile] = useState<File | null>(null);
  const [savingOnboard, setSavingOnboard] = useState(false);

  useEffect(() => {
    setStep(1);
    setMsg(null);
    setOtp("");
    setFbConfirm(null);
    setFbIdToken(null);
  }, [next, adminHint, customerHint]);

  const isAdminFlow = next === "/admin" || adminHint;
  const useFirebaseForCustomer = !isAdminFlow;

  async function sendOtp() {
    setLoading(true);
    setMsg(null);

    if (useFirebaseForCustomer) {
      try {
        const auth = getFirebaseAuth();
        // Firebase requires E.164 (+91...) phone number.
        const digits = phone.replace(/\D/g, "");
        const e164 = digits.startsWith("91") ? `+${digits}` : `+91${digits}`;

        const verifier =
          (window as any).dlfRecaptchaVerifier ??
          new RecaptchaVerifier(auth, "firebase-recaptcha", {
            size: "invisible",
          });
        (window as any).dlfRecaptchaVerifier = verifier;

        const confirm = await signInWithPhoneNumber(auth, e164, verifier);
        setFbConfirm(confirm);
        setMsg("OTP sent.");
        setStep(2);
      } catch (e: any) {
        setMsg(e?.message || "Could not send OTP");
      } finally {
        setLoading(false);
      }
      return;
    }

    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      setMsg(res.error || "Failed");
      return;
    }
    setMsg("OTP sent. In dev, try 123456.");
    setStep(2);
  }

  async function saveOnboarding() {
    setSavingOnboard(true);
    setMsg(null);
    try {
      if (!onboardName.trim()) {
        setMsg("Name is required.");
        return;
      }

      const nameRes = await api<{ user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null } }>(
        "/api/user/profile",
        {
          method: "PATCH",
          body: JSON.stringify({ name: onboardName.trim() }),
        },
      );
      if (!nameRes.ok) {
        setMsg(nameRes.error || "Could not save name");
        return;
      }
      if (nameRes.data?.user) updateSessionUser({ name: nameRes.data.user.name });

      // Address is optional at onboarding. If provided, try to save it.
      if (onboardAddr.trim()) {
        if (typeof onboardLat !== "number" || typeof onboardLng !== "number") {
          setMsg("To save address, please capture location first.");
          return;
        }
        const addrRes = await api<{ address: any }>("/api/user/address", {
          method: "POST",
          body: JSON.stringify({
            label: "Home",
            address: onboardAddr.trim(),
            latitude: onboardLat,
            longitude: onboardLng,
          }),
        });
        if (!addrRes.ok) {
          setMsg(addrRes.error || "Could not save address");
          return;
        }
      }

      if (onboardFile) {
        const fd = new FormData();
        fd.set("file", onboardFile);
        const up = await fetch("/api/user/avatar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("dlf_token") ?? ""}`,
          },
          body: fd,
        });
        const j = (await up.json().catch(() => null)) as any;
        if (!up.ok) {
          setMsg(j?.error || "Could not upload photo");
          return;
        }
        if (j?.user?.imageUrl) updateSessionUser({ imageUrl: j.user.imageUrl });
      }

      router.push(next && next.startsWith("/shop") ? next : "/shop");
    } finally {
      setSavingOnboard(false);
    }
  }

  async function verify() {
    setLoading(true);
    setMsg(null);

    if (useFirebaseForCustomer) {
      try {
        if (!fbConfirm) {
          setMsg("Please send OTP again.");
          setLoading(false);
          return;
        }
        const cred = await fbConfirm.confirm(otp);
        const idToken = await cred.user.getIdToken();
        setFbIdToken(idToken);
        const res = await api<{
          token: string;
          needsProfile?: boolean;
          user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
        }>("/api/auth/firebase", {
          method: "POST",
          body: JSON.stringify({ idToken, role: "CUSTOMER" }),
        });
        if (!res.ok || !res.data) {
          setMsg(res.error || "Verification failed");
          return;
        }
        setSession(res.data.token, res.data.user);
        if (res.data.needsProfile) {
          setOnboardName(res.data.user.name && res.data.user.name !== "Customer" ? res.data.user.name : "");
          setStep(3);
          setMsg("Complete your profile to continue.");
          return;
        }
        router.push(next && next.startsWith("/shop") ? next : "/shop");
      } catch (e: any) {
        setMsg(e?.message || "Invalid OTP");
      } finally {
        setLoading(false);
      }
      return;
    }

    const res = await api<{
      token: string;
      user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
    }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, code: otp }),
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      setMsg(res.error || "Verification failed");
      return;
    }
    setSession(res.data.token, res.data.user);
    const r = res.data.user.role;

    if (next === "/admin") {
      if (r !== "ADMIN") {
        setMsg(
          "यह मोबाइल admin अकाउंट नहीं है। Admin के लिए पहले DB में admin user होना चाहिए: टर्मिनल में `npx prisma db seed` चलाएँ, फिर Login टैब से फोन 9999999999 + OTP 123456 (dev) इस्तेमाल करें।",
        );
        return;
      }
      router.push("/admin");
      return;
    }

    if (next && next.startsWith("/shop")) {
      if (r !== "CUSTOMER") {
        setMsg(
          "Web shop के लिए customer अकाउंट चाहिए। “New customer” टैब से रजिस्टर करें, फिर OTP से लॉगिन करें।",
        );
        return;
      }
      const focusAddress = searchParams.get("focus") === "address";
      const dest =
        focusAddress && next === "/shop/cart" ? "/shop/cart#delivery-address" : next;
      router.push(dest);
      return;
    }

    if (r === "ADMIN") router.push("/admin");
    else if (r === "STORE_OWNER") {
      const mine = await api<{ stores: { status: string }[] }>("/api/stores/mine");
      const hasApproved =
        mine.ok && mine.data?.stores?.some((s) => s.status === "APPROVED");
      router.push(hasApproved ? "/store" : "/store/register");
    } else if (r === "DELIVERY") router.push("/delivery");
    else if (r === "CUSTOMER") router.push("/shop");
    else router.push("/");
  }

  const showAdminPanelNote = next === "/admin" || adminHint;

  return (
    <div className="min-h-screen bg-mesh-hero bg-stone-50">
      <div id="firebase-recaptcha" />
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-cta p-10 text-white lg:flex">
          <div className="hero-pattern absolute inset-0 opacity-30" />
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
            >
              ← Back home
            </Link>
            <h1 className="font-display mt-12 text-4xl font-extrabold leading-tight">
              Swiggy जैसा smooth,
              <br />
              Blinkit जैसा fast.
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/85">
              Store, admin और rider — एक ही OTP login. Modern panels, real orders.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                <div className="relative h-28 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&h=350&fit=crop&q=80"
                    alt="Delivery groceries"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="px-3 py-2 text-xs font-bold text-white/90">
                  Live grocery dispatch
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                <div className="relative h-28 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=350&fit=crop&q=80"
                    alt="Delivery rider"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="px-3 py-2 text-xs font-bold text-white/90">
                  Rider-first operations
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 flex gap-4 pb-6">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-black">10 min</p>
              <p className="text-xs text-white/75">avg. dispatch goal</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-black">COD</p>
              <p className="text-xs text-white/75">default payment</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-8 right-0 h-64 w-64 rounded-full bg-rush-400/40 blur-3xl" />
        </div>

        <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-14">
          <Link
            href="/"
            className="mb-8 text-sm font-semibold text-fresh-600 hover:text-fresh-700 lg:hidden"
          >
            ← Home
          </Link>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-5 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm lg:hidden">
              <div className="relative h-32 w-full">
                <Image
                  src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=900&h=450&fit=crop&q=80"
                  alt="Online delivery experience"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                  Online Delivery App
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-700">
                  Fast login · secure OTP · instant ordering
                </p>
              </div>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-cta text-sm font-black text-white shadow-lg">
                D
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">
                  Welcome back
                </h2>
                <p className="text-sm text-stone-500">
                  OTP से login — safe &amp; quick
                </p>
              </div>
            </div>

            {showAdminPanelNote && (
              <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
                <p className="font-bold text-violet-900">Admin panel</p>
                <p className="mt-2 leading-relaxed text-violet-800">
                  <strong>Store partner</strong> number se admin खुलेगा नहीं। Admin
                  user अलग होता है। पहली बार: प्रोजेक्ट फोल्डर में{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-violet-200">
                    npx prisma db seed
                  </code>{" "}
                  चलाएँ, फिर नीचे <strong>Login</strong> टैब चुनकर फोन{" "}
                  <strong>9999999999</strong> से OTP लें — dev में OTP अक्सर{" "}
                  <strong>123456</strong> होता है।
                </p>
              </div>
            )}

            {next?.startsWith("/shop") && (
              <div className="mt-6 rounded-2xl border border-fresh-200 bg-fresh-50/90 px-4 py-3 text-sm text-fresh-950">
                <p className="font-bold">Web shop</p>
                <p className="mt-1 text-fresh-900">
                  Customer login now uses Firebase OTP. If you’re new, we’ll ask for name + address after OTP.
                </p>
              </div>
            )}

            <div className="mt-8 rounded-3xl border border-stone-100 bg-white p-6 shadow-card-lg sm:p-8">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="ui-label">Mobile number</label>
                    <input
                      className="ui-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      inputMode="tel"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={sendOtp}
                    className="ui-btn-rush w-full !py-4"
                  >
                    {loading ? "भेज रहे हैं…" : "Send OTP"}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="ui-label">Enter OTP</label>
                    <input
                      className="ui-input text-center font-display text-2xl tracking-[0.4em]"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="••••••"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={verify}
                    className="ui-btn-rush w-full !py-4"
                  >
                    {loading ? "Verifying…" : "Verify & continue"}
                  </button>
                  <button
                    type="button"
                    className="w-full text-center text-sm font-semibold text-stone-500 hover:text-ink"
                    onClick={() => setStep(1)}
                  >
                    Change phone number
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="ui-label">Full name (required)</label>
                    <input
                      className="ui-input"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="ui-label">Delivery address (optional)</label>
                    <textarea
                      className="ui-input min-h-[72px] !py-3"
                      value={onboardAddr}
                      onChange={(e) => setOnboardAddr(e.target.value)}
                      placeholder="Flat / house no, street, landmark, city"
                    />
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={savingOnboard}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          setMsg("Geolocation not supported in this browser.");
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setOnboardLat(pos.coords.latitude);
                            setOnboardLng(pos.coords.longitude);
                            setMsg("Location captured.");
                          },
                          () => setMsg("Location permission denied."),
                          { enableHighAccuracy: true, timeout: 12000 },
                        );
                      }}
                    >
                      Capture location (only needed if saving address)
                    </button>
                    {typeof onboardLat === "number" && typeof onboardLng === "number" ? (
                      <p className="text-xs font-semibold text-zinc-500">
                        Lat {Math.round(onboardLat * 10000) / 10000}, Lng {Math.round(onboardLng * 10000) / 10000}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="ui-label">Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="ui-input !py-3"
                      onChange={(e) => setOnboardFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingOnboard}
                    onClick={saveOnboarding}
                    className="ui-btn-rush w-full !py-4"
                  >
                    {savingOnboard ? "Saving…" : "Continue"}
                  </button>
                </div>
              )}
            </div>

            {msg && (
              <div className="mt-5 rounded-2xl border border-fresh-200 bg-fresh-50 px-4 py-3 text-sm text-fresh-900">
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
