"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import { fetchEvData, fetchGdpMeta } from "@/lib/data";
import type { EvRow, GdpMeta } from "@/components/charts/EvGdpImpactCharts";

const EvGdpImpactCharts = dynamic(() => import("@/components/charts/EvGdpImpactCharts"), { ssr: false });

export default function EvGdpImpactPage() {
  const [evData, setEvData] = useState<EvRow[]>([]);
  const [gdpMeta, setGdpMeta] = useState<GdpMeta[]>([]);

  useEffect(() => {
    fetchEvData().then(setEvData);
    fetchGdpMeta().then((d) => { if (d) setGdpMeta(d); });
  }, []);

  const ready = evData.length > 0 && gdpMeta.length > 0;

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
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        {ready ? (
          <EvGdpImpactCharts evData={evData} gdpMeta={gdpMeta} />
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-mono">
            Loading data…
          </div>
        )}
      </div>
    </>
  );
}
