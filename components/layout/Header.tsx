"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { BASE } from "@/lib/data";

function headerButtonClasses(isTransparent: boolean, isDark: boolean): string {
  return `py-3 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
    isTransparent
      ? "bg-white/10 border-white/30 text-white hover:bg-white/20 focus:ring-white focus:ring-offset-black"
      : isDark
      ? "bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white focus:ring-offset-black"
      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 focus:ring-slate-500 focus:ring-offset-white"
  }`;
}

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
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const navEl = document.getElementById("mobile-nav");
    const navLinks = navEl ? Array.from(navEl.querySelectorAll<HTMLElement>("a[href]")) : [];
    const focusable = hamburgerRef.current ? [...navLinks, hamburgerRef.current] : navLinks;
    focusable[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (
        !hamburgerRef.current?.contains(e.target as Node) &&
        !navEl?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled && !menuOpen;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`motion-safe:transition-all motion-safe:duration-300 ${
          isTransparent
            ? ""
            : isDark
            ? "bg-black border-b border-white/10"
            : "bg-white border-b border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            aria-label={pathname === "/" ? "DS3 Energy Dashboard — scroll to top" : "DS3 Energy Dashboard — Home"}
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={`flex items-center gap-3 whitespace-nowrap flex-1 md:flex-none focus:outline-none focus:ring-2 focus:ring-offset-2 rounded ${
              isTransparent
                ? "focus:ring-white focus:ring-offset-black"
                : isDark
                ? "focus:ring-white focus:ring-offset-black"
                : "focus:ring-slate-500 focus:ring-offset-white"
            }`}
          >
            <img
              src={`${BASE}/images/logo.webp`}
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              loading="eager"
              style={isTransparent ? { mixBlendMode: "multiply" } : undefined}
            />
            <span className={`inline-flex items-end gap-2 font-light leading-none ${isTransparent || isDark ? "text-white" : "text-slate-900"}`}>
              <span className="text-3xl">DS<span className={isTransparent || isDark ? "text-white" : "text-cyan-500"}>3</span></span>
              <span className="hidden [@media(min-width:375px)]:inline text-sm sm:text-lg">Energy Dashboard</span>
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
                        ? "bg-teal-400/25 border-teal-300/50 text-white focus:ring-white"
                        : "border-transparent text-white/70 hover:text-white hover:bg-white/10 focus:ring-white"
                      : active
                      ? isDark
                        ? "bg-teal-500/20 border-teal-400/40 text-teal-300 focus:ring-white"
                        : "bg-teal-50 border-teal-400/50 text-teal-700 focus:ring-teal-500"
                      : isDark
                      ? "border-transparent text-white/60 hover:text-white hover:border-white/20 focus:ring-white"
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
              className={`px-4 ${headerButtonClasses(isTransparent, isDark)}`}
            >
              {isDark ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
            </button>

            {/* Hamburger — mobile only */}
            <button
              type="button"
              ref={hamburgerRef}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className={`md:hidden px-3.5 ${headerButtonClasses(isTransparent, isDark)}`}
            >
              {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile nav — always in DOM so aria-controls always resolves; visibility toggled with hidden */}
        <nav
            id="mobile-nav"
            className={`md:hidden px-6 pb-4 flex flex-col gap-1 border-t ${
              isDark ? "border-white/10" : "border-slate-200"
            } ${menuOpen ? "" : "hidden"}`}
            aria-label="Mobile navigation"
          >
            {nav.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-11 flex items-center text-sm font-medium px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                    active
                      ? isDark
                        ? "bg-teal-500/20 border-teal-400/40 text-teal-300 focus:ring-white"
                        : "bg-teal-50 border-teal-400/50 text-teal-700 focus:ring-teal-500"
                      : isDark
                      ? "border-transparent text-white/60 hover:text-white hover:bg-white/5 focus:ring-white"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 focus:ring-slate-500"
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
