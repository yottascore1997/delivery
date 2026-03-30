"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { getAppName } from "@/lib/app-brand";
import { clearSession, getUser } from "@/lib/client-api";

export type DashNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

export function DashboardShell({
  navItems,
  activeId,
  onNav,
  breadcrumb,
  roleLabel,
  productTitle = getAppName(),
  headerTitle,
  headerSubtitle,
  bottomLinks,
  onRefresh,
  children,
}: {
  navItems: DashNavItem[];
  activeId: string;
  onNav: (id: string) => void;
  breadcrumb: string;
  roleLabel: string;
  productTitle?: string;
  /** Main line in top bar (defaults to signed-in user name) */
  headerTitle?: string;
  /** Smaller line under the title (e.g. owner name when title is store) */
  headerSubtitle?: string;
  bottomLinks: { href: string; label: string }[];
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const user = getUser();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const primaryTitle = headerTitle ?? user?.name ?? "—";
  const [langOpen, setLangOpen] = useState(false);
  const langWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = langWrapRef.current;
      if (!el?.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-100/40 via-[#f0eef8] to-stone-100">
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[268px] flex-col border-r border-violet-950/30 bg-gradient-to-b from-[#1a1428] via-[#151020] to-[#0c0a12] text-zinc-100 shadow-2xl shadow-violet-950/40">
        <div className="border-b border-white/10 px-5 py-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-600 to-indigo-700 text-sm font-black text-white shadow-lg shadow-violet-900/40">
              D
            </span>
            <div>
              <p className="font-display text-sm font-bold leading-tight text-white">
                {productTitle}
              </p>
              <p className="text-[11px] font-medium text-zinc-400">{roleLabel}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNav(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-white/[0.12] text-white shadow-inner ring-1 ring-white/10"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-violet-500/25 text-violet-200" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 space-y-3">
          {bottomLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-lg px-2 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20"
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[268px]">
        <header className="sticky top-0 z-40 flex min-h-[60px] flex-wrap items-center justify-between gap-3 border-b border-violet-200/60 bg-white/90 px-4 py-2 backdrop-blur-md sm:gap-4 sm:px-6 sm:py-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {breadcrumb}
            </p>
            <p className="truncate font-display text-lg font-bold text-zinc-900">
              {primaryTitle}
            </p>
            {headerSubtitle ? (
              <p className="truncate text-xs text-zinc-500">{headerSubtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="relative" ref={langWrapRef}>
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-violet-100/90 sm:text-sm"
                aria-expanded={langOpen}
                aria-haspopup="listbox"
              >
                {t("language")}
                <svg
                  className={`h-4 w-4 text-violet-600 transition ${langOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {langOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-violet-200/90 bg-white py-1 shadow-xl shadow-violet-900/10 ring-1 ring-black/5"
                  role="listbox"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={locale === "en"}
                    onClick={() => {
                      setLocale("en");
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-violet-50 ${
                      locale === "en"
                        ? "bg-violet-100 text-violet-900"
                        : "text-zinc-800"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={locale === "hi"}
                    onClick={() => {
                      setLocale("hi");
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-violet-50 ${
                      locale === "hi"
                        ? "bg-violet-100 text-violet-900"
                        : "text-zinc-800"
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              ) : null}
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="hidden rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 sm:inline"
              >
                {t("refresh")}
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-700 text-xs font-bold text-white shadow-md shadow-violet-500/25">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
