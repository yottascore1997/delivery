"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setSession } from "@/lib/client-api";
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

  const [mode, setMode] = useState<
    "login" | "register-store" | "register-customer"
  >("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fbConfirm, setFbConfirm] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (next === "/admin" || adminHint) {
      setMode("login");
      setStep(1);
    }
    if (customerHint) {
      // Customer logins should use Firebase OTP even from "Login" flow.
      setMode("login");
      setStep(1);
    }
  }, [next, adminHint, customerHint]);

  const isShopNext = Boolean(next && next.startsWith("/shop"));
  const useFirebaseForCustomer =
    mode === "register-customer" ||
    (mode === "login" && !adminHint && next !== "/admin" && (customerHint || isShopNext));

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
        setMsg("OTP भेज दिया गया।");
        setStep(2);
      } catch (e: any) {
        setMsg(e?.message || "Could not send OTP");
      } finally {
        setLoading(false);
      }
      return;
    }

    const path =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { phone }
        : {
            phone,
            name,
            role:
              mode === "register-store" ? "STORE_OWNER" : "CUSTOMER",
          };
    const res = await api(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      setMsg(res.error || "Failed");
      return;
    }
    setMsg("OTP भेज दिया गया। Dev में 123456 आज़माएँ।");
    setStep(2);
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
        const res = await api<{
          token: string;
          user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
        }>("/api/auth/firebase", {
          method: "POST",
          body: JSON.stringify({ idToken, name, role: "CUSTOMER" }),
        });
        if (!res.ok || !res.data) {
          setMsg(res.error || "Verification failed");
          return;
        }
        setSession(res.data.token, res.data.user);
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
                  Order karne ke liye <strong>New customer</strong> se register karein ya same number se{" "}
                  <strong>Login</strong> — role <strong>CUSTOMER</strong> hona chahiye.
                </p>
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-1 rounded-2xl bg-stone-100 p-1.5 sm:grid-cols-3">
              <button
                type="button"
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  mode === "login"
                    ? "bg-white text-ink shadow-sm"
                    : "text-stone-500 hover:text-ink"
                }`}
                onClick={() => {
                  setMode("login");
                  setStep(1);
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  mode === "register-store"
                    ? "bg-white text-ink shadow-sm"
                    : "text-stone-500 hover:text-ink"
                }`}
                onClick={() => {
                  setMode("register-store");
                  setStep(1);
                }}
              >
                Store partner
              </button>
              <button
                type="button"
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  mode === "register-customer"
                    ? "bg-white text-ink shadow-sm"
                    : "text-stone-500 hover:text-ink"
                }`}
                onClick={() => {
                  setMode("register-customer");
                  setStep(1);
                }}
              >
                New customer
              </button>
            </div>

            <div className="mt-8 rounded-3xl border border-stone-100 bg-white p-6 shadow-card-lg sm:p-8">
              {step === 1 && (
                <div className="space-y-5">
                  {(mode === "register-store" || mode === "register-customer") && (
                    <div>
                      <label className="ui-label">Full name</label>
                      <input
                        className="ui-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={
                          mode === "register-store"
                            ? "जैसे राम किराना"
                            : "Your name"
                        }
                      />
                    </div>
                  )}
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
