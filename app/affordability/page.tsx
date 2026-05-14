"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { fetchEnergyAccess } from "@/lib/data";
import type { EnergyAccessRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";
import { STATE_NAMES } from "@/lib/ui-utils";

const BurdenVsPriceChart = dynamic(() => import("@/components/charts/BurdenVsPriceChart"), { ssr: false });

export default function AffordabilityPage() {
  const [data, setData] = useState<EnergyAccessRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEnergyAccess().then(setData).catch((err) => { console.error(err); setError("Failed to load data."); }); }, []);

  const filtered = useMemo(
    () => data.filter((d) => d.energy_burden_pct > 0 && d.avg_price_cents_kwh > 0),
    [data]
  );

  const totalCustomers = useMemo(
    () => filtered.reduce((s, d) => s + (d.avg_customers ?? 1), 0),
    [filtered]
  );

  const avgAnnualBill = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((s, d) => s + (d.est_annual_bill ?? 0) * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [filtered, totalCustomers]);

  const avgBurden = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((s, d) => s + d.energy_burden_pct * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [filtered, totalCustomers]);

  const aboveAvgBurdenCount = useMemo(
    () => avgBurden !== null ? filtered.filter((d) => d.energy_burden_pct > avgBurden).length : 0,
    [filtered, avgBurden]
  );

  const highestBurdenState = useMemo(
    () => filtered.reduce<EnergyAccessRow | null>((best, d) => (!best || d.energy_burden_pct > best.energy_burden_pct) ? d : best, null),
    [filtered]
  );

  return (
    <>
      <PageHeader
        title="Energy"
        titleAccent="Affordability"
        subtitle="Scatter plot of electricity price vs. energy burden by US state (2024). Color represents household income level — green = high income, red = low. Bubble size = customer count."
        badges={[
          { label: "EIA Source", color: "teal" },
          { label: "US States 2024", color: "blue" },
          { label: "Income Quartile", color: "amber" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Avg Annual Bill" value={avgAnnualBill !== null ? `$${Math.round(avgAnnualBill).toLocaleString()}` : "—"} accent="amber" />
          <StatCard label="States Above Avg Burden" value={aboveAvgBurdenCount > 0 ? `${aboveAvgBurdenCount} of ${filtered.length}` : "—"} accent="teal" />
          <StatCard label="Highest Burden State" value={highestBurdenState ? `${STATE_NAMES[highestBurdenState.state] ?? highestBurdenState.state} (${highestBurdenState.energy_burden_pct.toFixed(1)}%)` : "—"} accent="blue" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {filtered.length > 0 ? (
            <BurdenVsPriceChart data={filtered} />
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
