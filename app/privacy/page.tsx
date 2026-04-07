import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAppLogoUrl, getAppMarkInitial, getAppName } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, and protect your information.",
};

/** Public page — no login required (not under /shop auth redirects). */
export default function PrivacyPolicyPage() {
  const appName = getAppName();
  const mark = getAppMarkInitial();
  const logoUrl = getAppLogoUrl();

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/shop" className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-cta text-sm font-black text-white shadow-md">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={appName}
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                mark
              )}
            </span>
            <span className="truncate font-display text-base font-bold text-ink">{appName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <Link href="/shop" className="text-fresh-700 hover:text-fresh-800">
              Shop
            </Link>
            <span className="text-stone-300" aria-hidden>
              |
            </span>
            <Link href="/login" className="text-stone-600 hover:text-ink">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Privacy policy
        </h1>
        <p className="mt-2 text-sm font-medium text-stone-500">
          Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-stone mt-8 max-w-none prose-headings:font-display prose-headings:font-bold prose-p:text-stone-600 prose-li:text-stone-600">
          <p className="text-base leading-relaxed">
            This page describes how <strong>{appName}</strong> (“we”, “us”) handles information when you use our
            website and related services. Replace the sections below with text your legal advisor approves for your
            jurisdiction and data practices.
          </p>

          <h2 className="mt-10 text-xl text-ink">1. Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account and profile details you provide (for example name, phone number, delivery address).</li>
            <li>Order and transaction information needed to fulfil deliveries.</li>
            <li>Technical data such as device type, browser, and approximate location when you allow it.</li>
          </ul>

          <h2 className="mt-10 text-xl text-ink">2. How we use information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>To create and manage your account, process orders, and communicate about your orders.</li>
            <li>To improve our service, security, and fraud prevention.</li>
            <li>To comply with legal obligations where applicable.</li>
          </ul>

          <h2 className="mt-10 text-xl text-ink">3. Sharing</h2>
          <p>
            We may share information with stores, delivery partners, and service providers (e.g. hosting, maps,
            notifications) only as needed to operate the service. We do not sell your personal information.
          </p>

          <h2 className="mt-10 text-xl text-ink">4. Security & retention</h2>
          <p>
            We use reasonable technical and organisational measures to protect data. We retain information only as long
            as needed for the purposes above or as required by law.
          </p>

          <h2 className="mt-10 text-xl text-ink">5. Your choices</h2>
          <p>
            You may request access, correction, or deletion of certain personal data where applicable law allows. Contact
            details should be added here once your support channels are finalised.
          </p>

          <h2 className="mt-10 text-xl text-ink">6. Contact</h2>
          <p>
            For privacy-related questions, contact your team through the channels listed on the{" "}
            <Link href="/shop/help" className="font-bold text-fresh-700 hover:text-fresh-800">
              Help
            </Link>{" "}
            page.
          </p>
        </div>
      </main>
    </div>
  );
}
