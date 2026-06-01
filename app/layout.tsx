import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/lib/theme-context";
import PageInit from "@/components/ui/PageInit";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

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
        <script dangerouslySetInnerHTML={{ __html: 'try{if(localStorage.getItem("ds3-theme")==="dark")document.documentElement.classList.add("dark");}catch(e){}history.scrollRestoration="manual";document.documentElement.classList.add("page-loading");var s=document.createElement("style");s.textContent="html.page-loading header{opacity:0}";s.setAttribute("data-page-init","");document.head.appendChild(s);' }} />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-white dark:bg-black text-slate-900 overscroll-none overflow-x-hidden`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-white/20 px-4 py-2 text-sm font-semibold rounded-lg border z-[100]"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <PageInit />
          <Header />
          <ErrorBoundary>
            <main id="main-content" tabIndex={-1} className="flex-1 pt-18">{children}</main>
          </ErrorBoundary>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
