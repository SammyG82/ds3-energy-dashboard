"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-16">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap justify-between items-center gap-4">
        <p className="text-xs text-slate-400 font-mono">
          © {new Date().getFullYear()} DS3 Energy Dashboard · Data: IEA · EIA · Ember
        </p>
        <nav className="flex gap-5" aria-label="Footer links">
          <a
            href="https://github.com/SammyG82/ds3-energy-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository (opens in new tab)"
            className="text-xs text-slate-400 hover:text-slate-700 font-mono uppercase tracking-wide transition-colors"
          >
            GitHub
          </a>
          <Link
            href="/datasets/"
            className="text-xs text-slate-400 hover:text-slate-700 font-mono uppercase tracking-wide transition-colors"
          >
            Datasets
          </Link>
        </nav>
      </div>
    </footer>
  );
}
