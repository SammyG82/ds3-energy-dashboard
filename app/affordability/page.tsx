"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEnergyAccess } from "@/lib/data";

const BurdenVsPriceChart = dynamic(() => import("@/components/charts/BurdenVsPriceChart"), { ssr: false });

export default function AffordabilityPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchEnergyAccess>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEnergyAccess().then(setData).catch(() => setError("Failed to load data.")); }, []);

  const filtered = data.filter(
    (d) => d.energy_burden_pct > 0 && d.avg_price_cents_kwh > 0
  );

  return (
    <>
      <PageHeader
        eyebrow="Affordability · Price vs Burden"
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
          {error ? (
            <p className="text-sm text-red-500 font-mono">{error}</p>
          ) : !data.length ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading…</div>
          ) : (
            <BurdenVsPriceChart data={filtered} />
          )}
        </div>
      </div>
    </>
  );
}
