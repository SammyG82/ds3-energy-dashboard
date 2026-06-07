"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme-context";

function footerLinkClasses(isDark: boolean): string {
  return `text-xs font-medium uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded ${
    isDark ? "text-white/40 hover:text-white focus:ring-white focus:ring-offset-black" : "text-slate-400 hover:text-slate-700 focus:ring-slate-500 focus:ring-offset-white"
  }`;
}

export default function Footer() {
  const { isDark } = useTheme();

  return (
    <footer className={`border-t transition-colors duration-300 ${isDark ? "bg-black border-white/10" : "bg-white border-slate-200"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap justify-between items-center gap-4">
        <p className={`text-xs font-medium ${isDark ? "text-white/40" : "text-slate-400"}`}>
          © {new Date().getFullYear()} DS3 Energy Dashboard · Data: IEA
        </p>
        <nav className="flex gap-5" aria-label="Footer links">
          <a
            href="https://github.com/SammyG82/ds3-energy-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository (opens in new tab)"
            className={footerLinkClasses(isDark)}
          >
            GitHub
          </a>
          <Link
            href="/about/"
            className={footerLinkClasses(isDark)}
          >
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
