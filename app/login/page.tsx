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
import { MobileLoginHeroSlider } from "@/components/login/MobileLoginHeroSlider";
import { getAppLogoUrl, getAppMarkInitial, getAppName } from "@/lib/app-brand";

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

function normalizeLoginPhone10(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

// Temporary Play review login: keep this on while Firebase/SMS OTP is blocking review.
// Set to false to restore the real Firebase phone OTP path below.
const DEMO_WEB_OTP_LOGIN = true;
const DEMO_WEB_OTP_CODE = "123456";

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
  /** Store partner flow: same Firebase phone auth, then /api/auth/firebase with registerAsStorePartner */
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
  /** Same asset as Speedza app: `public/images/loginbg.jpeg` */
  const [loginHeroImgFailed, setLoginHeroImgFailed] = useState(false);

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

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

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

    if (isStorePartner && !storePartnerName.trim()) {
      setMsg(t("loginErrOwnerName"));
      setLoading(false);
      return;
    }

    try {
      const phone10 = normalizeLoginPhone10(phone);
      if (phone10.length < 10) {
        setMsg(t("loginErrCouldNotSend"));
        setLoading(false);
        return;
      }

      if (DEMO_WEB_OTP_LOGIN) {
        setFbConfirm(null);
        setOtp("");
        setMsg(`Demo OTP enabled. Use ${DEMO_WEB_OTP_CODE}.`);
        setStep(2);
        return;
      }

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

    try {
      let res: {
        ok: boolean;
        data?: {
          token: string;
          needsProfile?: boolean;
          user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
        };
        error?: string;
      };

      if (DEMO_WEB_OTP_LOGIN) {
        const demoRes = await api<{
          token: string;
          needsProfile?: boolean;
          user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
        }>("/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify(
            isStorePartner
              ? {
                  phone,
                  code: otp,
                  name: storePartnerName.trim(),
                  registerAsStorePartner: true,
                }
              : { phone, code: otp },
          ),
        });
        res = demoRes;
      } else {
        if (!fbConfirm) {
          setMsg(t("loginErrSendOtpAgain"));
          return;
        }
        const cred = await fbConfirm.confirm(otp);
        const idToken = await cred.user.getIdToken();
        const fbRes = await api<{
          token: string;
          needsProfile?: boolean;
          user: { id: string; name: string; phone: string; role: string; imageUrl?: string | null };
        }>("/api/auth/firebase", {
          method: "POST",
          body: JSON.stringify(
            isStorePartner
              ? {
                  idToken,
                  name: storePartnerName.trim(),
                  registerAsStorePartner: true,
                }
              : { idToken },
          ),
        });
        res = fbRes;
      }

      if (!res.ok || !res.data) {
        setMsg(res.error || t("loginErrVerifyFailed"));
        return;
      }
      if (isStorePartner && res.data.user.role !== "STORE_OWNER") {
        setMsg(t("loginErrNotPartner"));
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

  const customerToggleHref = (() => {
    const p = new URLSearchParams();
    p.set("customer", "1");
    if (next) p.set("next", next);
    return `/login?${p.toString()}`;
  })();
  const partnerToggleHref = (() => {
    const p = new URLSearchParams();
    p.set("partner", "1");
    if (next) p.set("next", next);
    return `/login?${p.toString()}`;
  })();

  const appName = getAppName();
  const logoUrl = getAppLogoUrl();
  const mark = getAppMarkInitial();

  const deskFieldClass =
    "flex min-h-[52px] items-stretch overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20";

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-mesh-hero bg-stone-50 lg:bg-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-[-140px] hidden h-[340px] w-[340px] rounded-full bg-orange-300/35 blur-3xl max-lg:block lg:hidden" />
      <div className="pointer-events-none absolute -right-24 top-[180px] hidden h-[380px] w-[380px] rounded-full bg-violet-300/25 blur-3xl max-lg:block lg:hidden" />
      <div id="firebase-recaptcha" />
      <div className="mx-auto grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)] lg:grid-cols-2 lg:max-w-none">
        {/* Desktop: grocery-style green hero (mobile keeps its own hero below) */}
        <div className="relative hidden min-h-0 flex-col overflow-hidden bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 text-white lg:flex lg:h-full">
          <div className="pointer-events-none absolute left-1/2 top-[40%] h-[min(92vw,460px)] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300/20" />
          <div className="pointer-events-none absolute -right-16 top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-teal-900/30 blur-3xl" />

          <div className="relative z-10 px-10 pb-4 pt-10">
            <Link href="/" className="inline-flex items-center gap-3 rounded-xl text-white transition hover:opacity-90">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/60">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={appName}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-lg font-black text-emerald-600">{mark}</span>
                )}
              </span>
              <span className="font-display text-xl font-black tracking-tight drop-shadow-sm">{appName}</span>
            </Link>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-10">
            <div className="w-full max-w-[400px] drop-shadow-[0_24px_48px_rgba(0,0,0,0.2)]">
              <MobileLoginHeroSlider />
            </div>
            <p className="mt-10 max-w-md text-center text-[15px] font-semibold leading-relaxed text-white/95">
              {t("loginHeroDesc")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold ring-1 ring-white/25 backdrop-blur-sm">
                {t("loginStatValCod")} · {t("loginStatSubCod")}
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold ring-1 ring-white/25 backdrop-blur-sm">
                {t("loginStatValMin")} {t("loginStatSubMin")}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-transparent px-4 py-10 sm:px-8 max-lg:h-full max-lg:justify-stretch max-lg:p-0 max-lg:py-0 lg:h-full lg:bg-zinc-100 lg:px-8 lg:py-6 xl:px-12">
          {/* Desktop: language only — back link is inside the login card */}
          <div className="mx-auto mb-3 hidden w-full max-w-[480px] shrink-0 justify-end lg:flex xl:max-w-[520px]">
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

          {/* Mobile: Speedza app — `loginbg` hero + #fff7ed panel + card (matches `speedza/app/login.tsx`) */}
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#fff7ed] lg:hidden">
            <div className="relative min-h-0 flex-1">
              {!loginHeroImgFailed ? (
                <Image
                  src="/images/loginbg.jpeg"
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-center"
                  onError={() => setLoginHeroImgFailed(true)}
                />
              ) : (
                <div
                  className="absolute inset-0 bg-gradient-to-b from-[#003d30] via-[#004d3d] to-[#fff4e6]"
                  aria-hidden
                />
              )}
            </div>

            <div className="relative z-10 shrink-0 bg-[#fff7ed] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex justify-end pt-2">
                <div
                  className="flex gap-0.5 rounded-lg border border-[#c4d2cb] bg-white p-0.5 shadow-sm"
                  role="group"
                  aria-label={t("language")}
                >
                  <button
                    type="button"
                    onClick={() => setLocale("en")}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-black transition ${
                      locale === "en" ? "bg-[#004d3d] text-white shadow-sm" : "text-[#5c6b65]"
                    }`}
                  >
                    {t("langEnglish")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale("hi")}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-black transition ${
                      locale === "hi" ? "bg-[#004d3d] text-white shadow-sm" : "text-[#5c6b65]"
                    }`}
                  >
                    {t("langHindi")}
                  </button>
                </div>
              </div>

              {step === 3 && !isStorePartner ? (
                <div className="max-h-[min(56dvh,28rem)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] pr-0.5">
                  <div className="rounded-[24px] border border-white/65 bg-white/[0.96] p-[22px] shadow-[0_12px_48px_-16px_rgba(2,44,34,0.2)]">
                    <h2 className="text-[22px] font-extrabold leading-tight text-[#111827]">
                      {t("loginAppProfileTitle")}
                    </h2>
                    <p className="mb-[18px] mt-1.5 text-sm font-semibold leading-5 text-[#5c6b65]">
                      {t("loginAppProfileSub")}
                    </p>
                    <input
                      className="mb-3.5 w-full rounded-2xl border border-[rgba(196,210,203,0.9)] bg-[#fafcfb] px-4 py-3.5 text-base font-medium text-[#111827] outline-none placeholder:text-[#8a9691]"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      placeholder={t("loginNamePh")}
                      autoComplete="name"
                    />
                    <textarea
                      className="mb-3.5 min-h-[96px] w-full rounded-2xl border border-[rgba(196,210,203,0.9)] bg-[#fafcfb] px-4 py-3.5 text-base font-medium text-[#111827] outline-none placeholder:text-[#8a9691]"
                      value={onboardAddr}
                      onChange={(e) => setOnboardAddr(e.target.value)}
                      placeholder={t("loginAddrPh")}
                    />
                    <button
                      type="button"
                      className="mb-3 w-full rounded-[14px] border-[1.5px] border-[#c4d2cb] bg-white py-3.5 text-center text-[15px] font-extrabold text-[#111827] shadow-sm active:bg-[#f4f8f6] disabled:opacity-60"
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
                      <p className="mb-3 text-[13px] font-bold text-[#5c6b65]">
                        Lat {Math.round(onboardLat * 10000) / 10000}, Lng{" "}
                        {Math.round(onboardLng * 10000) / 10000}
                      </p>
                    ) : null}
                    <label className="mb-1.5 block text-[13px] font-bold text-[#5c6b65]">
                      {t("loginPhotoOpt")}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="mb-3.5 w-full rounded-2xl border border-[rgba(196,210,203,0.9)] bg-[#fafcfb] px-3 py-3 text-sm font-semibold text-[#111827] file:mr-3 file:rounded-lg file:border-0 file:bg-[#d4ebe4] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#004d3d]"
                      onChange={(e) => setOnboardFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      disabled={savingOnboard}
                      onClick={saveOnboarding}
                      className="mt-1 w-full rounded-2xl bg-[#004d3d] py-4 text-center text-base font-extrabold text-white shadow-[0_4px_16px_-2px_rgba(0,61,48,0.35)] active:opacity-90 disabled:opacity-65"
                    >
                      {savingOnboard ? t("loginSaving") : t("loginContinue")}
                    </button>
                    {msg ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                        {msg}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-[24px] border border-white/65 bg-white/[0.96] p-[22px] shadow-[0_12px_48px_-16px_rgba(2,44,34,0.2)]">
                    {showAdminPanelNote && !isStorePartner && step === 1 ? (
                      <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-semibold leading-snug text-violet-950">
                        <p className="font-bold text-violet-900">{t("loginAdminNoteTitle")}</p>
                        <p className="mt-1.5 text-violet-800">{t("loginAdminNoteBody")}</p>
                      </div>
                    ) : null}

                    {step === 1 ? (
                      <>
                        <h2 className="text-[22px] font-extrabold leading-tight text-[#111827]">
                          {isStorePartner ? t("loginTitlePartner") : t("loginMobileSheetTitle")}
                        </h2>
                        <p className="mb-[18px] mt-1.5 text-sm font-semibold leading-5 text-[#5c6b65]">
                          {isStorePartner ? t("loginSubPartner") : t("loginMobileSheetSub")}
                        </p>
                      </>
                    ) : null}

                    {step === 2 ? (
                      <>
                        <h2 className="text-[22px] font-extrabold leading-tight text-[#111827]">
                          {t("loginMobileSheetTitleOtp")}
                        </h2>
                        <p className="mb-[18px] mt-1.5 text-sm font-semibold leading-5 text-[#5c6b65]">
                          {isStorePartner ? t("loginMobileHintPartner") : t("loginAppOtpSub")}
                        </p>
                      </>
                    ) : null}

                    {step === 1 && (
                      <div className="space-y-0">
                        {isStorePartner ? (
                          <input
                            className="mb-3.5 w-full rounded-2xl border border-[rgba(196,210,203,0.9)] bg-[#fafcfb] px-4 py-3.5 text-base font-medium text-[#111827] outline-none placeholder:text-[#8a9691]"
                            value={storePartnerName}
                            onChange={(e) => setStorePartnerName(e.target.value)}
                            placeholder={t("loginOwnerPh")}
                          />
                        ) : null}
                        <input
                          className="mb-3.5 w-full rounded-2xl border border-[rgba(196,210,203,0.9)] bg-[#fafcfb] px-4 py-3.5 text-base font-medium text-[#111827] outline-none placeholder:text-[#8a9691]"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t("loginMobilePh")}
                          inputMode="tel"
                          autoComplete="tel-national"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={sendOtp}
                          className="w-full rounded-2xl bg-[#004d3d] py-4 text-center text-base font-extrabold text-white shadow-[0_4px_16px_-2px_rgba(0,61,48,0.35)] active:opacity-90 disabled:opacity-65"
                        >
                          {loading ? t("loginSending") : t("loginSendOtp")}
                        </button>
                        <p className="mt-4 text-center text-[13px] leading-snug text-[#5c6b65]">
                          {isStorePartner ? (
                            <>
                              <span className="font-semibold">{t("loginCustomerLead")}</span>{" "}
                              <Link
                                href={customerToggleHref}
                                className="font-bold text-[#004d3d] underline-offset-2 hover:underline"
                              >
                                {t("loginCustomerLink")}
                              </Link>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">{t("loginPartnerLead")}</span>{" "}
                              <Link
                                href={partnerToggleHref}
                                className="font-bold text-[#004d3d] underline-offset-2 hover:underline"
                              >
                                {t("loginPartnerLink")}
                              </Link>
                            </>
                          )}
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold text-[#5c6b65]">
                          <Link href="/shop/help" className="hover:text-[#004d3d]">
                            {t("loginDesktopHelpLink")}
                          </Link>
                          <Link href="/privacy" className="hover:text-[#004d3d]">
                            {t("loginDesktopPrivacyLink")}
                          </Link>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-0">
                        <input
                          className="mb-3.5 w-full rounded-2xl border border-[rgba(196,210,203,0.9)] bg-[#fafcfb] py-3.5 text-center font-display text-2xl font-bold tracking-[0.35em] text-[#111827] outline-none placeholder:text-[#8a9691]"
                          value={otp}
                          onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          placeholder="••••••"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="one-time-code"
                        />
                        <p className="mb-3.5 text-xs font-semibold text-[#5c6b65]">
                          {t("loginOtpTo")}{" "}
                          <span className="font-extrabold text-[#111827]">
                            {phone || t("loginOtpYourNumber")}
                          </span>
                        </p>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={verify}
                          className="w-full rounded-2xl bg-[#111827] py-4 text-center text-base font-extrabold text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)] active:opacity-90 disabled:opacity-65"
                        >
                          {loading ? t("loginVerifying") : t("loginVerify")}
                        </button>
                        <button
                          type="button"
                          className="mt-3.5 w-full py-2 text-center text-[15px] font-bold text-[#004d3d] hover:underline"
                          onClick={() => setStep(1)}
                        >
                          {t("loginChangePhone")}
                        </button>
                        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold text-[#5c6b65]">
                          <Link href="/shop/help" className="hover:text-[#004d3d]">
                            {t("loginDesktopHelpLink")}
                          </Link>
                          <Link href="/privacy" className="hover:text-[#004d3d]">
                            {t("loginDesktopPrivacyLink")}
                          </Link>
                        </div>
                      </div>
                    )}

                    {msg ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                        {msg}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-[18px] text-center text-xs font-semibold text-[#5c6b65]">
                    {t("loginAppSecureFooter")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Desktop: grocery-style white card (reference layout) */}
          <div className="mx-auto hidden w-full max-w-[480px] lg:block xl:max-w-[520px]">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.2)] sm:p-8">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-black tracking-tight text-zinc-900 sm:text-[26px]">
                    {t("loginDesktopWelcomeLead")}{" "}
                    <span className="text-emerald-600">{appName}</span>
                  </h1>
                  {!isStorePartner && (
                    <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                      {t("loginDesktopWelcomeSub")}
                    </p>
                  )}
                </div>
                {!isStorePartner && (
                  <span
                    className="hidden shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 sm:block"
                    title={t("loginTitleCustomer")}
                  >
                    {t("loginTitleCustomer")}
                  </span>
                )}
              </div>

              {showAdminPanelNote && !isStorePartner && (
                <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
                  <p className="font-bold text-violet-900">{t("loginAdminNoteTitle")}</p>
                  <p className="mt-2 leading-relaxed text-violet-800">{t("loginAdminNoteBody")}</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  {isStorePartner && (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                        {t("loginOwnerLabel")}
                      </label>
                      <div className={deskFieldClass}>
                        <span className="flex w-12 items-center justify-center border-r border-zinc-100 text-zinc-400">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </span>
                        <input
                          className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[15px] font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
                          value={storePartnerName}
                          onChange={(e) => setStorePartnerName(e.target.value)}
                          placeholder={t("loginOwnerPh")}
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {t("loginMobileLabel")}
                    </label>
                    <div className={deskFieldClass}>
                      <span className="flex w-12 items-center justify-center border-r border-zinc-100 text-zinc-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </span>
                      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
                        <span className="shrink-0 text-sm font-bold text-emerald-700">+91</span>
                        <input
                          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[15px] font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t("loginMobilePh")}
                          inputMode="tel"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {isStorePartner ? t("loginMobileHintPartner") : t("loginMobileHintCustomer")}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={sendOtp}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-900 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_30px_-12px_rgba(120,53,15,0.5)] transition hover:from-orange-600 hover:via-orange-700 hover:to-amber-950 disabled:opacity-50"
                  >
                    {loading ? t("loginSending") : t("loginSendOtp")}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {t("loginOtpLabel")}
                    </label>
                    <div className={deskFieldClass}>
                      <span className="flex w-12 items-center justify-center border-r border-zinc-100 text-zinc-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </span>
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-center font-display text-2xl font-bold tracking-[0.35em] text-zinc-900 outline-none placeholder:text-zinc-300"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••••"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {t("loginOtpTo")}{" "}
                      <span className="font-black text-zinc-800">{phone || t("loginOtpYourNumber")}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={verify}
                    className="w-full rounded-xl bg-emerald-600 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(5,150,105,0.65)] transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? t("loginVerifying") : t("loginVerify")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-center text-sm font-semibold text-zinc-500 hover:text-zinc-800"
                    onClick={() => setStep(1)}
                  >
                    {t("loginChangePhone")}
                  </button>
                </div>
              )}

              {step === 3 && !isStorePartner && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {t("loginFullName")}
                    </label>
                    <div className={deskFieldClass}>
                      <span className="flex w-12 items-center justify-center border-r border-zinc-100 text-zinc-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </span>
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[15px] font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
                        value={onboardName}
                        onChange={(e) => setOnboardName(e.target.value)}
                        placeholder={t("loginNamePh")}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-500">{t("loginNameHint")}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {t("loginAddrLabel")}
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] font-semibold text-zinc-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-h-[88px] placeholder:text-zinc-400"
                      value={onboardAddr}
                      onChange={(e) => setOnboardAddr(e.target.value)}
                      placeholder={t("loginAddrPh")}
                    />
                    <button
                      type="button"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm transition hover:bg-zinc-100 disabled:opacity-60"
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
                        Lat {Math.round(onboardLat * 10000) / 10000}, Lng{" "}
                        {Math.round(onboardLng * 10000) / 10000}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {t("loginPhotoOpt")}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-800"
                      onChange={(e) => setOnboardFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingOnboard}
                    onClick={saveOnboarding}
                    className="w-full rounded-xl bg-emerald-600 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(5,150,105,0.65)] transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingOnboard ? t("loginSaving") : t("loginContinue")}
                  </button>
                </div>
              )}

              {msg ? (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">
                  {msg}
                </div>
              ) : null}

              {(step === 1 || step === 2) && (
                <>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5 text-sm">
                    <Link href="/" className="font-semibold text-zinc-600 transition hover:text-zinc-900">
                      {t("loginDesktopBackHome")}
                    </Link>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href="/shop/help"
                        className="font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        {t("loginDesktopHelpLink")}
                      </Link>
                      <Link
                        href="/privacy"
                        className="font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        {t("loginDesktopPrivacyLink")}
                      </Link>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700"
                      aria-hidden
                    >
                      ✓
                    </span>
                    {t("loginDesktopSecureNote")}
                  </div>
                  <p className="mt-4 text-center text-sm text-zinc-600">
                    {isStorePartner ? (
                      <>
                        <span className="font-semibold">{t("loginCustomerLead")}</span>{" "}
                        <Link
                          href={customerToggleHref}
                          className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {t("loginCustomerLink")}
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{t("loginPartnerLead")}</span>{" "}
                        <Link
                          href={partnerToggleHref}
                          className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {t("loginPartnerLink")}
                        </Link>
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginSuspenseFallback() {
  const { t } = useLocale();
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-stone-50 text-stone-500">
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
