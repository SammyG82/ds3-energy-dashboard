"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { fetchEvData, fmtEvSales, dn } from "@/lib/data";
import type { EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const EvForecastChart = dynamic(() => import("@/components/charts/EvForecastChart"), { ssr: false });

const AGGREGATES = new Set(["World", "Rest of the world", "Central and South America"]);

export default function EvForecastPage() {
  const [data, setData] = useState<EvRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  useEffect(() => { fetchEvData().then(setData).catch((err) => { console.error(err); setError("Failed to load data."); }); }, []);

  const worldRows = useMemo(() => data.filter((d) => d.region_country === "World"), [data]);
  const forecastBoundary = useMemo(() => data.find((d) => d.type === "Forecast")?.year ?? 2025, [data]);

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
    <>
      <PageHeader
        title="EV Sales"
        titleAccent="Forecast"
        subtitle="Logistic S-curve projections of EV sales by region through 2035. Select multiple regions to compare trajectories. Solid lines = actual, dashed = forecast."
        badges={[
          { label: "S-Curve Model", color: "teal" },
          { label: "Multi-Region", color: "blue" },
          { label: "2035 Horizon", color: "amber" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label={`${isProjected ? "Projected " : ""}Global EV Sales (${effectiveYear})`} value={globalSales !== null ? fmtEvSales(globalSales) : "—"} accent="teal" />
          <StatCard label={`${isProjected ? "Projected " : ""}YoY Growth (${effectiveYear - 1}→${effectiveYear})`} value={yoyGrowth !== null ? `${yoyGrowth >= 0 ? "+" : ""}${yoyGrowth.toFixed(1)}%` : "—"} accent="amber" />
          <StatCard label={`${isProjected ? "Projected " : ""}Market Leader (${effectiveYear})`} value={marketLeader !== null ? dn(marketLeader) : "—"} accent="blue" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {data.length > 0 ? (
            <EvForecastChart data={data} onYearChange={setHoveredYear} onSelectionChange={setSelectedRegions} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>
      </div>
    </>
  );
}
