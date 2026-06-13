"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { useTheme } from "@/lib/theme-context";
import { fetchEvData, fetchGdpMeta, fetchOilPrices, fetchOilForecast, fetchNetTrade, fetchOilExports } from "@/lib/data";
import type { EvRow, GdpMeta, OilPriceRow, OilRow } from "@/lib/data";
import type { PresetItem } from "@/components/ui/RegionPicker";
import { OIL_IMPORT_PRESETS } from "@/lib/oil-presets";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";
import FadeIn from "@/components/ui/FadeIn";
import BehindTheNumbers from "@/components/ui/BehindTheNumbers";
import { useDataFetch, useHashScroll, useOilForecastBoundary } from "@/lib/ui-utils";
import ChartLoader from "@/components/ui/ChartLoader";

const EvGdpImpactCharts = dynamic(() => import("@/components/charts/EvGdpImpactCharts"), { ssr: false, loading: ChartLoader });
const OilForecastChart  = dynamic(() => import("@/components/charts/OilForecastChart"),  { ssr: false, loading: ChartLoader });

type Dataset = "imports" | "net_trade" | "exports";

const DATASET_PRESETS: Record<Dataset, PresetItem[]> = {
  imports: OIL_IMPORT_PRESETS,
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
      detail: "China, India, Japan, South Korea, and Singapore — the five major Asia-Pacific countries in the dataset. All are net importers except Singapore, which is a re-export hub.",
      regions: ["China", "India", "Japan", "Korea", "Singapore"],
    },
    {
      label: "Europe",
      description: "European countries in the net trade dataset",
      detail: "France, Germany, Norway, and Spain. Norway stands out as a major net exporter (North Sea oil), while France, Germany, and Spain are all significant net importers.",
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
      detail: "USA, Saudi Arabia, Russia, Canada, and UAE were the five largest oil exporters in 2023.",
      regions: ["USA", "Saudi Arabia", "Russia", "Canada", "UAE"],
    },
    {
      label: "Middle East",
      description: "Major Middle Eastern oil exporters",
      detail: "Saudi Arabia, UAE, Iraq, Kuwait, Qatar, and Iran — the six major Middle Eastern oil exporters in the dataset.",
      regions: ["Saudi Arabia", "UAE", "Iraq", "Kuwait", "Qatar", "Iran"],
    },
    {
      label: "Americas",
      description: "Western Hemisphere oil exporters",
      detail: "USA, Canada, Mexico, and Brazil — the four major oil exporters in the Western Hemisphere tracked in the dataset.",
      regions: ["USA", "Canada", "Mexico", "Brazil"],
    },
    {
      label: "All Countries",
      description: "All 20 countries in the exports dataset",
      detail: "All 20 major oil exporting nations in the IEA dataset — includes OPEC members, major non-OPEC producers, and regional re-export hubs.",
      regions: null,
    },
  ],
};

const DATASETS: { id: Dataset; label: string; description: string; chartLabel: "Oil Imports (KBD)" | "Net Trade (KBD)" | "Oil Exports (KBD)" }[] = [
  { id: "imports",   label: "Imports",   description: "Total oil import volumes (KBD)",                                chartLabel: "Oil Imports (KBD)" },
  { id: "net_trade", label: "Net Trade", description: "Exports minus imports — positive = net exporter (KBD)",         chartLabel: "Net Trade (KBD)"   },
  { id: "exports",   label: "Exports",   description: "Total oil export volumes (KBD)",                                chartLabel: "Oil Exports (KBD)" },
];

