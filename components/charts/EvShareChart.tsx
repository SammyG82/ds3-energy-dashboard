"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { fmtEvSales, COUNTRY_COLORS, dn, AGGREGATES } from "@/lib/data";
import { tooltipStyle, useContainerSize, useThemeRef } from "@/lib/ui-utils";
import ForecastBadge from "@/components/ui/ForecastBadge";
import StatCard from "@/components/ui/StatCard";

interface Props {
  data: EvRow[];
  preview?: boolean;
  isDark?: boolean;
}

interface Tooltip {
  country: string;
  sales: number;
  sharePct: number;
  rank: number;
}

const DEFAULT_COLOR = "#94a3b8";

export default function EvShareChart({ data, preview = false, isDark = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const isDarkRef = useThemeRef(isDark);

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
  }, [year, data, containerWidth, containerHeight, excluded]);

  useEffect(() => {
    setExcluded(new Set());
  }, [data]);

  const filtered = useMemo(
    () => data
      .filter((d) => d.year === year && !AGGREGATES.has(d.region_country))
      .sort((a, b) => b.ev_sales - a.ev_sales)
      .filter((d) => !excluded.has(d.region_country))
      .slice(0, topN),
    [data, year, topN, excluded]
  );

  const total = useMemo(() => d3.sum(filtered, (d) => d.ev_sales), [filtered]);

  const forecastBoundary = useMemo(() => {
    const fcYears = data.filter((d) => d.type === "Forecast").map((d) => d.year);
    return d3.min(fcYears) ?? Infinity;
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !filtered.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 8, right: 52, bottom: 8, left: preview ? 105 : 115 };
    const barH = 28;
    const gap = 4;
    const height = filtered.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const displayName = new Map(filtered.map((d) => [d.region_country, dn(d.region_country)]));
    const x = d3.scaleLinear().domain([0, d3.max(filtered, (d) => d.ev_sales) ?? 1]).range([0, width]);
    const y = d3.scaleBand()
      .domain(filtered.map((d) => displayName.get(d.region_country)!))
      .range([0, height])
      .padding(0.15);

    g.selectAll(".chart-grid-line")
      .data(x.ticks(4))
      .enter()
      .append("line")
      .attr("class", "chart-grid-line")
      .attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", isDarkRef.current ? "#334155" : "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.6);

    const barsSel = g.selectAll<SVGRectElement, EvRow>(".bar")
      .data(filtered)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => y(displayName.get(d.region_country)!) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => COUNTRY_COLORS[d.region_country] ?? DEFAULT_COLOR)
      .attr("opacity", 0.85)
      .attr("width", 0);

    barsSel
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        barsSel.attr("opacity", 0.3).attr("stroke", "none");
        d3.select(this).attr("opacity", 1.0).attr("stroke", isDarkRef.current ? "#94a3b8" : "#1e293b").attr("stroke-width", 1.5);
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
      })
      .on("click", (_event, d) => {
        setTooltip(null);
        setTooltipPos(null);
        setExcluded((prev) => new Set([...prev, d.region_country]));
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
      .attr("y", (d) => (y(displayName.get(d.region_country)!) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "11px")
      .attr("fill", isDarkRef.current ? "#94a3b8" : "#64748b")
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
      .selectAll<SVGTextElement, string>("text")
      .attr("dx", -6)
      .attr("font-size", "11px")
      .attr("fill", isDarkRef.current ? "#94a3b8" : "#64748b")
      .attr("cursor", "pointer")
      .on("click", (_event, countryDisplay) => {
        const row = filtered.find((d) => dn(d.region_country) === countryDisplay);
        if (row) {
          setTooltip(null);
          setTooltipPos(null);
          setExcluded((prev) => new Set([...prev, row.region_country]));
        }
      });
  }, [filtered, preview, containerWidth, total]);

  // Update only colours when theme changes — no redraw, no animation restart
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll(".chart-grid-line").attr("stroke", isDark ? "#334155" : "#e2e8f0");
    svg.selectAll<SVGTextElement, unknown>(".bar-label").attr("fill", isDark ? "#94a3b8" : "#64748b");
    svg.selectAll<SVGTextElement, unknown>(".chart-axis text").attr("fill", isDark ? "#94a3b8" : "#64748b");
  }, [isDark]);

  const leader = filtered[0];

  const ariaLabel = useMemo(() => {
    if (!leader) return "EV sales rankings: no data available.";
    return `EV sales rankings for ${year}: ${dn(leader.region_country)} leads with ${fmtEvSales(leader.ev_sales)} vehicles. Top ${topN} combined: ${fmtEvSales(total)}.`;
  }, [year, leader, topN, total]);

  const isProjected = year >= forecastBoundary;
  const excludedLabel = excluded.size > 0 ? ` (excl. ${excluded.size})` : "";

  const yearSlider = years.length > 0 ? (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400 whitespace-nowrap">Year</span>
      <input
        type="range"
        min={years[0]}
        max={years[years.length - 1]}
        step="1"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="flex-1 focus:outline-none focus:ring-2 focus:ring-slate-500"
        aria-label="Select year"
      />
      <span className="text-sm font-mono font-bold text-teal-500 w-10 text-right">{year}</span>
      <ForecastBadge isForecast={isProjected} isDark={isDark} />
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {yearSlider}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}Total Sales of Top ${topN}${excludedLabel}`} value={fmtEvSales(total)} accent="blue" isDark={isDark} />
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}Leader${excludedLabel}`} value={leader ? dn(leader.region_country) : "—"} accent="teal" isDark={isDark} />
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}Leader Share of Top ${topN}${excludedLabel}`} value={leader && total ? ((leader.ev_sales / total) * 100).toFixed(0) + "%" : "—"} accent="amber" isDark={isDark} />
      </div>

      {excluded.size > 0 && (
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
            {excluded.size === 1 ? "1 country hidden" : `${excluded.size} countries hidden`} — click a bar or name to hide, or
          </span>
          <button
            onClick={() => setExcluded(new Set())}
            className={`text-xs font-medium px-2 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDark ? "bg-white/10 text-white/70 hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Reset
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full relative">
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center gap-3 py-16 rounded-xl border ${isDark ? "border-white/10 text-white/40" : "border-slate-200 text-slate-400"}`}>
            <span className="text-sm">All countries hidden.</span>
            <button
              onClick={() => setExcluded(new Set())}
              className={`text-xs font-medium px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDark ? "bg-white/10 text-white/70 hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Reset
            </button>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        )}
        {tooltip && tooltipPos && (
          <div
            className={`absolute rounded-xl px-4 py-3 flex flex-col gap-1 pointer-events-none min-w-44 shadow-sm border ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
            style={tooltipStyle(tooltipPos.x, tooltipPos.y, containerWidth, containerHeight, 110)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>{tooltip.country}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${isDark ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"}`}>#{tooltip.rank}</span>
            </div>
            <p className="text-blue-500 font-bold text-base mt-0.5">
              {fmtEvSales(tooltip.sales)} <span className={`text-xs font-normal ${isDark ? "text-white/40" : "text-slate-400"}`}>vehicles</span>
            </p>
            <p className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
              {tooltip.sharePct.toFixed(1)}% of top {topN} countries' combined sales
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
