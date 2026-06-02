"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import ChartCard from "@/components/ui/ChartCard";
import { fetchEvData, fetchEvSales, fmtEvSales, dn, AGGREGATES, TOP_5_MARKETS } from "@/lib/data";
import { useTheme } from "@/lib/theme-context";
import type { EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";
import { useDataFetch, useEvForecastBoundary, useHashScroll } from "@/lib/ui-utils";

const EvForecastChart = dynamic(() => import("@/components/charts/EvForecastChart"), { ssr: false, loading: () => <LoadingPlaceholder text="Loading chart…" /> });
const EvShareChart    = dynamic(() => import("@/components/charts/EvShareChart"),    { ssr: false, loading: () => <LoadingPlaceholder text="Loading chart…" /> });
const EvTrendChart    = dynamic(() => import("@/components/charts/EvTrendChart"),    { ssr: false, loading: () => <LoadingPlaceholder text="Loading chart…" /> });

export default function EvForecastPage() {
  const { isDark } = useTheme();
  const { data, error } = useDataFetch<EvRow[]>(fetchEvData, []);
  const { data: salesData, error: salesError } = useDataFetch<EvRow[]>(fetchEvSales, []);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(TOP_5_MARKETS);

  useHashScroll(
    (hash) => {
      if (hash === "#ev-sales-projections") return !!document.getElementById("ev-sales-projections")?.querySelector("svg > g");
      if (hash === "#ev-sales-over-time") return !!document.getElementById("ev-sales-over-time")?.querySelector("svg > g");
      return !!document.getElementById("ev-sales-by-country")?.querySelector("svg > g");
    },
    data.length > 0 && salesData.length > 0
  );


  const worldRows = useMemo(() => data.filter((d) => d.region_country === "World"), [data]);
  const forecastBoundary = useEvForecastBoundary(data);

  const effectiveYear = useMemo(() => {
    if (hoveredYear !== null) return hoveredYear;
    const maxActual = worldRows.filter((d) => d.type === "Actual").reduce((max, d) => Math.max(max, d.year), 0);
    return maxActual || (isFinite(forecastBoundary) ? forecastBoundary - 1 : 2024);
  }, [hoveredYear, worldRows, forecastBoundary]);

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
        subtitle="Historical EV sales from 2010 across 50+ countries, with DS3 logistic S-curve projections through 2035"
        isDark={isDark}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">

        <ChartCard
          id="ev-sales-by-country"
          title="EV Sales Rankings"
          subtitle="Drag to see how rankings shift from 2010 to 2035. EU shown as a regional aggregate."
          isDark={isDark}
        >
          {salesData.length > 0 ? (
            <EvShareChart data={salesData} isDark={isDark} />
          ) : salesError ? (
            <ErrorMessage message={salesError} isDark={isDark} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </ChartCard>

        <ChartCard
          id="ev-sales-projections"
          title="EV Sales Projections"
          subtitle="Compare projected EV growth paths across markets — hover to see values for any year"
          delay={100}
          isDark={isDark}
        >
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
              DS3 logistic S-curve model fitted per country to IEA historical BEV sales data, projected through 2035 and constrained to 1.2–10× the observed peak. Historical rows are <em>Actual</em> type; projections are <em>Forecast</em> type. Solid lines show recorded sales; dashed lines show S-curve projections. Uzbekistan is excluded (fewer than 3 data points to fit).
            </p>
          </div>
        </ChartCard>

        <ChartCard
          id="ev-sales-over-time"
          title="EV Sales Over Time"
          subtitle="Pick a country to see its EV sales history and projected growth through 2035"
          delay={200}
          isDark={isDark}
        >
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
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-white/70" : "bg-slate-200"}`}>
                    ((latest ÷ first)^(1 ÷ years) − 1) × 100
                  </span>
                  . It smooths year-to-year swings, so a market that grew slowly then spiked will show a lower rate than the spike alone suggests.
                </p>
              </div>
              <div>
                <h4 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Peak Year &amp; 2030 Forecast</h4>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-600"}`}>
                  Peak Year excludes projected years — it is based on actual recorded sales only. The 2030 Forecast comes from DS3's logistic S-curve model, fitted to each country's IEA historical data and projected through 2035.
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
