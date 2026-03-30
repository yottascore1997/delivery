"use client";

import { LocaleProvider } from "@/contexts/LocaleContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
