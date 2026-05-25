"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import MethodologySection from "@/components/ui/MethodologySection";
import { fetchEnergyAccess } from "@/lib/data";
import type { EnergyAccessRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";
import { useDataFetch } from "@/lib/ui-utils";

const ReliabilityChart = dynamic(() => import("@/components/charts/ReliabilityChart"), { ssr: false });
const EnergyBurdenChart = dynamic(() => import("@/components/charts/EnergyBurdenChart"), { ssr: false });

export default function EnergyAccessPage() {
  const { data, error } = useDataFetch<EnergyAccessRow[]>(fetchEnergyAccess, []);

  const totalCustomers = useMemo(
    () => data.reduce((s, d) => s + (d.avg_customers ?? 1), 0),
    [data]
  );
  const avgSaidi = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((s, d) => s + d.saidi * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [data, totalCustomers]);
  const avgBurden = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((s, d) => s + d.energy_burden_pct * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [data, totalCustomers]);
  const avgPrice = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((s, d) => s + d.avg_price_cents_kwh * (d.avg_customers ?? 1), 0) / totalCustomers;
  }, [data, totalCustomers]);

  return (
    <>
      <PageHeader
        title="Grid Reliability &"
        titleAccent="Energy Access"
        subtitle="US state-level grid reliability (SAIDI) and energy burden metrics for 2024. Color thresholds show good, fair, and poor performance."
        badges={[
          { label: "EIA Source", color: "teal" },
          { label: "US States 2024", color: "blue" },
          { label: "SAIDI", color: "amber" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Avg Outage Time" value={data.length ? avgSaidi.toFixed(0) + " min/year" : "—"} accent="amber" />
          <StatCard label="Avg Burden" value={data.length ? avgBurden.toFixed(2) + "%" : "—"} accent="teal" />
          <StatCard label="Avg Price" value={data.length ? avgPrice.toFixed(1) + " ¢/kWh" : "—"} accent="blue" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Grid Reliability (SAIDI)</h2>
          <p className="text-sm text-slate-500 mb-4">Minutes of outage per customer per year</p>
          {data.length > 0 ? (
            <ReliabilityChart data={data} natAvgSaidi={avgSaidi} />
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
            <EnergyBurdenChart data={data} natAvgBurden={avgBurden} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>

        <MethodologySection items={[
          {
            label: "SAIDI",
            body: "System Average Interruption Duration Index — total minutes of electricity outage per customer per year. Thresholds: Good = under 100 min, Fair = 100–200 min, Poor = over 200 min.",
          },
          {
            label: "Energy Burden",
            body: "Energy burden is the share of household income spent on electricity. Thresholds used in this chart: Low = under 2.0%, Moderate = 2.0–2.5%, High = 2.5% or above. These match the EIA's state-level reporting conventions — the US national average is approximately 2%.",
          },
          {
            label: "Customer-Weighted Averages",
            body: "All three national average stat cards use customer-weighted means — each state's value is weighted by its number of electricity customers, not treated equally.",
          },
        ]} />
      </div>
    </>
  );
}
