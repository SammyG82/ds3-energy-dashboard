"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EnergyAccessRow } from "@/lib/data";
import { tooltipStyle } from "@/lib/ui-utils";

interface Props {
  data: EnergyAccessRow[];
}

interface Pinned {
  state: string;
  burden: number;
  price: number;
  annualBill: number | null;
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

function burdenRating(b: number) {
  if (b < 2.0) return { label: "Low burden", color: "#16a34a", bg: "bg-green-100", text: "text-green-700" };
  if (b < 2.5) return { label: "Moderate burden", color: "#d97706", bg: "bg-amber-100", text: "text-amber-700" };
  return { label: "High burden", color: "#dc2626", bg: "bg-red-100", text: "text-red-700" };
}

export default function EnergyBurdenChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [pinnedPos, setPinnedPos] = useState<{ x: number; y: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.energy_burden_pct - a.energy_burden_pct).slice(0, 40),
    [data]
  );

  const natAvgBurden = useMemo(
    () => +(d3.mean(data, (d) => d.energy_burden_pct) ?? 0).toFixed(2),
    [data]
  );

  useEffect(() => {
    setPinned(null);
    setPinnedPos(null);
  }, [data]);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver((entries) => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        setContainerWidth(Math.floor(entries[0].contentRect.width));
        setContainerHeight(Math.floor(entries[0].contentRect.height));
      }, 150);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => { clearTimeout(tid); obs.disconnect(); };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !sorted.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 8, right: 80, bottom: 8, left: 40 };
    const barH = 22;
    const gap = 4;
    const height = sorted.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(sorted, (d) => d.energy_burden_pct) ?? 1]).range([0, width]);
    const y = d3.scaleBand().domain(sorted.map((d) => d.state)).range([0, height]).padding(0.15);

    [2.0, 2.5].forEach((v) => {
      if (x(v) <= width) {
        g.append("line")
          .attr("x1", x(v)).attr("x2", x(v))
          .attr("y1", 0).attr("y2", height)
          .attr("stroke", "#94a3b8").attr("stroke-dasharray", "3").attr("opacity", 0.6);
      }
    });

    const barsSel = g.selectAll<SVGRectElement, EnergyAccessRow>(".bar")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => y(d.state) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => burdenRating(d.energy_burden_pct).color)
      .attr("opacity", 0.8)
      .attr("width", 0);

    barsSel
      .on("mouseover", function (event, d) {
        barsSel.attr("opacity", 0.3).attr("stroke", "none");
        d3.select(this).attr("opacity", 1.0).attr("stroke", "#1e293b").attr("stroke-width", 1.5);
        setPinned({ state: d.state, burden: d.energy_burden_pct, price: d.avg_price_cents_kwh, annualBill: d.est_annual_bill });
        const [cx, cy] = d3.pointer(event, containerRef.current);
        setPinnedPos({ x: cx, y: cy });
      })
      .on("mousemove", function (event) {
        const [cx, cy] = d3.pointer(event, containerRef.current);
        setPinnedPos({ x: cx, y: cy });
      })
      .on("mouseleave", function () {
        barsSel.attr("opacity", 0.8).attr("stroke", "none");
        setPinned(null);
        setPinnedPos(null);
      });

    barsSel
      .transition().duration(700).delay((_, i) => i * 12)
      .attr("width", (d) => x(d.energy_burden_pct));

    g.selectAll(".val-label")
      .data(sorted)
      .enter()
      .append("text")
      .attr("class", "val-label")
      .attr("x", 0)
      .attr("y", (d) => (y(d.state) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .attr("opacity", 0)
      .attr("pointer-events", "none")
      .text((d) => `${d.energy_burden_pct.toFixed(2)}%`)
      .transition().duration(700).delay((_, i) => i * 12)
      .attr("x", (d) => x(d.energy_burden_pct) + 5)
      .attr("opacity", 1);

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .selectAll("text").attr("dx", -4).attr("font-size", "11px").attr("fill", "#475569");
  }, [sorted, containerWidth]);

  const r = pinned ? burdenRating(pinned.burden) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-4 text-xs font-mono flex-wrap">
          {[
            { label: "< 2.0% — Low burden", color: "#16a34a" },
            { label: "2.0–2.5% — Moderate burden", color: "#d97706" },
            { label: "> 2.5% — High burden", color: "#dc2626" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-slate-600">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowInfo((v) => !v)}
          title="Why these thresholds?"
          className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
            showInfo
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white text-slate-400 border-slate-300 hover:border-teal-400 hover:text-teal-600"
          }`}
        >
          ?
        </button>
      </div>

      {showInfo && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Why these thresholds?</p>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">Low — under 2.0%</p>
            <p className="text-sm text-slate-500 leading-relaxed">The US national average energy burden is approximately 2% of household income. States below 2% are spending a below-average share on electricity and are generally considered to have affordable energy costs.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">Moderate — 2.0–2.5%</p>
            <p className="text-sm text-slate-500 leading-relaxed">At or slightly above the national average. Households here are spending a noticeable but not extreme share of income on electricity. Often reflects higher electricity prices or lower median incomes relative to neighboring states.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">High — over 2.5%</p>
            <p className="text-sm text-slate-500 leading-relaxed">Meaningfully above the national average. The DOE and ACEEE flag high energy burden as a key affordability concern — particularly for lower-income households who may spend 6–10% or more. States in this range often have a combination of high electricity prices and lower median incomes.</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Horizontal bar chart of energy burden by US state" />
        {pinned && pinnedPos && r && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm z-10"
            style={tooltipStyle(pinnedPos.x, pinnedPos.y, containerWidth, containerHeight, 160)}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 mb-0.5">
              <span className="text-sm font-bold text-slate-800">{STATE_NAMES[pinned.state] ?? pinned.state}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${r.bg} ${r.text}`}>{r.label}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Share of income on electricity</p>
              <p className="text-sm font-semibold text-slate-800">{pinned.burden.toFixed(2)}% of household income</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Average electricity price</p>
              <p className="text-sm font-semibold text-slate-800">{pinned.price.toFixed(1)}¢ per kWh</p>
            </div>
            {pinned.annualBill !== null && (
              <div>
                <p className="text-xs text-slate-400">Estimated annual electricity bill</p>
                <p className="text-sm font-semibold text-slate-800">${Math.round(pinned.annualBill).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 font-mono">
        Energy burden = electricity costs as a share of household income &nbsp;·&nbsp; National average: {natAvgBurden}%{data.length > sorted.length ? ` · Showing top ${sorted.length} of ${data.length} states` : ""}
      </p>
    </div>
  );
}
