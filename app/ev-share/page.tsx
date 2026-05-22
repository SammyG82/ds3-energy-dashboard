"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import MethodologySection from "@/components/ui/MethodologySection";
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
        title="EV Share"
        titleAccent="Explorer"
        subtitle="Interactive ranking of EV sales by country and year, plus single-country sales trends with IEA STEPS projections through 2035."
        badges={[
          { label: "IEA Source", color: "teal" },
          { label: "2010–2035", color: "blue" },
          { label: "50+ Countries", color: "amber" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-6">

        {/* Rankings bar chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">Rankings</p>
            <h2 className="text-lg font-bold text-slate-900">EV Sales by Country</h2>
            <p className="text-sm text-slate-500">Top countries ranked by annual EV sales — select a year</p>
          </div>
          {data.length > 0 ? (
            <EvShareChart data={data} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>

        {/* Single-country trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">Country Trend</p>
            <h2 className="text-lg font-bold text-slate-900">EV Sales Over Time</h2>
            <p className="text-sm text-slate-500">Single-country sales trajectory with IEA STEPS projection through 2035</p>
          </div>
          {data.length > 0 ? (
            <EvTrendChart data={data} />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>

        <MethodologySection cols={2} items={[
          {
            label: "Annual Growth Rate",
            body: (<>
              Compound annual growth rate (CAGR) from the first year with recorded sales to the most recent historical year.
              {" "}Formula:{" "}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                {"((latest ÷ first)^(1 ÷ years) − 1) × 100"}
              </span>
              . It smooths year-to-year swings, so a market that grew slowly then spiked will show a lower rate than the spike alone suggests.
            </>),
          },
          {
            label: "Peak Year & 2030 Forecast",
            body: `Peak Year excludes projected years — it is based on actual recorded sales only. The 2030 Forecast comes from the IEA's Stated Policies Scenario (STEPS) in the Global EV Outlook 2024, modelling adoption under currently enacted policies.`,
          },
        ]} />

      </div>
    </>
  );
}
