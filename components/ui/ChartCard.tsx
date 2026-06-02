"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import FadeIn from "@/components/ui/FadeIn";

interface ChartCardProps {
  title: string;
  /** Parenthetical suffix rendered muted — e.g. "(Top 5 Markets)" */
  titleSuffix?: string;
  subtitle?: string;
  /** Presence of linkHref triggers preview layout: flex header + link, font-semibold */
  linkHref?: string;
  linkLabel?: string;
  /** Adds id attribute and scroll-mt-24 for hash-scroll targets */
  id?: string;
  delay?: number;
  /** Tailwind min-height classes, e.g. "min-h-64 sm:min-h-100" */
  minHeightClass?: string;
  isDark: boolean;
  children: ReactNode;
}

export default function ChartCard({
  title, titleSuffix, subtitle, linkHref, linkLabel,
  id, delay, minHeightClass, isDark, children,
}: ChartCardProps) {
  return (
    <FadeIn delay={delay}>
      <div
        id={id}
        className={[
          "rounded-2xl p-4 sm:p-6 border",
          minHeightClass,
          id ? "scroll-mt-24" : "",
          isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm",
        ].filter(Boolean).join(" ")}
      >
        {linkHref ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                {title}
                {titleSuffix && (
                  <>{" "}<span className={`font-normal text-base ${isDark ? "text-white/50" : "text-slate-400"}`}>{titleSuffix}</span></>
                )}
              </h2>
              {subtitle && (
                <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>{subtitle}</p>
              )}
            </div>
            <Link href={linkHref} className="text-sm font-semibold text-blue-500 hover:underline py-3 sm:py-0">
              {linkLabel} →
            </Link>
          </div>
        ) : (
          <div className="mb-6">
            <h2 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h2>
            {subtitle && (
              <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </FadeIn>
  );
}
