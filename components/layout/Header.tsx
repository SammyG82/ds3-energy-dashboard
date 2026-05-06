"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE = process.env.NODE_ENV === "production" ? "/ds3-energy-dashboard" : "";

const nav = [
  { label: "Dashboard",       href: "/" },
  { label: "EV Share",        href: "/ev-share/" },
  { label: "EV Forecast",     href: "/ev-forecast/" },
  { label: "Oil Explorer",    href: "/oil-explorer/" },
  { label: "EV GDP Impact",   href: "/ev-gdp-impact/" },
  { label: "Energy Access",   href: "/energy-access/" },
  { label: "Affordability",   href: "/affordability/" },
  { label: "Global Targets",  href: "/global-targets/" },
  { label: "Datasets",        href: "/datasets/" },
];

export default function Header() {
  const pathname = usePathname().replace(BASE, "") || "/";

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4 py-3">
        <Link href="/" className="font-bold text-base tracking-tight whitespace-nowrap">
          <span className="text-amber-600">DS3</span>{" "}
          <span className="text-slate-900">Energy Dashboard</span>
        </Link>

        <nav className="flex flex-wrap gap-1" aria-label="Primary navigation">
          {nav.map(({ label, href }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "border-amber-400/50 bg-amber-50 text-amber-700"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
