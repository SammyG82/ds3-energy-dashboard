"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";

interface Props {
  data: EvRow[];
  preview?: boolean;
}

const COUNTRY_COLORS: Record<string, string> = {
  China: "#e85d04", USA: "#2563eb", Germany: "#7c3aed", India: "#059669",
  Japan: "#0891b2", "United Kingdom": "#db2777", France: "#ca8a04",
  Norway: "#16a34a", Netherlands: "#dc2626", Korea: "#9333ea",
  Australia: "#0284c7", Sweden: "#15803d", Canada: "#b45309",
  Spain: "#7c3aed", Brazil: "#16a34a", Italy: "#f97316", World: "#64748b",
};
const DEFAULT_COLOR = "#2563eb";

export default function EvShareChart({ data, preview = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const topN = preview ? 10 : 20;

  const years = useMemo(
    () => Array.from(new Set(data.map((d) => d.year))).sort((a, b) => a - b),
    [data]
  );
  const [year, setYear] = useState(() => years[years.length - 1] ?? 0);

  useEffect(() => {
    if (years.length) setYear(years[years.length - 1]);
  }, [years]);

  const filtered = useMemo(
    () => data.filter((d) => d.year === year).sort((a, b) => b.ev_sales - a.ev_sales).slice(0, topN),
    [data, year, topN]
  );

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !filtered.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 8, right: 20, bottom: 8, left: preview ? 80 : 120 };
    const barH = preview ? 22 : 28;
    const gap = 4;
    const height = filtered.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(filtered, (d) => d.ev_sales) ?? 1]).range([0, width]);
    const y = d3.scaleBand()
      .domain(filtered.map((d) => d.region_country))
      .range([0, height])
      .padding(0.15);

    // Grid lines
    g.selectAll(".chart-grid-line")
      .data(x.ticks(4))
      .enter()
      .append("line")
      .attr("class", "chart-grid-line")
      .attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.6);

    // Bars
    g.selectAll(".bar")
      .data(filtered)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => y(d.region_country) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => COUNTRY_COLORS[d.region_country] ?? DEFAULT_COLOR)
      .attr("opacity", 0.85)
      .attr("width", 0)
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("width", (d) => x(d.ev_sales));

    // Value labels
    g.selectAll(".bar-label")
      .data(filtered)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.ev_sales) + 5)
      .attr("y", (d) => (y(d.region_country) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "11px")
      .attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .text((d) =>
        d.ev_sales >= 1_000_000
          ? (d.ev_sales / 1_000_000).toFixed(1) + "M"
          : d.ev_sales >= 1_000
          ? (d.ev_sales / 1_000).toFixed(0) + "k"
          : d.ev_sales.toFixed(0)
      );

    // Y axis (country labels)
    g.append("g")
      .attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .selectAll("text")
      .attr("dx", -6)
      .attr("font-size", preview ? "11px" : "12px")
      .attr("fill", "#475569");
  }, [filtered, preview, containerWidth]);

  const leader = filtered[0];
  const total = filtered.reduce((s, d) => s + d.ev_sales, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      {!preview && (
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="share-year-select" className="text-xs font-mono uppercase tracking-widest text-slate-400">Year</label>
          <select
            id="share-year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Total Sales</p>
          <p className="text-lg font-bold text-blue-600">
            {total >= 1_000_000 ? (total / 1_000_000).toFixed(1) + "M" : (total / 1_000).toFixed(0) + "k"}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Leader</p>
          <p className="text-lg font-bold text-teal-600">{leader?.region_country ?? "—"}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Leader Share</p>
          <p className="text-lg font-bold text-amber-600">
            {leader && total ? ((leader.ev_sales / total) * 100).toFixed(0) + "%" : "—"}
          </p>
        </div>
      </div>

      {/* Year picker for preview */}
      {preview && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Year</label>
          <div className="flex gap-1 flex-wrap">
            {years.filter((y) => y >= 2018).map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  y === year
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 text-slate-500 hover:border-slate-400"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Horizontal bar chart of top EV sales countries" />
      </div>
    </div>
  );
}
