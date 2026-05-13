"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEnergyAccess } from "@/lib/data";
import type { EnergyAccessRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const BurdenVsPriceChart = dynamic(() => import("@/components/charts/BurdenVsPriceChart"), { ssr: false });

export default function AffordabilityPage() {
  const [data, setData] = useState<EnergyAccessRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEnergyAccess().then(setData).catch((err) => { console.error(err); setError("Failed to load data."); }); }, []);

  const filtered = useMemo(
    () => data.filter((d) => d.energy_burden_pct > 0 && d.avg_price_cents_kwh > 0),
    [data]
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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {filtered.length > 0 ? (
            <BurdenVsPriceChart data={filtered} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <LoadingPlaceholder />
          )}
        </div>
      </div>
    </>
  );
}
