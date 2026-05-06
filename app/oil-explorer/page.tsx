"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchOilForecast, fetchNetTrade, fetchOilExports } from "@/lib/data";
import type { OilRow } from "@/components/charts/OilForecastChart";

const OilForecastChart = dynamic(() => import("@/components/charts/OilForecastChart"), { ssr: false });

type Dataset = "imports" | "net_trade" | "exports";

const DATASETS: { id: Dataset; label: string; description: string; chartLabel: string }[] = [
  { id: "imports", label: "Imports", description: "Total oil import volumes (kb/d)", chartLabel: "Oil Imports (KBD)" },
  { id: "net_trade", label: "Net Trade", description: "Imports minus exports — negative = net exporter (kb/d)", chartLabel: "Net Trade (KBD)" },
  { id: "exports", label: "Exports", description: "Total oil export volumes (kb/d)", chartLabel: "Oil Exports (KBD)" },
];

export default function OilExplorerPage() {
  const [imports, setImports] = useState<OilRow[]>([]);
  const [netTrade, setNetTrade] = useState<OilRow[]>([]);
  const [exports, setExports] = useState<OilRow[]>([]);
  const [dataset, setDataset] = useState<Dataset>("imports");

  useEffect(() => {
    fetchOilForecast().then(setImports);
    fetchNetTrade().then(setNetTrade);
    fetchOilExports().then(setExports);
  }, []);

  const active = dataset === "imports" ? imports : dataset === "net_trade" ? netTrade : exports;
  const activeMeta = DATASETS.find((d) => d.id === dataset)!;

  return (
    <>
      <PageHeader
        eyebrow="Oil Trade · ARIMA Forecast"
        title="Oil Trade"
        titleAccent="Explorer"
        subtitle="Historical oil trade volumes (kb/d) with Log-ARIMA model forecasts and 95% confidence intervals through 2030. Toggle countries and datasets to compare."
        badges={[
          { label: "Log-ARIMA", color: "teal" },
          { label: "95% CI Bands", color: "blue" },
          { label: "2030 Forecast", color: "amber" },
        ]}
      />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-6">

        {/* Dataset toggle */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Dataset</p>
          <div className="flex gap-2 flex-wrap">
            {DATASETS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDataset(d.id)}
                className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
                  dataset === d.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">{activeMeta.description}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {active.length > 0 ? (
            <OilForecastChart data={active} datasetLabel={activeMeta.chartLabel} />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">
              Loading data…
            </div>
          )}
        </div>
      </div>
    </>
  );
}
