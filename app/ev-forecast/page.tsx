"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEvData } from "@/lib/data";
import type { EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const EvForecastChart = dynamic(() => import("@/components/charts/EvForecastChart"), { ssr: false });

export default function EvForecastPage() {
  const [data, setData] = useState<EvRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEvData().then(setData).catch((err) => { console.error(err); setError("Failed to load data."); }); }, []);

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
          <ErrorMessage message={error} />
        </div>
      )}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {data.length > 0 ? (
            <EvForecastChart data={data} />
          ) : !error ? (
            <LoadingPlaceholder text="Loading data…" />
          ) : null}
        </div>
      </div>
    </>
  );
}
