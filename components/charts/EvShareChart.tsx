"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { fmtEvSales, COUNTRY_COLORS, dn } from "@/lib/data";
import { tooltipStyle, useContainerSize } from "@/lib/ui-utils";

interface Props {
  data: EvRow[];
  preview?: boolean;
}

interface Tooltip {
  country: string;
  sales: number;
  sharePct: number;
  rank: number;
}

const DEFAULT_COLOR = "#94a3b8";
const AGGREGATES = new Set(["World", "Rest of the world", "Central and South America"]);

export default function EvShareChart({ data, preview = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const topN = preview ? 10 : 20;

  const years = useMemo(
    () => Array.from(new Set(data.map((d) => d.year))).sort((a, b) => a - b),
    [data]
  );
  const [year, setYear] = useState(() => years[years.length - 1] ?? 0);

  useEffect(() => {
    if (years.length) setYear(years[years.length - 1]);
  }, [years]);

  useEffect(() => {
    setTooltip(null);
    setTooltipPos(null);
  }, [year, data]);

  const filtered = useMemo(
    () => data
      .filter((d) => d.year === year && !AGGREGATES.has(d.region_country))
      .sort((a, b) => b.ev_sales - a.ev_sales)
      .slice(0, topN),
    [data, year, topN]
  );

  const total = useMemo(() => d3.sum(filtered, (d) => d.ev_sales), [filtered]);

  const forecastBoundary = useMemo(
    () => data.find((d) => d.type === "Forecast")?.year ?? 2025,
    [data]
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !filtered.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 8, right: 52, bottom: 8, left: preview ? 105 : 115 };
    const barH = preview ? 22 : 28;
    const gap = 4;
    const height = filtered.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(filtered, (d) => d.ev_sales) ?? 1]).range([0, width]);
    const y = d3.scaleBand()
      .domain(filtered.map((d) => dn(d.region_country)))
      .range([0, height])
      .padding(0.15);

    g.selectAll(".chart-grid-line")
      .data(x.ticks(4))
      .enter()
      .append("line")
      .attr("class", "chart-grid-line")
      .attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.6);

    const barsSel = g.selectAll<SVGRectElement, EvRow>(".bar")
      .data(filtered)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => y(dn(d.region_country)) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => COUNTRY_COLORS[d.region_country] ?? DEFAULT_COLOR)
      .attr("opacity", 0.85)
      .attr("width", 0);

    barsSel
      .on("mouseover", function (event, d) {
        barsSel.attr("opacity", 0.3).attr("stroke", "none");
        d3.select(this).attr("opacity", 1.0).attr("stroke", "#1e293b").attr("stroke-width", 1.5);
        const rank = filtered.findIndex((r) => r.region_country === d.region_country) + 1;
        setTooltip({ country: dn(d.region_country), sales: d.ev_sales, sharePct: total > 0 ? (d.ev_sales / total) * 100 : 0, rank });
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
      })
      .on("mouseleave", function () {
        barsSel.attr("opacity", 0.85).attr("stroke", "none");
        setTooltip(null);
        setTooltipPos(null);
      });

    barsSel
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("width", (d) => x(d.ev_sales));

    g.selectAll(".bar-label")
      .data(filtered)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", 0)
      .attr("y", (d) => (y(dn(d.region_country)) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "11px")
      .attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .attr("opacity", 0)
      .attr("pointer-events", "none")
      .text((d) => fmtEvSales(d.ev_sales))
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("x", (d) => x(d.ev_sales) + 5)
      .attr("opacity", 1);

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

  const yearSlider = years.length > 0 ? (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">Year</span>
      <input
        type="range"
        min={years[0]}
        max={years[years.length - 1]}
        step="1"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="flex-1 accent-blue-600"
        aria-label="Select year"
      />
      <span className="text-sm font-bold text-blue-600 w-10 text-right">{year}</span>
      <span className={`text-xs px-2 py-0.5 rounded font-mono whitespace-nowrap ${year >= forecastBoundary ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
        {year >= forecastBoundary ? "Projected forecast" : "Historical data"}
      </span>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {!preview && yearSlider}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Total Sales</p>
          <p className="text-lg font-bold text-blue-600">{fmtEvSales(total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Leader</p>
          <p className="text-lg font-bold text-teal-600">{leader ? dn(leader.region_country) : "—"}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Leader Share</p>
          <p className="text-lg font-bold text-amber-600">
            {leader && total ? ((leader.ev_sales / total) * 100).toFixed(0) + "%" : "—"}
          </p>
        </div>
      </div>

      {preview && yearSlider}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Horizontal bar chart of top EV sales countries" />
        {tooltip && tooltipPos && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1 pointer-events-none min-w-45 shadow-sm"
            style={tooltipStyle(tooltipPos.x, tooltipPos.y, containerWidth, containerHeight, 110)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-slate-800 text-sm">{tooltip.country}</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">#{tooltip.rank}</span>
            </div>
            <p className="text-blue-600 font-bold text-base mt-0.5">
              {tooltip.sales.toLocaleString()} <span className="text-slate-400 text-xs font-normal">vehicles</span>
            </p>
            <p className="text-slate-400 text-xs">
              {tooltip.sharePct.toFixed(1)}% of top {topN} countries' combined sales
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
