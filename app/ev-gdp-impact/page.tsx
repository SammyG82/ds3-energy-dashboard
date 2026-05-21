"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import MethodologySection from "@/components/ui/MethodologySection";
import { fetchEvData, fetchGdpMeta, fetchOilPrices } from "@/lib/data";
import type { EvRow, GdpMeta, OilPriceRow } from "@/lib/data";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

const EvGdpImpactCharts = dynamic(() => import("@/components/charts/EvGdpImpactCharts"), { ssr: false });

export default function EvGdpImpactPage() {
  const [evData, setEvData] = useState<EvRow[]>([]);
  const [gdpMeta, setGdpMeta] = useState<GdpMeta[]>([]);
  const [oilPrices, setOilPrices] = useState<OilPriceRow[]>([]);
  const [errors, setErrors] = useState<{ evData: string | null; gdpMeta: string | null }>({
    evData: null, gdpMeta: null,
  });

  useEffect(() => {
    fetchEvData().then(setEvData).catch((err) => { console.error(err); setErrors((e) => ({ ...e, evData: "Failed to load EV data." })); });
    fetchGdpMeta().then(setGdpMeta).catch((err) => { console.error(err); setErrors((e) => ({ ...e, gdpMeta: "Failed to load GDP metadata." })); });
    fetchOilPrices().then(setOilPrices).catch((err) => { console.error(err); });
  }, []);

  const ready = evData.length > 0 && gdpMeta.length > 0;
  const anyError = errors.evData || errors.gdpMeta;

  return (
    <>
      <PageHeader
        title="EV GDP"
        titleAccent="Impact"
        subtitle="How EV adoption changes oil spending as a percentage of GDP. Explore projections by country with adjustable adoption rate and analysis year."
        badges={[
          { label: "GDP Analysis", color: "teal" },
          { label: "IEA Source Data", color: "amber" },
          { label: "2024 – 2030", color: "blue" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-6">
        {ready ? (
          <EvGdpImpactCharts evData={evData} gdpMeta={gdpMeta} oilPrices={oilPrices} />
        ) : anyError ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-2">
            {errors.evData && <ErrorMessage message={errors.evData} />}
            {errors.gdpMeta && <ErrorMessage message={errors.gdpMeta} />}
          </div>
        ) : (
          <LoadingPlaceholder text="Loading data…" />
        )}

        <MethodologySection cols={2} items={[
          {
            label: "Oil Displacement",
            body: (<>
              Each EV is assumed to displace approximately 1,300 gallons of fuel per year — a mid-range estimate for a typical internal combustion vehicle. At 42 gallons per barrel, the total oil displaced is{" "}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                (EVs × 1,300) ÷ 42 ÷ 1,000,000
              </span>
              {" "}million barrels per year. This is an indicative estimate, not a measured figure.
            </>),
          },
          {
            label: "Cost Savings & GDP %",
            body: "Displaced barrels are multiplied by a country-specific cost per barrel (a Brent/WTI-calibrated estimate from FRED price data) to get the savings in billion USD. That figure is then divided by the country's 2023 nominal GDP (World Bank) to produce the percentage shown.",
          },
          {
            label: "Adoption Rate Slider",
            body: "EV sales figures come from the IEA's Stated Policies Scenario (STEPS) projections. The slider scales those figures by the selected multiplier — at 100% it uses the IEA projection directly, at 50% it assumes half of projected EVs are actually adopted.",
          },
          {
            label: "Caveats",
            body: "This model isolates the light-vehicle transport sector only. Oil demand is also driven by industry, heating, aviation, and shipping — sectors where electrification is slower. The savings figures are therefore an upper bound for the transport contribution.",
          },
          {
            label: "Historical Oil Prices & Inflation Adjustment",
            body: (<>
              Brent and WTI spot prices come from FRED (Federal Reserve Bank of St Louis), averaged from daily to annual figures. The dashed line and shaded area on the price chart show inflation-adjusted prices in real 2024 USD, using the US Consumer Price Index from the IMF (2017–2024). The deflation formula is{" "}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                real = nominal × (CPI₂₀₂₄ ÷ CPI_year)
              </span>
              {" "}— so a $54 barrel in 2017 becomes ~$69 in today&apos;s dollars. The shaded gap between the lines represents purchasing power lost to inflation. Real prices are only shown where CPI data is available (2017–2024).
            </>),
          },
        ]} />
      </div>
    </>
  );
}
