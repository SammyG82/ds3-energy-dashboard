"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EnergyAccessRow } from "@/lib/data";
import { tooltipStyle, useContainerSize } from "@/lib/ui-utils";

interface Props {
  data: EnergyAccessRow[];
}

interface Pinned {
  state: string;
  saidi: number;
  saifi: number;
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

function rating(saidi: number) {
  if (saidi < 100) return { label: "Good", color: "#16a34a", bg: "bg-green-100", text: "text-green-700" };
  if (saidi < 200) return { label: "Fair", color: "#d97706", bg: "bg-amber-100", text: "text-amber-700" };
  return { label: "Poor", color: "#dc2626", bg: "bg-red-100", text: "text-red-700" };
}

export default function ReliabilityChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [pinnedPos, setPinnedPos] = useState<{ x: number; y: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.saidi - a.saidi).slice(0, 40).reverse(),
    [data]
  );

  const natAvgSaidi = useMemo(
    () => Math.round(d3.mean(data, (d) => d.saidi) ?? 0),
    [data]
  );

  useEffect(() => {
    setPinned(null);
    setPinnedPos(null);
  }, [data]);

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

    const x = d3.scaleLinear().domain([0, d3.max(sorted, (d) => d.saidi) ?? 1]).range([0, width]);
    const y = d3.scaleBand().domain(sorted.map((d) => d.state)).range([0, height]).padding(0.15);

    [100, 200].forEach((v) => {
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
      .attr("fill", (d) => rating(d.saidi).color)
      .attr("opacity", 0.8)
      .attr("width", 0);

    barsSel
      .on("mouseover", function (event, d) {
        barsSel.attr("opacity", 0.3).attr("stroke", "none");
        d3.select(this).attr("opacity", 1.0).attr("stroke", "#1e293b").attr("stroke-width", 1.5);
        setPinned({ state: d.state, saidi: d.saidi, saifi: d.saifi });
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
      .attr("width", (d) => x(d.saidi));

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
      .text((d) => `${d.saidi.toFixed(0)} min`)
      .transition().duration(700).delay((_, i) => i * 12)
      .attr("x", (d) => x(d.saidi) + 5)
      .attr("opacity", 1);

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .selectAll("text").attr("dx", -4).attr("font-size", "11px").attr("fill", "#475569");
  }, [sorted, containerWidth]);

  const r = pinned ? rating(pinned.saidi) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-4 text-xs font-mono flex-wrap">
          {[
            { label: "< 100 min — Good", color: "#16a34a" },
            { label: "100–200 min — Fair", color: "#d97706" },
            { label: "> 200 min — Poor", color: "#dc2626" },
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
          aria-pressed={showInfo}
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
            <p className="text-sm font-semibold text-slate-700 mb-0.5">Good — under 100 min/year</p>
            <p className="text-sm text-slate-500 leading-relaxed">The US national average is roughly 130 minutes per year. States under 100 minutes are performing meaningfully better than average. Most utility commissions use 100 minutes as a benchmark for strong reliability.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">Fair — 100–200 min/year</p>
            <p className="text-sm text-slate-500 leading-relaxed">At or moderately above the national average. Typical for states with mixed infrastructure ages or moderate weather exposure. Customers in this range lose power roughly 1–3 hours per year on average.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">Poor — over 200 min/year</p>
            <p className="text-sm text-slate-500 leading-relaxed">Significantly above average. States here often have aging grid infrastructure, high storm exposure, or large rural service territories. Customers lose more than 3 hours of power per year on average.</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Horizontal bar chart of grid reliability (SAIDI) by US state" />
        {pinned && pinnedPos && r && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm z-10"
            style={tooltipStyle(pinnedPos.x, pinnedPos.y, containerWidth, containerHeight, 130)}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 mb-0.5">
              <span className="text-sm font-bold text-slate-800">{STATE_NAMES[pinned.state] ?? pinned.state}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${r.bg} ${r.text}`}>{r.label} reliability</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Average outage time</p>
              <p className="text-sm font-semibold text-slate-800">{pinned.saidi.toFixed(0)} minutes per year</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Average outage frequency</p>
              <p className="text-sm font-semibold text-slate-800">{pinned.saifi.toFixed(2)} times per year</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 font-mono">
        SAIDI = how long the average customer loses power per year &nbsp;·&nbsp; National average: {natAvgSaidi} min/year{data.length > sorted.length ? ` · Showing top ${sorted.length} of ${data.length} states` : ""}
      </p>
    </div>
  );
}
