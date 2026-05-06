"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { fetchEnergyAccess } from "@/lib/data";

const ReliabilityChart = dynamic(() => import("@/components/charts/ReliabilityChart"), { ssr: false });
const EnergyBurdenChart = dynamic(() => import("@/components/charts/EnergyBurdenChart"), { ssr: false });

export default function EnergyAccessPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchEnergyAccess>>>([]);

  useEffect(() => { fetchEnergyAccess().then(setData); }, []);

  const avgSaidi = data.length ? data.reduce((s, d) => s + d.saidi, 0) / data.length : 0;
  const avgBurden = data.length ? data.reduce((s, d) => s + d.energy_burden_pct, 0) / data.length : 0;

  return (
    <>
      <PageHeader
        eyebrow="Energy Access · US States"
        title="Grid Reliability &"
        titleAccent="Energy Access"
        subtitle="US state-level grid reliability (SAIDI/SAIFI) and energy burden metrics for 2024. Color thresholds show good, fair, and poor performance."
        badges={[
          { label: "EIA Source", color: "teal" },
          { label: "US States 2024", color: "blue" },
          { label: "SAIDI · SAIFI", color: "amber" },
        ]}
      />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="States" value={data.length.toString()} accent="blue" />
          <StatCard label="Avg SAIDI" value={avgSaidi.toFixed(0) + " min"} accent="amber" />
          <StatCard label="Avg Burden" value={avgBurden.toFixed(2) + "%"} accent="teal" />
          <StatCard label="Year" value="2024" accent="blue" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Grid Reliability (SAIDI)</h2>
          <p className="text-sm text-slate-500 mb-4">Minutes of outage per customer per year</p>
          {data.length > 0 ? (
            <ReliabilityChart data={data} />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading…</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Energy Burden by State</h2>
          <p className="text-sm text-slate-500 mb-4">Annual electricity bill as % of household income</p>
          {data.length > 0 ? (
            <EnergyBurdenChart data={data} />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading…</div>
          )}
        </div>
      </div>
    </>
  );
}
