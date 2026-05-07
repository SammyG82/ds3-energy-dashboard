"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchOilForecast, fetchNetTrade, fetchOilExports } from "@/lib/data";
import type { OilRow } from "@/lib/data";
import type { PresetItem } from "@/components/ui/RegionPicker";

const OilForecastChart = dynamic(() => import("@/components/charts/OilForecastChart"), { ssr: false });

type Dataset = "imports" | "net_trade" | "exports";

const DATASET_PRESETS: Record<Dataset, PresetItem[]> = {
  imports: [
    {
      label: "Top 5 Importers",
      description: "The five largest end-consumer oil importers",
      detail: "China, India, USA, Japan, and South Korea are the five largest oil importers by domestic consumption. Singapore and the Netherlands import more by volume but are re-export hubs — their figures don't reflect domestic demand.",
      regions: ["China", "India", "USA", "Japan", "Korea"],
    },
    {
      label: "Asia Pacific",
      description: "Major oil importers in the Asia-Pacific region",
      detail: "China, India, Japan, South Korea, Australia, and Singapore account for the majority of Asia-Pacific oil import demand. This region is where EV adoption growth is most consequential for global oil markets.",
      regions: ["China", "India", "Japan", "Korea", "Australia", "Singapore"],
    },
    {
      label: "All Countries",
      description: "All 10 countries in the imports dataset",
      detail: "All 10 major oil importing nations tracked in the IEA dataset.",
      regions: null,
    },
  ],
  net_trade: [
    {
      label: "Top 5 Net Importers",
      description: "Countries that import far more oil than they export",
      detail: "China, India, Japan, South Korea, and Germany are the five biggest net oil importers in 2023. These are the countries where EV adoption could most significantly reduce oil dependency.",
      regions: ["China", "India", "Japan", "Korea", "Germany"],
    },
    {
      label: "Top 5 Net Exporters",
      description: "Countries that export far more oil than they import",
      detail: "Saudi Arabia, Russia, Canada, Iraq, and UAE are the five biggest net oil exporters in 2023. Their net trade values are positive — they produce and export more than they consume domestically.",
      regions: ["Saudi Arabia", "Russia", "Canada", "Iraq", "UAE"],
    },
    {
      label: "Asia Pacific",
      description: "Major Asian oil importers and re-export hubs",
      detail: "China, India, Japan, South Korea, and Singapore — the five major Asia-Pacific countries in the dataset. All are net importers except Singapore, which is a re-export hub. This region is where EV adoption growth has the largest potential impact on global oil demand.",
      regions: ["China", "India", "Japan", "Korea", "Singapore"],
    },
    {
      label: "Europe",
      description: "European countries in the net trade dataset",
      detail: "France, Germany, Norway, and Spain — the four European countries in the dataset. Norway stands out as a major net exporter (North Sea oil), while France, Germany, and Spain are all significant net importers.",
      regions: ["France", "Germany", "Norway", "Spain"],
    },
    {
      label: "All Countries",
      description: "All 20 countries in the net trade dataset",
      detail: "All 20 countries tracked across net trade — includes both net importers (negative values) and net exporters (positive values).",
      regions: null,
    },
  ],
  exports: [
    {
      label: "Top 5 Exporters",
      description: "The five largest oil exporters by 2023 volume",
      detail: "USA, Saudi Arabia, Russia, Canada, and UAE were the five largest oil exporters in 2023. The USA leads partly due to shale oil production; Saudi Arabia and Russia are the dominant OPEC and non-OPEC producers.",
      regions: ["USA", "Saudi Arabia", "Russia", "Canada", "UAE"],
    },
    {
      label: "Middle East",
      description: "Major Middle Eastern oil exporters",
      detail: "Saudi Arabia, UAE, Iraq, Kuwait, Qatar, and Iran — the six major Middle Eastern oil exporters in the dataset. This region holds the majority of the world's proven oil reserves and is most exposed to long-term demand decline from EV adoption.",
      regions: ["Saudi Arabia", "UAE", "Iraq", "Kuwait", "Qatar", "Iran"],
    },
    {
      label: "Americas",
      description: "Western Hemisphere oil exporters",
      detail: "USA, Canada, Mexico, and Venezuela — the four major oil exporters in the Western Hemisphere. The USA and Canada are the dominant non-OPEC producers; Venezuela holds some of the world's largest proven reserves but output has declined sharply.",
      regions: ["USA", "Canada", "Mexico", "Venezuela"],
    },
    {
      label: "Africa",
      description: "Major African oil exporters",
      detail: "Nigeria, Algeria, Libya, and Angola are the four largest African oil exporters in the dataset. All four are OPEC members. Nigeria is Sub-Saharan Africa's largest producer; Algeria and Libya dominate North African output.",
      regions: ["Nigeria", "Algeria", "Libya", "Angola"],
    },
    {
      label: "All Countries",
      description: "All 20 countries in the exports dataset",
      detail: "All 20 major oil exporting nations tracked in the IEA dataset — includes OPEC members, non-OPEC producers, and re-export hubs.",
      regions: null,
    },
  ],
};

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
  const [errors, setErrors] = useState<Record<Dataset, string | null>>({
    imports: null, net_trade: null, exports: null,
  });

  useEffect(() => {
    fetchOilForecast().then(setImports).catch(() => setErrors((e) => ({ ...e, imports: "Failed to load oil imports data." })));
    fetchNetTrade().then(setNetTrade).catch(() => setErrors((e) => ({ ...e, net_trade: "Failed to load net trade data." })));
    fetchOilExports().then(setExports).catch(() => setErrors((e) => ({ ...e, exports: "Failed to load exports data." })));
  }, []);

  const active = dataset === "imports" ? imports : dataset === "net_trade" ? netTrade : exports;
  const activeMeta = DATASETS.find((d) => d.id === dataset)!;
  const activeError = errors[dataset];

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
      {activeError && (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-6">
          <p className="text-sm text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-4 py-3">{activeError}</p>
        </div>
      )}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-6">

        {/* Dataset toggle */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Dataset</p>
          <div className="flex gap-2 flex-wrap">
            {DATASETS.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDataset(d.id)}
                aria-pressed={dataset === d.id}
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
            <OilForecastChart data={active} datasetLabel={activeMeta.chartLabel} chartPresets={DATASET_PRESETS[dataset]} />
          ) : !activeError ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading data…</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
