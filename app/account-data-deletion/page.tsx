import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAppLogoUrl, getAppMarkInitial, getAppName } from "@/lib/app-brand";
import { DataDeletionRequestForm } from "@/components/public/DataDeletionRequestForm";

export const metadata: Metadata = {
  title: "Account & data deletion",
  description: "Request deletion of your account and associated personal data.",
  robots: { index: true, follow: true },
};

/** Public — no login (Google Play: link to request account/data deletion). */
export default function AccountDataDeletionPage() {
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
            <Link href="/privacy" className="text-stone-600 hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Account &amp; data deletion
        </h1>
        <p className="mt-2 text-sm font-medium text-stone-500">
          Use this page to ask us to delete your <strong>{appName}</strong> account and the personal data linked to it,
          where applicable law allows.
        </p>

        <div className="prose prose-stone mt-8 max-w-none prose-p:text-stone-600 prose-li:text-stone-600">
          <h2 className="font-display text-xl font-bold text-ink">What happens next</h2>
          <ul className="list-disc space-y-2 pl-5 text-base">
            <li>Submit the form below with the phone number you use in the app.</li>
            <li>We will verify ownership and process deletion within a reasonable time, subject to legal retention needs
              (for example completed orders or tax records).</li>
            <li>Some anonymised or aggregated information may be kept where the law allows and it no longer identifies you.</li>
          </ul>
          <p className="text-base">
            You can also read our{" "}
            <Link href="/privacy" className="font-bold text-fresh-700 hover:text-fresh-800">
              Privacy policy
            </Link>{" "}
            and reach us via{" "}
            <Link href="/shop/help" className="font-bold text-fresh-700 hover:text-fresh-800">
              Help &amp; support
            </Link>
            .
          </p>
        </div>

        <DataDeletionRequestForm />
      </main>
    </div>
  );
}
