"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEvData, fetchGdpMeta } from "@/lib/data";
import type { EvRow, GdpMeta } from "@/lib/data";

const EvGdpImpactCharts = dynamic(() => import("@/components/charts/EvGdpImpactCharts"), { ssr: false });

export default function EvGdpImpactPage() {
  const [evData, setEvData] = useState<EvRow[]>([]);
  const [gdpMeta, setGdpMeta] = useState<GdpMeta[]>([]);
  const [errors, setErrors] = useState<{ evData: string | null; gdpMeta: string | null }>({
    evData: null, gdpMeta: null,
  });

  useEffect(() => {
    fetchEvData().then(setEvData).catch(() => setErrors((e) => ({ ...e, evData: "Failed to load EV data." })));
    fetchGdpMeta().then(setGdpMeta).catch(() => setErrors((e) => ({ ...e, gdpMeta: "Failed to load GDP metadata." })));
  }, []);

  const ready = evData.length > 0 && gdpMeta.length > 0;
  const anyError = errors.evData ?? errors.gdpMeta;

  return (
    <>
      <PageHeader
        eyebrow="EV Impact · Oil Spending"
        title="EV GDP"
        titleAccent="Impact"
        subtitle="How EV adoption changes oil spending as a percentage of GDP. Explore projections by country with adjustable adoption rate and analysis year."
        badges={[
          { label: "GDP Analysis", color: "teal" },
          { label: "IEA Source Data", color: "amber" },
          { label: "2024 – 2030", color: "blue" },
        ]}
      />
      {(errors.evData || errors.gdpMeta) && (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-2">
          {errors.evData && <p className="text-sm text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errors.evData}</p>}
          {errors.gdpMeta && <p className="text-sm text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errors.gdpMeta}</p>}
        </div>
      )}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        {ready ? (
          <EvGdpImpactCharts evData={evData} gdpMeta={gdpMeta} />
        ) : !anyError ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">Loading data…</div>
        ) : null}
      </div>
    </>
  );
}
