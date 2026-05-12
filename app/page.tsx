"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchEvSales, fetchEvData, fetchOilForecast } from "@/lib/data";
import type { OilRow, EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const EvShareChart = dynamic(() => import("@/components/charts/EvShareChart"), { ssr: false });
const EvForecastChart = dynamic(() => import("@/components/charts/EvForecastChart"), { ssr: false });
const OilForecastChart = dynamic(() => import("@/components/charts/OilForecastChart"), { ssr: false });

const stats = [
  { value: "~18%", label: "Global EV new-car share", accent: "text-blue-600" },
  { value: "↓2.4 Mb/d", label: "Oil displaced by EVs (2023)", accent: "text-teal-600" },
  { value: "50+", label: "Countries in dataset", accent: "text-amber-600" },
  { value: "2010–2035", label: "Data time span", accent: "text-blue-600" },
];

const pillars = [
  {
    title: "EV Growth",
    body: "Track EV adoption across 50+ countries from 2010 to 2035 using IEA historical data and logistic S-curve projections.",
  },
  {
    title: "Oil Import Pressure",
    body: "Analyze how rising EV adoption correlates with declining oil import volumes in oil-importing countries, controlling for GDP growth.",
  },
  {
    title: "Infrastructure Dividend",
    body: "Estimate cost savings from displaced oil barrels and model how those savings could fund clean energy grid infrastructure per capita.",
  },
  {
    title: "Caveats",
    body: "Oil demand is shaped by industry, heating, and shipping — not just cars. This analysis focuses on light-vehicle transport fuel and is indicative, not causal.",
  },
];

export default function LandingPage() {
  const [evSales, setEvSales] = useState<EvRow[]>([]);
  const [evData, setEvData] = useState<EvRow[]>([]);
  const [oilData, setOilData] = useState<OilRow[]>([]);
  const [errors, setErrors] = useState<{ evSales: string | null; evData: string | null; oilData: string | null }>({
    evSales: null, evData: null, oilData: null,
  });

  useEffect(() => {
    fetchEvSales().then(setEvSales).catch((err) => { console.error(err); setErrors((e) => ({ ...e, evSales: "Failed to load EV sales data." })); });
    fetchEvData().then(setEvData).catch((err) => { console.error(err); setErrors((e) => ({ ...e, evData: "Failed to load EV forecast data." })); });
    fetchOilForecast().then(setOilData).catch((err) => { console.error(err); setErrors((e) => ({ ...e, oilData: "Failed to load oil forecast data." })); });
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-16 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-teal-600 mb-3">
            DS3 · UCSD Data Science Student Society
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            EV Adoption &amp;{" "}
            <span className="text-teal-600">Oil Dependency</span>
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-base leading-relaxed mb-10">
            Does rising electric vehicle adoption measurably reduce oil dependency in oil-importing
            countries — and how could the resulting savings fund clean energy infrastructure?
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map(({ value, label, accent }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className={`text-2xl font-bold ${accent}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview charts */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-8 py-12 flex flex-col gap-10">

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">Explorer</p>
              <h2 className="text-xl font-bold text-slate-900">EV Share by Country</h2>
              <p className="text-sm text-slate-500">Top 10 EV sales countries — select a year</p>
            </div>
            <Link href="/ev-share/" className="text-sm font-semibold text-blue-600 hover:underline">
              Full Explorer →
            </Link>
          </div>
          {evSales.length > 0 ? (
            <EvShareChart data={evSales} preview />
          ) : errors.evSales ? (
            <ErrorMessage message={errors.evSales} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">Forecast</p>
              <h2 className="text-xl font-bold text-slate-900">EV Sales Trajectory <span className="text-slate-400 font-normal text-base">(Top 5 Markets)</span></h2>
              <p className="text-sm text-slate-500">Logistic S-curve projections through 2035</p>
            </div>
            <Link href="/ev-forecast/" className="text-sm font-semibold text-blue-600 hover:underline">
              Full Forecast →
            </Link>
          </div>
          {evData.length > 0 ? (
            <EvForecastChart data={evData} preview />
          ) : errors.evData ? (
            <ErrorMessage message={errors.evData} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-0.5">ARIMA Model</p>
              <h2 className="text-xl font-bold text-slate-900">Oil Import Forecasts <span className="text-slate-400 font-normal text-base">(Top 5 Importers)</span></h2>
              <p className="text-sm text-slate-500">Top importers with 95% CI bands through 2030</p>
            </div>
            <Link href="/oil-explorer/" className="text-sm font-semibold text-blue-600 hover:underline">
              Full Explorer →
            </Link>
          </div>
          {oilData.length > 0 ? (
            <OilForecastChart data={oilData} preview />
          ) : errors.oilData ? (
            <ErrorMessage message={errors.oilData} />
          ) : (
            <LoadingPlaceholder text="Loading data…" />
          )}
        </div>
      </section>

      {/* Project goals */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-14">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Project Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map(({ title, body }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methods */}
      <section className="border-t border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {(
            [
              {
                label: "Data Sources",
                body: "IEA Oil Information Database (import/export volumes, 1971–2023) and IEA Global EV Outlook (sales, market share, 2010–2035).",
              },
              {
                label: "Methodology",
                body: "Country-level EV share compared to year-over-year oil import changes, controlling for GDP growth and energy-mix shifts.",
              },
              {
                label: "Forecast Models",
                body: (
                  <>
                    Oil: Log-ARIMA with AIC-based grid search.<br />
                    EV: Logistic S-curve{" "}
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                      f(t) = L / (1 + e<sup>−k(t−t₀)</sup>)
                    </span>{" "}
                    fitted by nonlinear least-squares.
                  </>
                ),
              },
              {
                label: "Coverage",
                body: "50+ countries · 1971–2023 oil data · 2010–2035 EV data · Forecasts through 2030 (oil) and 2035 (EV).",
              },
            ] as { label: string; body: React.ReactNode }[]
          ).map(({ label, body }) => (
            <div key={label}>
              <p className="text-xs font-mono uppercase tracking-widest text-teal-600 mb-2">{label}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
