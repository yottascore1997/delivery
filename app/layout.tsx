import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { Providers } from "./providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Speedza — Groceries in minutes",
  description: "Hyperlocal delivery — stores, orders & riders. Fast like Blinkit, trusted like Swiggy.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#f7f7f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          <div className="min-h-screen">
            {children}
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
