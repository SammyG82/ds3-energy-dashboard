"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEvSales } from "@/lib/data";
import type { EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const EvShareChart = dynamic(() => import("@/components/charts/EvShareChart"), { ssr: false });
const EvTrendChart = dynamic(() => import("@/components/charts/EvTrendChart"), { ssr: false });

export default function EvSharePage() {
  const [data, setData] = useState<EvRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEvSales().then(setData).catch((err) => { console.error(err); setError("Failed to load data."); }); }, []);

  return (
    <>
      <PageHeader
        eyebrow="EV Sales · Rankings"
        title="EV Share"
        titleAccent="Explorer"
        subtitle="Interactive ranking of EV sales by country and year, plus single-country sales trends with S-curve forecasts through 2035."
        badges={[
          { label: "IEA Source", color: "teal" },
          { label: "2010–2035", color: "blue" },
          { label: "50+ Countries", color: "amber" },
        ]}
      />
      {error && (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-6">
          <ErrorMessage message={error} />
        </div>
      )}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-6">

        {/* Rankings bar chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">Rankings</p>
            <h2 className="text-lg font-bold text-slate-900">EV Sales by Country</h2>
            <p className="text-sm text-slate-500">Top countries ranked by annual EV sales — select a year</p>
          </div>
          {data.length > 0 ? (
            <EvShareChart data={data} />
          ) : !error ? (
            <LoadingPlaceholder text="Loading data…" />
          ) : null}
        </div>

        {/* Single-country trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">Country Trend</p>
            <h2 className="text-lg font-bold text-slate-900">EV Sales Over Time</h2>
            <p className="text-sm text-slate-500">Single-country sales trajectory with S-curve forecast through 2035</p>
          </div>
          {data.length > 0 ? (
            <EvTrendChart data={data} />
          ) : !error ? (
            <LoadingPlaceholder text="Loading data…" />
          ) : null}
        </div>

      </div>
    </>
  );
}
