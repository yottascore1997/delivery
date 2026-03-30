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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-cta text-lg font-black text-white shadow-lg shadow-fresh-600/30"
            >
              D
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-ink">
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
                  <span className="text-xs text-stone-500">
                    {user.name} · {user.phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-1 rounded-full bg-stone-100/90 p-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={
                      active
                        ? "nav-pill-active"
                        : "rounded-full px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-white hover:text-ink"
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fresh-400 to-fresh-600 text-xs font-bold text-white">
              {initials}
            </div>
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
