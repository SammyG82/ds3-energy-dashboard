"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { EnergyAccessRow } from "@/lib/data";

interface Props {
  data: EnergyAccessRow[];
}

interface Pinned {
  state: string;
  burden: number;
  price: number;
  medianIncome: number | null;
  annualBill: number | null;
  avgCustomers: number | null;
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "Washington D.C.",
};

export default function BurdenVsPriceChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pinned, setPinned] = useState<Pinned | null>(null);

  useEffect(() => {
    setPinned(null);
  }, [data]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 20, right: 30, bottom: 48, left: 56 };
    const totalH = 380;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.avg_price_cents_kwh) ?? 0, d3.max(data, (d) => d.avg_price_cents_kwh) ?? 1])
      .nice().range([0, width]);

    const y = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.energy_burden_pct) ?? 0, d3.max(data, (d) => d.energy_burden_pct) ?? 1])
      .nice().range([height, 0]);

    const incomes = data.map((d) => d.median_income_2024).filter((v): v is number => v !== null);
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([d3.min(incomes) ?? 0, d3.max(incomes) ?? 1]);

    const rScale = d3.scaleSqrt()
      .domain([0, d3.max(data, (d) => d.avg_customers ?? 0) ?? 1])
      .range([5, 22]);

    g.selectAll(".grid-h").data(y.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    g.selectAll(".grid-v").data(x.ticks(5)).enter()
      .append("line").attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    const dotsSel = g.selectAll<SVGCircleElement, EnergyAccessRow>(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.avg_price_cents_kwh))
      .attr("cy", (d) => y(d.energy_burden_pct))
      .attr("r", (d) => rScale(d.avg_customers ?? 0))
      .attr("fill", (d) => d.median_income_2024 != null ? colorScale(d.median_income_2024) : "#94a3b8")
      .attr("opacity", 0.8)
      .attr("stroke", "white").attr("stroke-width", 1);

    dotsSel
      .on("mouseover", function (_, d) {
        dotsSel.attr("opacity", 0.15);
        d3.select(this)
          .attr("opacity", 1.0)
          .attr("r", rScale(d.avg_customers ?? 0) * 1.4)
          .attr("stroke", "#1e293b").attr("stroke-width", 2);
        setPinned({
          state: d.state,
          burden: d.energy_burden_pct,
          price: d.avg_price_cents_kwh,
          medianIncome: d.median_income_2024,
          annualBill: d.est_annual_bill,
          avgCustomers: d.avg_customers,
        });
      })
      .on("mouseleave", function () {
        dotsSel
          .attr("opacity", 0.8)
          .attr("r", (d) => rScale(d.avg_customers ?? 0))
          .attr("stroke", "white").attr("stroke-width", 1);
      });

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat((d) => `${d}¢`).ticks(6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((d) => `${d}%`).ticks(5));

    svg.append("text")
      .attr("x", margin.left + width / 2).attr("y", totalH - 6)
      .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#64748b")
      .text("Average Electricity Price (¢/kWh)");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + height / 2)).attr("y", 14)
      .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#64748b")
      .text("Energy Burden (%)");
  }, [data, containerWidth]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-mono text-slate-500 flex-wrap">
        <span>Bubble color: household income (green = higher income, red = lower income)</span>
        <span>·</span>
        <span>Bubble size: number of electricity customers</span>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Scatter plot of energy burden vs electricity price by US state" />
      </div>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {pinned ? (
          <div className="px-4 py-3 flex flex-col gap-2">
            <span className="font-bold text-slate-800">{STATE_NAMES[pinned.state] ?? pinned.state}</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Share of income on electricity</p>
                <p className="font-semibold text-slate-800">{pinned.burden.toFixed(2)}% of household income</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Electricity price</p>
                <p className="font-semibold text-slate-800">{pinned.price.toFixed(1)}¢ per kWh</p>
              </div>
              {pinned.medianIncome !== null && (
                <div>
                  <p className="text-slate-400 text-xs">Median household income</p>
                  <p className="font-semibold text-slate-800">${pinned.medianIncome.toLocaleString()}</p>
                </div>
              )}
              {pinned.annualBill !== null && (
                <div>
                  <p className="text-slate-400 text-xs">Estimated annual electricity bill</p>
                  <p className="font-semibold text-slate-800">${Math.round(pinned.annualBill).toLocaleString()}</p>
                </div>
              )}
              {pinned.avgCustomers !== null && (
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs">Electricity customers tracked</p>
                  <p className="font-semibold text-slate-800">{Math.round(pinned.avgCustomers).toLocaleString()}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
              Energy burden = electricity costs as a share of household income (2024)
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-mono px-4 py-4 text-center">
            Hover over a state to see its full affordability profile
          </p>
        )}
      </div>
    </div>
  );
}
