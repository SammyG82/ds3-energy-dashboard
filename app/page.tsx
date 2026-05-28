"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchEvSales, fetchEvData, fetchOilForecast, BASE } from "@/lib/data";
import { useTheme } from "@/lib/theme-context";
import type { OilRow, EvRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";
import FadeIn from "@/components/ui/FadeIn";

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
    body: "Track EV adoption across 50+ countries from 2010 to 2035 using IEA historical data and Stated Policies Scenario (STEPS) projections.",
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
  const { isDark } = useTheme();
  const [evSales, setEvSales] = useState<EvRow[]>([]);
  const [evData, setEvData] = useState<EvRow[]>([]);
  const [oilData, setOilData] = useState<OilRow[]>([]);
  const [errors, setErrors] = useState<{ evSales: string | null; evData: string | null; oilData: string | null }>({
    evSales: null, evData: null, oilData: null,
  });

  useEffect(() => {
    fetchEvSales().then(setEvSales).catch((err) => { if (process.env.NODE_ENV === "development") console.error(err); setErrors((e) => ({ ...e, evSales: "Failed to load EV sales data." })); });
    fetchEvData().then(setEvData).catch((err) => { if (process.env.NODE_ENV === "development") console.error(err); setErrors((e) => ({ ...e, evData: "Failed to load EV forecast data." })); });
    fetchOilForecast().then(setOilData).catch((err) => { if (process.env.NODE_ENV === "development") console.error(err); setErrors((e) => ({ ...e, oilData: "Failed to load oil forecast data." })); });
  }, []);



  return (
    <div className={`transition-colors duration-300 ${isDark ? "bg-black" : "bg-white"}`}>
      {/* Hero — full-viewport, pulled under fixed header */}
      <section className="relative overflow-hidden min-h-screen -mt-[72px]">
        <img
          src={`${BASE}/images/hero-bg.webp`}
          alt="Electric vehicle on scenic coastal road with wind turbine"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 75%" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        {/* Gradient overlays — two layers cross-fading via opacity so the gradient animates smoothly */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[30%] via-white/40 via-[70%] to-white transition-opacity duration-300" style={{ opacity: isDark ? 0 : 1 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 from-[30%] via-black/60 via-[70%] to-black transition-opacity duration-300" style={{ opacity: isDark ? 1 : 0 }} />
        {/* Hero copy */}
        <div className="relative h-full flex flex-col items-start justify-center px-12 md:px-24 py-32 min-h-screen text-white">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-4 max-w-4xl drop-shadow-lg">
            Does EV adoption reduce oil dependency?
          </h1>
          <p className="text-xl md:text-2xl font-light max-w-2xl drop-shadow-md text-white/90">
            A regional study of EV adoption and oil dependency using IEA data
          </p>
        </div>
      </section>

      {/* Heading + stats */}
      <section className={`transition-colors duration-300 ${isDark ? "bg-black" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 text-center">
          <FadeIn>
            <h1 className={`text-4xl sm:text-5xl font-light tracking-tight mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
              EV Adoption &amp;{" "}
              <span className="text-teal-600">Oil Dependency</span>
            </h1>
            <p className={`max-w-2xl mx-auto text-base leading-relaxed mb-10 ${isDark ? "text-white/70" : "text-slate-500"}`}>
              Does rising electric vehicle adoption measurably reduce oil dependency in oil-importing
              countries — and how could the resulting savings fund clean energy infrastructure?
            </p>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map(({ value, label, accent }) => (
                <div key={label} className={`rounded-xl p-4 border ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-2xl font-bold ${accent}`}>{value}</p>
                  <p className={`text-xs mt-1 ${isDark ? "text-white/60" : "text-slate-500"}`}>{label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Preview charts */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 flex flex-col gap-10">

        <FadeIn>
          <div className={`rounded-2xl p-6 border min-h-[500px] ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>EV Share by Country</h2>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>Top 10 EV sales countries — select a year</p>
              </div>
              <Link href="/ev-forecast/#ev-sales-by-country" className="text-sm font-semibold text-blue-500 hover:underline">
                Full Explorer →
              </Link>
            </div>
            {evSales.length > 0 ? (
              <EvShareChart data={evSales} preview isDark={isDark} />
            ) : errors.evSales ? (
              <ErrorMessage message={errors.evSales} />
            ) : (
              <LoadingPlaceholder text="Loading data…" />
            )}
          </div>
        </FadeIn>

        <FadeIn>
          <div className={`rounded-2xl p-6 border min-h-[400px] ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  EV Sales Trajectory{" "}
                  <span className={`font-normal text-base ${isDark ? "text-white/50" : "text-slate-400"}`}>(Top 5 Markets)</span>
                </h2>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>IEA STEPS projections through 2035</p>
              </div>
              <Link href="/ev-forecast/#ev-sales-projections" className="text-sm font-semibold text-blue-500 hover:underline">
                Full Forecast →
              </Link>
            </div>
            {evData.length > 0 ? (
              <EvForecastChart data={evData} preview isDark={isDark} />
            ) : errors.evData ? (
              <ErrorMessage message={errors.evData} />
            ) : (
              <LoadingPlaceholder text="Loading data…" />
            )}
          </div>
        </FadeIn>

        <FadeIn>
          <div className={`rounded-2xl p-6 border min-h-[400px] ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Oil Import Forecasts{" "}
                  <span className={`font-normal text-base ${isDark ? "text-white/50" : "text-slate-400"}`}>(Top 5 Importers)</span>
                </h2>
                <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>Top importers with 95% CI bands through 2030</p>
              </div>
              <Link href="/oil-explorer/#oil-import-forecasts" className="text-sm font-semibold text-blue-500 hover:underline">
                Full Explorer →
              </Link>
            </div>
            {oilData.length > 0 ? (
              <OilForecastChart data={oilData} preview isDark={isDark} />
            ) : errors.oilData ? (
              <ErrorMessage message={errors.oilData} />
            ) : (
              <LoadingPlaceholder text="Loading data…" />
            )}
          </div>
        </FadeIn>
        </div>
      </section>

      {/* Project Goals */}
      <section className={`border-t transition-colors duration-300 ${isDark ? "bg-black border-white/10" : "bg-white border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14">
          <FadeIn>
            <h2 className={`text-4xl mb-8 font-light ${isDark ? "text-white" : "text-black"}`}>
              Project Goals
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map(({ title, body }, i) => (
              <FadeIn key={title} delay={i * 80}>
                <div className={`p-6 rounded-2xl border h-full ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
                  <h3 className={`text-lg mb-3 font-medium ${isDark ? "text-white" : "text-black"}`}>{title}</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-white/70" : "text-black/70"}`}>{body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
