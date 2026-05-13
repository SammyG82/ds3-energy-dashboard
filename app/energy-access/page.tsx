"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { fetchEnergyAccess } from "@/lib/data";
import type { EnergyAccessRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const ReliabilityChart = dynamic(() => import("@/components/charts/ReliabilityChart"), { ssr: false });
const EnergyBurdenChart = dynamic(() => import("@/components/charts/EnergyBurdenChart"), { ssr: false });

export default function EnergyAccessPage() {
  const [data, setData] = useState<EnergyAccessRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEnergyAccess().then(setData).catch((err) => { console.error(err); setError("Failed to load data."); }); }, []);

  const avgSaidi = useMemo(() => {
    if (!data.length) return 0;
    const totalCustomers = data.reduce((s, d) => s + (d.avg_customers ?? 1), 0);
    return data.reduce((s, d) => s + d.saidi * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [data]);
  const avgBurden = useMemo(() => {
    if (!data.length) return 0;
    const totalCustomers = data.reduce((s, d) => s + (d.avg_customers ?? 1), 0);
    return data.reduce((s, d) => s + d.energy_burden_pct * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [data]);

  return (
    <>
      <PageHeader
        title="Grid Reliability &"
        titleAccent="Energy Access"
        subtitle="US state-level grid reliability (SAIDI/SAIFI) and energy burden metrics for 2024. Color thresholds show good, fair, and poor performance."
        badges={[
          { label: "EIA Source", color: "teal" },
          { label: "US States 2024", color: "blue" },
          { label: "SAIDI · SAIFI", color: "amber" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="States" value={data.length ? data.length.toString() : "—"} accent="blue" />
          <StatCard label="Avg Outage Time" value={data.length ? avgSaidi.toFixed(0) + " min" : "—"} accent="amber" />
          <StatCard label="Avg Burden" value={data.length ? avgBurden.toFixed(2) + "%" : "—"} accent="teal" />
          <StatCard label="Year" value="2024" accent="blue" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Grid Reliability (SAIDI)</h2>
          <p className="text-sm text-slate-500 mb-4">Minutes of outage per customer per year</p>
          {data.length > 0 ? (
            <ReliabilityChart data={data} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Energy Burden by State</h2>
          <p className="text-sm text-slate-500 mb-4">Annual electricity bill as % of household income</p>
          {data.length > 0 ? (
            <EnergyBurdenChart data={data} />
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
