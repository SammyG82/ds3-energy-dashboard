"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { BASE } from "@/lib/data";

const nav = [
  { label: "Dashboard",   href: "/" },
  { label: "EV Forecast", href: "/ev-forecast/" },
  { label: "EV Impact",   href: "/ev-gdp-impact/" },
  { label: "About",       href: "/about/" },
];

export default function Header() {
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setIsScrolled(window.scrollY > 10);
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled && !menuOpen;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`transition-all duration-300 ${
          isTransparent
            ? ""
            : isDark
            ? "bg-black border-b border-white/10"
            : "bg-white border-b border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={`flex items-center gap-3 whitespace-nowrap flex-1 md:flex-none focus:outline-none focus:ring-2 rounded ${
              isTransparent ? "focus:ring-white/50" : "focus:ring-slate-500"
            }`}
          >
            <img
              src={`${BASE}/images/logo.webp`}
              alt=""
              aria-hidden="true"
              className="w-10 h-10 object-contain"
              style={isTransparent ? { mixBlendMode: "multiply" } : undefined}
            />
            <span className={`inline-flex items-end gap-2 font-light leading-none ${isTransparent || isDark ? "text-white" : "text-slate-900"}`}>
              <span className="text-3xl">DS<span className={isTransparent || isDark ? "text-white" : "text-cyan-500"}>3</span></span>
              <span className="text-lg hidden sm:inline">Energy Dashboard</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex flex-1 justify-center gap-1.5" aria-label="Primary navigation">
            {nav.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap focus:outline-none focus:ring-2 ${
                    isTransparent
                      ? active
                        ? "bg-teal-400/25 border-teal-300/50 text-white focus:ring-white/50"
                        : "border-transparent text-white/70 hover:text-white hover:bg-white/10 focus:ring-white/50"
                      : active
                      ? isDark
                        ? "bg-teal-500/20 border-teal-400/40 text-teal-300 focus:ring-teal-400/50"
                        : "bg-teal-50 border-teal-400/50 text-teal-700 focus:ring-teal-500"
                      : isDark
                      ? "border-transparent text-white/60 hover:text-white hover:border-white/20 focus:ring-white/50"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200 focus:ring-slate-500"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 md:flex-1 justify-end">
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={`px-4 py-2.5 rounded-full border transition-colors focus:outline-none focus:ring-2 ${
                isTransparent
                  ? "bg-white/10 border-white/30 text-white hover:bg-white/20 focus:ring-white/50"
                  : isDark
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/50"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 focus:ring-slate-500"
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Hamburger — mobile only */}
            <button
              type="button"
              ref={hamburgerRef}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className={`md:hidden px-2.5 py-2.5 rounded-full border transition-colors focus:outline-none focus:ring-2 ${
                isTransparent
                  ? "bg-white/10 border-white/30 text-white hover:bg-white/20 focus:ring-white/50"
                  : isDark
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/50"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 focus:ring-slate-500"
              }`}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav
            id="mobile-nav"
            className={`md:hidden px-6 pb-4 flex flex-col gap-1 border-t ${
              isDark ? "border-white/10" : "border-slate-200"
            }`}
            aria-label="Mobile navigation"
          >
            {nav.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                    active
                      ? isDark
                        ? "bg-teal-500/20 border-teal-400/40 text-teal-300 focus:ring-teal-400/50"
                        : "bg-teal-50 border-teal-400/50 text-teal-700 focus:ring-teal-500"
                      : isDark
                      ? "border-transparent text-white/60 hover:text-white hover:bg-white/5 focus:ring-white/50"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 focus:ring-slate-500"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
