"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAppName } from "@/lib/app-brand";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const year = new Date().getFullYear();
  return (
    <footer className="hidden border-t border-white/10 bg-[#0c0a12] text-zinc-300 md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-sm font-semibold">
        <p>
          © {year} {getAppName()}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/welcome" className="text-zinc-300 hover:text-white">
            About
          </Link>
          <Link href="/privacy" className="text-zinc-300 hover:text-white">
            Privacy
          </Link>
          <Link href="/account-data-deletion" className="text-zinc-300 hover:text-white">
            Delete account / data
          </Link>
          <Link href="/login" className="text-zinc-300 hover:text-white">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
