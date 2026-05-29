"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import FadeIn from "@/components/ui/FadeIn";
import { fetchEvData, fetchEvSales, fmtEvSales, dn, AGGREGATES } from "@/lib/data";
import { useTheme } from "@/lib/theme-context";
import type { EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";
import { useDataFetch } from "@/lib/ui-utils";
import { TOP_5_MARKETS } from "@/lib/data";

const EvForecastChart = dynamic(() => import("@/components/charts/EvForecastChart"), { ssr: false });
const EvShareChart = dynamic(() => import("@/components/charts/EvShareChart"), { ssr: false });
const EvTrendChart = dynamic(() => import("@/components/charts/EvTrendChart"), { ssr: false });

const HEADER_HEIGHT_PX = 96;

export default function EvForecastPage() {
  const { isDark } = useTheme();
  const { data, error } = useDataFetch<EvRow[]>(fetchEvData, []);
  const { data: salesData, error: salesError } = useDataFetch<EvRow[]>(fetchEvSales, []);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(TOP_5_MARKETS);
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (scrolledRef.current || !data.length || !salesData.length) return;
    const hash = window.location.hash;
    if (!hash) return;
    scrolledRef.current = true;
    setTimeout(() => {
      const el = document.querySelector(hash);
      if (!el) return;
      const top = window.scrollY + el.getBoundingClientRect().top - HEADER_HEIGHT_PX;
      window.scrollTo({ top, behavior: "smooth" });
    }, 300);
  }, [data, salesData]);


  const worldRows = useMemo(() => data.filter((d) => d.region_country === "World"), [data]);
  const forecastBoundary = useMemo(() => {
    const years = data.filter((d) => d.type === "Forecast").map((d) => d.year);
    return years.length > 0 ? Math.min(...years) : 2025;
  }, [data]);

  const effectiveYear = useMemo(() => {
    if (hoveredYear !== null) return hoveredYear;
    return worldRows.filter((d) => d.type === "Actual").reduce((max, d) => Math.max(max, d.year), 0) || 2024;
  }, [hoveredYear, worldRows]);

  const isProjected = effectiveYear >= forecastBoundary;

  const globalSales = useMemo(() => worldRows.find((d) => d.year === effectiveYear)?.ev_sales ?? null, [worldRows, effectiveYear]);
  const prevSales = useMemo(() => worldRows.find((d) => d.year === effectiveYear - 1)?.ev_sales ?? null, [worldRows, effectiveYear]);
  const yoyGrowth = useMemo(() => (globalSales !== null && prevSales !== null && prevSales > 0) ? ((globalSales - prevSales) / prevSales) * 100 : null, [globalSales, prevSales]);
  const marketLeader = useMemo(() => {
    return data
      .filter((d) => d.year === effectiveYear && !AGGREGATES.has(d.region_country) && (selectedRegions.length === 0 || selectedRegions.includes(d.region_country)))
      .sort((a, b) => b.ev_sales - a.ev_sales)[0]?.region_country ?? null;
  }, [data, effectiveYear, selectedRegions]);

  return (
    <div className={`transition-colors duration-300 ${isDark ? "bg-black" : "bg-white"}`}>
      <PageHeader
        title="EV"
        titleAccent="Forecast"
        subtitle="IEA Stated Policies Scenario (STEPS) projections of EV sales across 50+ countries and regions through 2035."
        isDark={isDark}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">

        <FadeIn>
          <div id="ev-sales-by-country" className={`border rounded-2xl p-6 scroll-mt-24 ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="mb-6">
              <h2 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>EV Sales by Country</h2>
              <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>Top countries ranked by annual EV sales — select a year</p>
            </div>
            {salesData.length > 0 ? (
              <EvShareChart data={salesData} isDark={isDark} />
            ) : salesError ? (
              <ErrorMessage message={salesError} isDark={isDark} />
            ) : (
              <LoadingPlaceholder text="Loading data…" />
            )}
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div id="ev-sales-projections" className={`border rounded-2xl p-6 scroll-mt-24 ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <h2 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>EV Sales Projections</h2>
            <p className={`text-sm mb-6 ${isDark ? "text-white/50" : "text-slate-500"}`}>IEA Stated Policies Scenario (STEPS) projections of EV sales. Select multiple regions to compare trajectories.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <StatCard label={`${isProjected ? "Projected " : ""}Global EV Sales (${effectiveYear})`} value={globalSales !== null ? fmtEvSales(globalSales) : "—"} accent="teal" isDark={isDark} />
              <StatCard label={`${isProjected ? "Projected " : ""}YoY Growth (${effectiveYear - 1}→${effectiveYear})`} value={yoyGrowth !== null ? `${yoyGrowth >= 0 ? "+" : ""}${yoyGrowth.toFixed(1)}%` : "—"} accent="amber" isDark={isDark} />
              <StatCard label={`${isProjected ? "Projected " : ""}Market Leader (${effectiveYear})`} value={marketLeader !== null ? dn(marketLeader) : "—"} accent="blue" isDark={isDark} />
            </div>
            {data.length > 0 ? (
              <EvForecastChart data={data} onYearChange={setHoveredYear} onSelectionChange={setSelectedRegions} isDark={isDark} />
            ) : error ? (
              <ErrorMessage message={error} isDark={isDark} />
            ) : (
              <LoadingPlaceholder text="Loading data…" />
            )}
            <div className={`mt-6 p-5 rounded-xl ${isDark ? "bg-white/10" : "bg-slate-50"}`}>
              <h3 className="text-blue-500 text-xs uppercase tracking-widest mb-3">Behind the Numbers</h3>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Forecast Model</h4>
              <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-600"}`}>
                IEA Stated Policies Scenario (STEPS) projections from Global EV Outlook 2025. Historical rows are <em>Actual</em> type; projections are <em>Forecast</em> type. Solid lines show recorded sales; dashed lines show STEPS projections through 2035. The APS (Announced Pledges Scenario) is excluded to avoid duplicate region/year pairs.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className={`border rounded-2xl p-6 ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="mb-6">
              <h2 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>EV Sales Over Time</h2>
              <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>Single-country sales trajectory with IEA STEPS projection through 2035</p>
            </div>
            {salesData.length > 0 ? (
              <EvTrendChart data={salesData} isDark={isDark} />
            ) : salesError ? (
              <ErrorMessage message={salesError} isDark={isDark} />
            ) : (
              <LoadingPlaceholder text="Loading data…" />
            )}
            <div className={`mt-6 p-5 rounded-xl ${isDark ? "bg-white/10" : "bg-slate-50"}`}>
              <h3 className="text-blue-500 text-xs uppercase tracking-widest mb-4">Behind the Numbers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Annual Growth Rate</h4>
                  <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-600"}`}>
                    Compound annual growth rate (CAGR) from the first year with recorded sales to the most recent historical year. Formula:{" "}
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${isDark ? "bg-white/10 text-white/70" : "bg-slate-200"}`}>
                      ((latest ÷ first)^(1 ÷ years) − 1) × 100
                    </span>
                    . It smooths year-to-year swings, so a market that grew slowly then spiked will show a lower rate than the spike alone suggests.
                  </p>
                </div>
                <div>
                  <h4 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Peak Year &amp; 2030 Forecast</h4>
                  <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-600"}`}>
                    Peak Year excludes projected years — it is based on actual recorded sales only. The 2030 Forecast comes from the IEA's Stated Policies Scenario (STEPS) in the Global EV Outlook 2025, modelling adoption under currently enacted policies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