export default function EvGdpImpactClient() {
  const { isDark } = useTheme();

  const { data: evData,      error: evDataError }    = useDataFetch<EvRow[]>(fetchEvData, []);
  const { data: gdpMeta,     error: gdpMetaError }   = useDataFetch<GdpMeta[]>(fetchGdpMeta, []);
  const { data: oilPrices,   error: oilPricesError } = useDataFetch<OilPriceRow[]>(fetchOilPrices, []);
  const { data: imports,     error: importsError }   = useDataFetch<OilRow[]>(fetchOilForecast, []);
  const { data: netTrade,    error: netTradeError }  = useDataFetch<OilRow[]>(fetchNetTrade, []);
  const { data: exportsData, error: exportsError }   = useDataFetch<OilRow[]>(fetchOilExports, []);
  const [dataset, setDataset] = useState<Dataset>("imports");

  useHashScroll(
    (hash) => {
      const gdpDrawn = !!document.getElementById("ev-gdp-section")?.querySelector("svg > g");
      if (hash === "#oil-import-forecasts") return gdpDrawn && !!document.getElementById("oil-import-forecasts")?.querySelector("svg > g");
      return gdpDrawn;
    },
    (evData.length > 0 || !!evDataError) && (gdpMeta.length > 0 || !!gdpMetaError) && (oilPrices.length > 0 || !!oilPricesError) && (imports.length > 0 || !!importsError) && (netTrade.length > 0 || !!netTradeError) && (exportsData.length > 0 || !!exportsError)
  );

  const evReady    = evData.length > 0 && gdpMeta.length > 0;
  const anyEvError = evDataError || gdpMetaError;

  const active      = { imports, net_trade: netTrade, exports: exportsData }[dataset];
  const activeMeta  = DATASETS.find((d) => d.id === dataset) ?? DATASETS[0];
  const activeError = { imports: importsError, net_trade: netTradeError, exports: exportsError }[dataset];

  const oilForecastBoundary = useOilForecastBoundary(imports);
  const sharedStatYear = isFinite(oilForecastBoundary) ? oilForecastBoundary - 1 : 2023;

  return (
    <div className={`transition-colors duration-300 ${isDark ? "bg-black" : "bg-white"}`}>
      <PageHeader
        title="EV"
        titleAccent="Impact"
        subtitle="Model how EV adoption reduces oil import spending — and what those savings represent as a share of GDP"
        isDark={isDark}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-6">

        {/* GDP Impact chart */}
        <FadeIn>
          <section id="ev-gdp-section" className="scroll-mt-24" aria-label="GDP Impact">
            {evReady ? (
              <ErrorBoundary>
                <EvGdpImpactCharts evData={evData} gdpMeta={gdpMeta} oilPrices={oilPrices} oilPricesError={oilPricesError} isDark={isDark} />
              </ErrorBoundary>
            ) : anyEvError ? (
              <div className={`rounded-2xl p-6 border flex flex-col gap-2 ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                {evDataError  && <ErrorMessage message={evDataError}  isDark={isDark} />}
                {gdpMetaError && <ErrorMessage message={gdpMetaError} isDark={isDark} />}
              </div>
            ) : (
              <div className={`rounded-2xl p-6 border min-h-[300px] sm:min-h-[500px] ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <LoadingPlaceholder text="Loading data…" isDark={isDark} />
              </div>
            )}
          </section>
        </FadeIn>

        {/* Oil Explorer chart */}
        <FadeIn delay={100}>
          <section id="oil-import-forecasts" className={`rounded-2xl p-4 sm:p-6 flex flex-col gap-6 scroll-mt-24 border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`} aria-labelledby="oil-explorer-heading">

            <div>
              <h2 id="oil-explorer-heading" className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>Oil Explorer</h2>
              <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>Recorded oil trade volumes through 2023, with modeled forecasts and uncertainty bands through 2030</p>
            </div>

            <div className="flex flex-col gap-2">
              <p id="oil-dataset-label" className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Dataset</p>
              <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="oil-dataset-label">
                {DATASETS.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setDataset(d.id)}
                    aria-pressed={dataset === d.id}
                    className={`text-sm font-semibold px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 ${isDark ? "focus:ring-white" : "focus:ring-slate-500"} ${
                      dataset === d.id
                        ? isDark ? "bg-white text-black border-white" : "bg-slate-900 text-white border-slate-900"
                        : isDark
                        ? "bg-white/10 text-white/70 border-white/10 hover:border-white/30"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>{activeMeta.description}</p>
            </div>

            <div className={`rounded-2xl p-4 sm:p-6 border ${isDark ? "bg-white/10 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
              {active.length > 0 ? (
                <ErrorBoundary>
                  <OilForecastChart key={dataset} data={active} datasetLabel={activeMeta.chartLabel} chartPresets={DATASET_PRESETS[dataset]} statYear={sharedStatYear} isDark={isDark} />
                </ErrorBoundary>
              ) : activeError ? (
                <ErrorMessage message={activeError} isDark={isDark} />
              ) : (
                <LoadingPlaceholder text="Loading data…" isDark={isDark} />
              )}
            </div>

            <BehindTheNumbers isDark={isDark}>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Log-ARIMA forecast</h4>
              <p className={`text-sm ${isDark ? "text-white/70" : "text-black/70"}`}>
                Forecasts are produced by a Log-ARIMA model fitted separately for each country. The model parameters (p, d, q) are selected by minimising AIC across a grid search. The shaded band around each forecast line is a 95% confidence interval — wider bands mean the model is less certain about that country&apos;s trajectory. Bands are capped at ±150% of the point forecast to keep the chart readable; for volatile series the true statistical interval may extend further.
              </p>
            </BehindTheNumbers>

          </section>
        </FadeIn>

      </div>
    </div>
  );
}
