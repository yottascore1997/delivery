"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getUser } from "@/lib/client-api";

const roleBadge: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-800 ring-violet-200",
  STORE_OWNER: "bg-fresh-100 text-fresh-800 ring-fresh-200",
  DELIVERY: "bg-rush-100 text-rush-800 ring-rush-200",
};

export function PanelShell({
  title,
  subtitle,
  children,
  links,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  links: { href: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-mesh-hero bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <Link
              href="/"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-cta text-base font-black text-white shadow-lg shadow-fresh-600/30 sm:h-11 sm:w-11 sm:text-lg"
            >
              D
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold tracking-tight text-ink sm:text-lg">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-stone-500">{subtitle}</p>
              )}
              {user && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${roleBadge[user.role] ?? "bg-stone-100 text-stone-700"}`}
                  >
                    {user.role.replace("_", " ")}
                  </span>
                  <span className="min-w-0 truncate text-xs text-stone-500">
                    {user.name} · {user.phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-end">
            <nav className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-stone-100/90 p-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`shrink-0 whitespace-nowrap ${
                      active
                        ? "nav-pill-active"
                        : "rounded-full px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-white hover:text-ink sm:px-4 sm:text-sm"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fresh-400 to-fresh-600 text-[11px] font-bold text-white sm:h-10 sm:w-10 sm:text-xs">
                {initials}
              </div>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-4 sm:text-sm"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
