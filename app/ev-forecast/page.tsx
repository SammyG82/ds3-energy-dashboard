"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEvData } from "@/lib/data";
import type { EvRow } from "@/lib/data";

const EvForecastChart = dynamic(() => import("@/components/charts/EvForecastChart"), { ssr: false });

export default function EvForecastPage() {
  const [data, setData] = useState<EvRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEvData().then(setData).catch(() => setError("Failed to load data.")); }, []);

  return (
    <>
      <PageHeader
        eyebrow="EV Adoption · Projections"
        title="EV Sales"
        titleAccent="Forecast"
        subtitle="Logistic S-curve projections of EV sales by region through 2035. Select multiple regions to compare trajectories. Solid lines = actual, dashed = forecast."
        badges={[
          { label: "S-Curve Model", color: "teal" },
          { label: "Multi-Region", color: "blue" },
          { label: "2035 Horizon", color: "amber" },
        ]}
      />
      {error && (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-6">
          <p className="text-sm text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        </div>
      )}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {data.length > 0 ? (
            <EvForecastChart data={data} />
          ) : !error ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading data…</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
