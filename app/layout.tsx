import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/lib/theme-context";
import PageInit from "@/components/ui/PageInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DS3 Energy Dashboard",
  description:
    "A data-driven dashboard exploring EV adoption, oil dependency, and clean energy infrastructure across 50+ countries.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'history.scrollRestoration="manual";document.documentElement.classList.add("page-loading");var s=document.createElement("style");s.textContent="html.page-loading header{opacity:0}";document.head.appendChild(s);' }} />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50 text-slate-900 overscroll-none`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 text-sm font-semibold text-slate-900 rounded-lg border border-slate-300 z-100"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <PageInit />
          <Header />
          <main id="main-content" className="flex-1 pt-18">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
