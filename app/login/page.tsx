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
import { useLocale } from "@/contexts/LocaleContext";

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
  const { locale, setLocale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = readNext(searchParams.get("next"));
  const adminHint = searchParams.get("admin") === "1";
  const customerHint = searchParams.get("customer") === "1";
  const isStorePartner = searchParams.get("partner") === "1";
  const [phone, setPhone] = useState("");
  /** Store partner flow (DB OTP via /api/auth/register) */
  const [storePartnerName, setStorePartnerName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fbConfirm, setFbConfirm] = useState<ConfirmationResult | null>(null);

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
    setStorePartnerName("");
  }, [next, adminHint, customerHint, isStorePartner]);

  useEffect(() => {
    setMsg(null);
  }, [locale]);

  /** After OTP: send everyone to the right panel by DB role (store / admin / delivery / customer). */
  async function routeAfterLogin(user: { role: string }) {
    const r = user.role;
    if (r === "ADMIN") {
      router.push("/admin");
      return;
    }
    if (r === "STORE_OWNER") {
      const mine = await api<{ stores: { status: string }[] }>("/api/stores/mine");
      const hasApproved =
        mine.ok && mine.data?.stores?.some((s) => s.status === "APPROVED");
      router.push(hasApproved ? "/store" : "/store/register");
      return;
    }
    if (r === "DELIVERY") {
      router.push("/delivery");
      return;
    }
    if (r === "CUSTOMER") {
      if (next && next.startsWith("/shop")) {
        const focusAddress = searchParams.get("focus") === "address";
        const dest =
          focusAddress && next === "/shop/cart" ? "/shop/cart#delivery-address" : next;
        router.push(dest);
        return;
      }
      router.push("/shop");
      return;
    }
    router.push("/");
  }

  async function sendOtp() {
    setLoading(true);
    setMsg(null);

    if (isStorePartner) {
      if (!storePartnerName.trim()) {
        setMsg(t("loginErrOwnerName"));
        setLoading(false);
        return;
      }
      const res = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone,
          name: storePartnerName.trim(),
          role: "STORE_OWNER",
        }),
      });
      setLoading(false);
      if (!res.ok) {
        setMsg(res.error || t("loginErrSendOtp"));
        return;
      }
      setMsg(t("loginMsgOtpPartner"));
      setStep(2);
      return;
    }

    try {
      const auth = getFirebaseAuth();
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
      setMsg(t("loginMsgOtpSent"));
      setStep(2);
    } catch (e: any) {
      setMsg(e?.message || t("loginErrCouldNotSend"));
    } finally {
      setLoading(false);
    }
  }

  async function saveOnboarding() {
    setSavingOnboard(true);
    setMsg(null);
    try {
      if (!onboardName.trim()) {
        setMsg(t("loginErrNameRequired"));
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
        setMsg(nameRes.error || t("loginErrCouldNotSaveName"));
        return;
      }
      if (nameRes.data?.user) updateSessionUser({ name: nameRes.data.user.name });

      // Address is optional at onboarding. If provided, try to save it.
      if (onboardAddr.trim()) {
        if (typeof onboardLat !== "number" || typeof onboardLng !== "number") {
          setMsg(t("loginErrAddrNeedLoc"));
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
          setMsg(addrRes.error || t("loginErrCouldNotSaveAddr"));
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
          setMsg(j?.error || t("loginErrCouldNotUpload"));
          return;
        }
        if (j?.user?.imageUrl) updateSessionUser({ imageUrl: j.user.imageUrl });
      }

      await routeAfterLogin({ role: "CUSTOMER" });
    } finally {
      setSavingOnboard(false);
    }
  }

  async function verify() {
    setLoading(true);
    setMsg(null);

    if (isStorePartner) {
      const res = await api<{
        token: string;
        user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
      }>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code: otp }),
      });
      setLoading(false);
      if (!res.ok || !res.data) {
        setMsg(res.error || t("loginErrVerifyFailed"));
        return;
      }
      if (res.data.user.role !== "STORE_OWNER") {
        setMsg(t("loginErrNotPartner"));
        return;
      }
      setSession(res.data.token, res.data.user);
      await routeAfterLogin(res.data.user);
      return;
    }

    try {
      if (!fbConfirm) {
        setMsg(t("loginErrSendOtpAgain"));
        return;
      }
      const cred = await fbConfirm.confirm(otp);
      const idToken = await cred.user.getIdToken();
      const res = await api<{
        token: string;
        needsProfile?: boolean;
        user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
      }>("/api/auth/firebase", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok || !res.data) {
        setMsg(res.error || t("loginErrVerifyFailed"));
        return;
      }
      setSession(res.data.token, res.data.user);
      if (res.data.needsProfile && res.data.user.role === "CUSTOMER") {
        setOnboardName(
          res.data.user.name && res.data.user.name !== "Customer" ? res.data.user.name : "",
        );
        setStep(3);
        setMsg(t("loginMsgCompleteProfile"));
        return;
      }
      await routeAfterLogin(res.data.user);
    } catch (e: any) {
      setMsg(e?.message || t("loginErrInvalidOtp"));
    } finally {
      setLoading(false);
    }
  }

  const showAdminPanelNote = next === "/admin" || adminHint;

  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh-hero bg-stone-50">
      <div className="pointer-events-none absolute -left-24 top-[-140px] h-[340px] w-[340px] rounded-full bg-orange-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[180px] h-[380px] w-[380px] rounded-full bg-violet-300/25 blur-3xl" />
      <div id="firebase-recaptcha" />
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-cta p-10 text-white lg:flex">
          <div className="hero-pattern absolute inset-0 opacity-30" />
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
            >
              {t("loginBackHome")}
            </Link>
            <h1 className="font-display mt-12 text-4xl font-extrabold leading-tight">
              {t("loginHeroLine1")}
              <br />
              {t("loginHeroLine2")}
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/85">{t("loginHeroDesc")}</p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                <div className="relative h-28 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&h=350&fit=crop&q=80"
                    alt={t("loginImgAltGrocery")}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="px-3 py-2 text-xs font-bold text-white/90">
                  {t("loginHeroCard1Caption")}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                <div className="relative h-28 w-full">
                  <Image
                    src="https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=350&fit=crop&q=80"
                    alt={t("loginImgAltRider")}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="px-3 py-2 text-xs font-bold text-white/90">
                  {t("loginHeroCard2Caption")}
                </p>
              </div>
            </div>
          </div>
            <div className="relative z-10 flex gap-4 pb-6">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-black">{t("loginStatValMin")}</p>
              <p className="text-xs text-white/75">{t("loginStatSubMin")}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-black">{t("loginStatValCod")}</p>
              <p className="text-xs text-white/75">{t("loginStatSubCod")}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-8 right-0 h-64 w-64 rounded-full bg-rush-400/40 blur-3xl" />
        </div>

        <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:mb-8">
            <Link
              href="/"
              className="text-sm font-semibold text-fresh-600 hover:text-fresh-700"
            >
              {t("loginHomeMobile")}
            </Link>
            <div
              className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm"
              role="group"
              aria-label={t("language")}
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  locale === "en"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t("langEnglish")}
              </button>
              <button
                type="button"
                onClick={() => setLocale("hi")}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  locale === "hi"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t("langHindi")}
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-5 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_55px_-30px_rgba(15,23,42,0.5)] lg:hidden">
              <div className="relative h-36 w-full">
                <Image
                  src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=900&h=450&fit=crop&q=80"
                  alt={t("loginImgAltHeroMobile")}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/90">
                  {t("loginMobileHeroBrand")}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  {isStorePartner ? t("loginSubHeroPartner") : t("loginSubHeroCustomer")}
                </p>
              </div>
            </div>
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-cta text-sm font-black text-white shadow-[0_14px_40px_-18px_rgba(234,88,12,0.75)] ring-1 ring-white/50">
                D
              </span>
              <div>
                <h2 className="font-display text-[28px] font-black leading-tight tracking-tight text-[#111827]">
                  {isStorePartner ? t("loginTitlePartner") : t("loginTitleCustomer")}
                </h2>
                <p className="text-sm font-semibold text-zinc-500">
                  {isStorePartner ? t("loginSubPartner") : t("loginSubCustomer")}
                </p>
              </div>
            </div>

            {showAdminPanelNote && !isStorePartner && (
              <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
                <p className="font-bold text-violet-900">{t("loginAdminNoteTitle")}</p>
                <p className="mt-2 leading-relaxed text-violet-800">{t("loginAdminNoteBody")}</p>
              </div>
            )}

            {next?.startsWith("/shop") && !isStorePartner && (
              <div className="mt-6 rounded-2xl border border-fresh-200 bg-fresh-50/90 px-4 py-3 text-sm text-fresh-950">
                <p className="font-bold">{t("loginWebShopTitle")}</p>
                <p className="mt-1 text-fresh-900">{t("loginWebShopBody")}</p>
              </div>
            )}

            {isStorePartner && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <p className="font-bold">{t("loginPartnerBannerTitle")}</p>
                <p className="mt-1 text-amber-900">{t("loginPartnerBannerBody")}</p>
              </div>
            )}

            <div className="mt-7 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.55)] backdrop-blur sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                    step === 1 ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  1
                </span>
                <div className={`h-[3px] flex-1 rounded-full ${step >= 2 ? "bg-orange-500" : "bg-zinc-200"}`} />
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                    step >= 2 ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  2
                </span>
                {!isStorePartner ? (
                  <>
                    <div className={`h-[3px] flex-1 rounded-full ${step >= 3 ? "bg-orange-500" : "bg-zinc-200"}`} />
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                        step === 3 ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      3
                    </span>
                  </>
                ) : null}
              </div>
              {step === 1 && (
                <div className="space-y-5">
                  {isStorePartner && (
                    <div>
                      <label className="ui-label">{t("loginOwnerLabel")}</label>
                      <input
                        className="ui-input !rounded-2xl !py-3.5 !text-[15px] !font-semibold"
                        value={storePartnerName}
                        onChange={(e) => setStorePartnerName(e.target.value)}
                        placeholder={t("loginOwnerPh")}
                      />
                    </div>
                  )}
                  <div>
                    <label className="ui-label">{t("loginMobileLabel")}</label>
                    <input
                      className="ui-input !rounded-2xl !py-3.5 !text-[15px] !font-semibold"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("loginMobilePh")}
                      inputMode="tel"
                    />
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {isStorePartner ? t("loginMobileHintPartner") : t("loginMobileHintCustomer")}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={sendOtp}
                    className="ui-btn-rush w-full !rounded-2xl !py-4 text-[15px]"
                  >
                    {loading ? t("loginSending") : t("loginSendOtp")}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="ui-label">{t("loginOtpLabel")}</label>
                    <input
                      className="ui-input !rounded-2xl !py-4 text-center font-display text-2xl tracking-[0.45em]"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="••••••"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {t("loginOtpTo")}{" "}
                      <span className="font-black text-zinc-800">
                        {phone || t("loginOtpYourNumber")}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={verify}
                    className="ui-btn-rush w-full !rounded-2xl !py-4 text-[15px]"
                  >
                    {loading ? t("loginVerifying") : t("loginVerify")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-center text-sm font-semibold text-stone-500 hover:text-ink"
                    onClick={() => setStep(1)}
                  >
                    {t("loginChangePhone")}
                  </button>
                </div>
              )}

              {step === 3 && !isStorePartner && (
                <div className="space-y-5">
                  <div>
                    <label className="ui-label">{t("loginFullName")}</label>
                    <input
                      className="ui-input !rounded-2xl !py-3.5 !text-[15px] !font-semibold"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      placeholder={t("loginNamePh")}
                    />
                    <p className="mt-2 text-xs font-semibold text-zinc-500">{t("loginNameHint")}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="ui-label">{t("loginAddrLabel")}</label>
                    <textarea
                      className="ui-input min-h-[72px] !py-3"
                      value={onboardAddr}
                      onChange={(e) => setOnboardAddr(e.target.value)}
                      placeholder={t("loginAddrPh")}
                    />
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={savingOnboard}
                      onClick={() => {
                        if (!navigator.geolocation) {
                          setMsg(t("loginErrGeoUnsupported"));
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setOnboardLat(pos.coords.latitude);
                            setOnboardLng(pos.coords.longitude);
                            setMsg(t("loginMsgLocCaptured"));
                          },
                          () => setMsg(t("loginErrLocDenied")),
                          { enableHighAccuracy: true, timeout: 12000 },
                        );
                      }}
                    >
                      {t("loginCaptureLoc")}
                    </button>
                    {typeof onboardLat === "number" && typeof onboardLng === "number" ? (
                      <p className="text-xs font-semibold text-zinc-500">
                        Lat {Math.round(onboardLat * 10000) / 10000}, Lng {Math.round(onboardLng * 10000) / 10000}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="ui-label">{t("loginPhotoOpt")}</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="ui-input !rounded-2xl !py-3"
                      onChange={(e) => setOnboardFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingOnboard}
                    onClick={saveOnboarding}
                    className="ui-btn-rush w-full !rounded-2xl !py-4 text-[15px]"
                  >
                    {savingOnboard ? t("loginSaving") : t("loginContinue")}
                  </button>
                </div>
              )}
            </div>

            {msg && (
              <div className="mt-5 rounded-2xl border border-fresh-200 bg-fresh-50 px-4 py-3 text-sm text-fresh-900">
                {msg}
              </div>
            )}

            {!isStorePartner ? (
              <p className="mt-8 text-center text-sm font-semibold text-zinc-600">
                {t("loginPartnerLead")}{" "}
                <Link
                  href="/login?partner=1"
                  className="font-black text-orange-600 underline decoration-orange-200 underline-offset-2 hover:text-orange-700"
                >
                  {t("loginPartnerLink")}
                </Link>
              </p>
            ) : (
              <p className="mt-8 text-center text-sm font-semibold text-zinc-600">
                {t("loginCustomerLead")}{" "}
                <Link
                  href="/login"
                  className="font-black text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950"
                >
                  {t("loginCustomerLink")}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginSuspenseFallback() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-500">
      {t("loginLoading")}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <LoginForm />
    </Suspense>
  );
}
