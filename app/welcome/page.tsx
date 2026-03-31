import Link from "next/link";
import { getAppLogoUrl, getAppMarkInitial, getAppName } from "@/lib/app-brand";
import Image from "next/image";

/** Marketing / partners landing (root ab /shop redirect karta hai) */
export default function WelcomePage() {
  const appName = getAppName();
  const mark = getAppMarkInitial();
  const logoUrl = getAppLogoUrl();
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/shop" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-cta text-base font-black text-white shadow-lg shadow-fresh-600/25">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={appName}
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                mark
              )}
            </span>
            <div className="leading-tight">
              <span className="font-display text-lg font-bold text-ink">{appName}</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-widest text-fresh-600 sm:block">
                Minutes, not hours
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/shop" className="text-sm font-bold text-fresh-700 hover:text-fresh-800">
              Shop
            </Link>
            <Link
              href="/store"
              className="hidden text-sm font-semibold text-stone-600 hover:text-ink sm:inline"
            >
              Partner store
            </Link>
            <Link
              href="/delivery"
              className="hidden text-sm font-semibold text-stone-600 hover:text-ink sm:inline"
            >
              Rider
            </Link>
            <Link href="/login" className="ui-btn-primary !py-2.5 !px-5 text-xs sm:text-sm">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero-pattern relative overflow-hidden bg-mesh-hero pt-24 pb-16 sm:pt-28 sm:pb-24">
        <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-fresh-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-rush-400/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fresh-700 shadow-sm ring-1 ring-fresh-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fresh-500" />
              Hyperlocal · COD · Live tracking
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              Groceries &amp; daily needs —{" "}
              <span className="bg-gradient-to-r from-fresh-600 to-fuchsia-500 bg-clip-text text-transparent">
                delivered fast
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-600">
              Order from approved stores on the web or app — COD, nearby outlets, and
              dashboards for partners &amp; riders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="ui-btn-primary !px-8 !py-4 text-base">
                Browse &amp; order — Shop
              </Link>
              <Link href="/login" className="ui-btn-ghost !py-4 !px-6 text-base">
                Partner login — OTP
              </Link>
              <Link href="/admin" className="ui-btn-ghost !py-4 !px-6 text-base">
                Admin console
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fresh-100 text-fresh-700">
                  ✓
                </span>
                OTP secure login
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rush-100 text-rush-600">
                  ⚡
                </span>
                Store &amp; rider panels
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="animate-float relative z-10 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-card-lg">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-ink">Your order</span>
                <span className="rounded-full bg-fresh-100 px-2.5 py-0.5 text-xs font-bold text-fresh-800">
                  12 min
                </span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-fresh-200 to-fresh-400" />
                    <div className="min-w-0 flex-1">
                      <div className="h-2.5 w-3/4 rounded bg-stone-200" />
                      <div className="mt-2 h-2 w-1/2 rounded bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-cta p-4 text-white">
                <span className="text-sm font-semibold opacity-90">Total</span>
                <span className="font-display text-xl font-bold">₹ 286</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 -right-4 top-8 -z-0 rounded-[2rem] bg-gradient-rush opacity-90 blur-sm" />
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-center text-2xl font-bold text-ink sm:text-3xl">
            Built for every role
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-stone-600">
            Same polish as consumer apps — for partners and operations.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Link
              href="/store"
              className="group ui-card transition hover:-translate-y-1 hover:shadow-card-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fresh-100 text-2xl transition group-hover:bg-fresh-500 group-hover:text-white">
                🏪
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Store partner</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Catalog, orders, earnings — approve orders and mark ready like a pro kitchen
                display.
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-bold text-fresh-600">
                Open panel →
              </span>
            </Link>
            <Link
              href="/delivery"
              className="group ui-card transition hover:-translate-y-1 hover:shadow-card-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rush-100 text-2xl transition group-hover:bg-rush-500 group-hover:text-white">
                🛵
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Delivery rider</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Accept → pickup → deliver. Earnings visible at a glance.
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-bold text-rush-600">
                Rider app →
              </span>
            </Link>
            <Link
              href="/admin"
              className="group ui-card transition hover:-translate-y-1 hover:shadow-card-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl transition group-hover:bg-violet-600 group-hover:text-white">
                📊
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Platform admin</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Approve stores, assign riders, commission &amp; subscription plans.
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-bold text-violet-600">
                Dashboard →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gradient-cta py-12 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Ready to run your hyperlocal stack?
          </h2>
          <p className="mt-2 text-sm text-white/85 sm:text-base">
            Log in with OTP — no passwords to remember.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-fresh-700 shadow-xl transition hover:bg-stone-50"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-ink py-10 text-center text-sm text-stone-400">
        <p>
          {appName} · Inspired by modern quick-commerce UX · Not affiliated with Blinkit or Swiggy
        </p>
      </footer>
    </div>
  );
}
