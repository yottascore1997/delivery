"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { getAppName } from "@/lib/app-brand";
import {
  getSupportEmailDisplay,
  getSupportMailtoHref,
  getSupportPhoneDisplay,
  getSupportTelHref,
  getSupportWhatsAppHref,
  hasAnySupportChannel,
} from "@/lib/support-config";

function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm open:shadow-md open:ring-1 open:ring-orange-100">
      <summary className="cursor-pointer list-none font-bold text-zinc-900 outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {q}
          <span className="text-zinc-400 transition group-open:rotate-180">▼</span>
        </span>
      </summary>
      <div className="mt-3 border-t border-zinc-100 pt-3 text-sm font-medium leading-relaxed text-zinc-600">{a}</div>
    </details>
  );
}

export default function ShopHelpPage() {
  const app = getAppName();
  const phoneDisplay = getSupportPhoneDisplay();
  const tel = getSupportTelHref();
  const email = getSupportEmailDisplay();
  const mailto = getSupportMailtoHref();
  const wa = getSupportWhatsAppHref();
  const hasChannels = hasAnySupportChannel();

  const faq = [
    {
      q: "How do I place an order?",
      a: `Browse stores on ${app}, add items to your cart, set your delivery address, and pay with COD (cash on delivery) when your order arrives.`,
    },
    {
      q: "How do I change my delivery address?",
      a: "Open Cart and use the delivery address section — you can use current location or type your full address. You can also open Profile and tap to add or change address.",
    },
    {
      q: "What payment methods are supported?",
      a: "Right now orders are placed as COD. Pay the delivery partner or store as per instructions when you receive your order.",
    },
    {
      q: "Where can I see my past orders?",
      a: "Go to Orders from the bottom menu or your Profile. You’ll see today’s orders and full history there.",
    },
    {
      q: "My order is delayed or wrong — what should I do?",
      a: hasChannels
        ? "Contact us using Call, WhatsApp, or Email below. Share your order ID (from Orders) so we can help faster."
        : "Contact support using the details your store or app owner has shared. Share your order ID from the Orders page when you reach out.",
    },
    {
      q: "Do I need an account?",
      a: "Yes — sign in with your mobile number (OTP) as a customer to order and save your address.",
    },
    {
      q: "How do I delete my account and my data?",
      a: (
        <>
          Use the{" "}
          <Link href="/account-data-deletion" className="font-bold text-fresh-700 underline hover:text-fresh-800">
            Account &amp; data deletion
          </Link>{" "}
          page (no login needed). Enter the same mobile number you use in the app and submit the form.
        </>
      ),
    },
  ];

  return (
    <div className="pb-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/shop"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm"
        >
          ← Back
        </Link>
      </div>

      <div className="mb-8 rounded-[1.75rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50/80 px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">Help &amp; support</p>
        <h1 className="font-display mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
          How can we help?
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-zinc-600">
          Quick answers below. Still stuck? Reach us on WhatsApp, call, or email.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="font-display text-lg font-black text-zinc-900">Common questions</h2>
        <p className="mt-1 text-xs font-medium text-zinc-500">Tap a question to expand</p>
        <ul className="mt-4 space-y-2">
          {faq.map((item) => (
            <li key={item.q}>
              <FaqItem q={item.q} a={item.a} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-black text-zinc-900">Contact us</h2>
        <p className="mt-1 text-xs font-medium text-zinc-500">We’re here for orders, refunds, and feedback</p>

        {hasChannels ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 transition hover:bg-emerald-100/90"
              >
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">WhatsApp</p>
                  <p className="text-sm font-bold text-emerald-950">Chat with support</p>
                </div>
              </a>
            ) : null}
            {tel && phoneDisplay ? (
              <a
                href={tel}
                className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-4 transition hover:bg-sky-100/90"
              >
                <span className="text-2xl" aria-hidden>
                  📞
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-sky-800">Call</p>
                  <p className="text-sm font-bold text-sky-950">{phoneDisplay}</p>
                </div>
              </a>
            ) : null}
            {mailto && email ? (
              <a
                href={mailto}
                className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/90 px-4 py-4 transition hover:bg-violet-100/90 sm:col-span-2"
              >
                <span className="text-2xl" aria-hidden>
                  ✉️
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-violet-800">Email</p>
                  <p className="text-sm font-bold text-violet-950 break-all">{email}</p>
                </div>
              </a>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 px-4 py-5 text-sm font-medium text-amber-950">
            <p>
              Support phone, WhatsApp, and email will appear here once your team adds them to{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">.env</code> (see{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">lib/support-config.ts</code>).
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/shop/orders"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-800"
          >
            My orders
          </Link>
          <Link
            href="/shop/profile"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-800"
          >
            Profile
          </Link>
          <Link
            href="/privacy"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-800"
          >
            Privacy policy
          </Link>
          <Link
            href="/account-data-deletion"
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-900"
          >
            Delete account / data
          </Link>
        </div>
      </section>
    </div>
  );
}
