"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { fetchTargets } from "@/lib/data";
import type { TargetRow } from "@/lib/data";

const CapacityChart = dynamic(() => import("@/components/charts/CapacityChart"), { ssr: false });

export default function GlobalTargetsPage() {
  const [data, setData] = useState<TargetRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchTargets().then(setData).catch(() => setError("Failed to load data.")); }, []);

  const top15 = useMemo(
    () => [...data].sort((a, b) => b.capacity_target_gw - a.capacity_target_gw).slice(0, 15),
    [data]
  );
  const totalGW = top15.reduce((s, d) => s + d.capacity_target_gw, 0);
  const top = top15[0];

  return (
    <>
      <PageHeader
        eyebrow="Renewable Energy · 2030 Targets"
        title="Global Renewable"
        titleAccent="Targets"
        subtitle="Top 15 countries by 2030 renewable energy capacity targets (GW), sourced from Ember's global renewable energy database."
        badges={[
          { label: "Ember Source", color: "teal" },
          { label: "88 Countries", color: "blue" },
          { label: "2030 Target Year", color: "amber" },
        ]}
      />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Shown" value={top15.length ? top15.length.toString() : "—"} accent="blue" />
          <StatCard label="Total Target" value={top15.length ? totalGW.toFixed(0) + " GW" : "—"} accent="teal" />
          <StatCard label="Highest Target" value={top ? top.country_code : "—"} accent="amber" />
          <StatCard label="Target Year" value="2030" accent="blue" />
        </div>

        {error && <p className="text-sm text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{error}</p>}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Top 15 Countries by Capacity Target (GW)</h2>
          <p className="text-sm text-slate-500 mb-4">Renewable energy generation capacity committed for 2030</p>
          {data.length > 0 ? (
            <CapacityChart data={data} />
          ) : !error ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading…</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
