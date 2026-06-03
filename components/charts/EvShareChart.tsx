"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { fmtEvSales, COUNTRY_COLORS, dn, AGGREGATES } from "@/lib/data";
import { tooltipStyle, useContainerSize, useThemeRef, useEvForecastBoundary, CHART_TEXT } from "@/lib/ui-utils";
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
  isAggregate?: boolean;
}

const DEFAULT_COLOR = "#94a3b8";
const EU27_OPACITY = 0.15;
const BAR_OPACITY = 0.85;

export default function EvShareChart({ data, preview = false, isDark = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const isDarkRef = useThemeRef(isDark);
  const prevSvgParamsRef = useRef<{ containerWidth: number; preview: boolean; data: EvRow[] } | null>(null);

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
  }, [year, data, containerWidth, excluded]);

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

  // EU27 injected separately so it appears in its natural rank position without
  // being counted in the stat card totals (it overlaps with individual EU countries).
  const eu27Row = useMemo(
    () => !excluded.has("EU27")
      ? (data.find((d) => d.year === year && d.region_country === "EU27") ?? null)
      : null,
    [data, year, excluded]
  );

  const displayRows = useMemo(() => {
    if (!eu27Row) return filtered;
    return [...filtered, eu27Row].sort((a, b) => b.ev_sales - a.ev_sales);
  }, [filtered, eu27Row]);

  // total intentionally excludes EU27 — it overlaps with individual EU country bars
  const total = useMemo(() => d3.sum(filtered, (d) => d.ev_sales), [filtered]);

  const displayNameMap = useMemo(
    () => new Map(displayRows.map((d) => [d.region_country, dn(d.region_country)])),
    [displayRows]
  );

  const forecastBoundary = useEvForecastBoundary(data);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !displayRows.length || containerWidth === 0) return;

    const prev = prevSvgParamsRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !reducedMotion && (!prev || prev.containerWidth !== containerWidth || prev.preview !== preview || prev.data !== data);
    prevSvgParamsRef.current = { containerWidth, preview, data };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const isNarrow = containerWidth < 420;
    const margin = { top: 8, right: isNarrow ? 46 : 52, bottom: 8, left: isNarrow ? 95 : (preview ? 105 : 115) };
    const axisFontSize = isNarrow ? "10px" : "11px";
    const barH = 28;
    const gap = 4;
    const height = displayRows.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(displayRows, (d) => d.ev_sales) ?? 1]).range([0, width]);
    const y = d3.scaleBand()
      .domain(displayRows.map((d) => displayNameMap.get(d.region_country) ?? dn(d.region_country)))
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

    const euColor = isDarkRef.current ? "#6699ff" : (COUNTRY_COLORS["EU27"] ?? "#003399");

    const barsSel = g.selectAll<SVGRectElement, EvRow>(".bar")
      .data(displayRows)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => y(displayNameMap.get(d.region_country) ?? dn(d.region_country)) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => d.region_country === "EU27" ? euColor : (COUNTRY_COLORS[d.region_country] ?? DEFAULT_COLOR))
      .attr("fill-opacity", (d) => d.region_country === "EU27" ? EU27_OPACITY : BAR_OPACITY)
      .attr("stroke", (d) => d.region_country === "EU27" ? euColor : "none")
      .attr("stroke-width", (d) => d.region_country === "EU27" ? 2 : 0)
      .attr("width", 0);

    barsSel
      .attr("cursor", "pointer")
      .on("pointerover", function (event, d) {
        const isEU = d.region_country === "EU27";
        barsSel
          .attr("fill-opacity", (r) => r.region_country === "EU27" ? 0.08 : 0.3)
          .attr("stroke", (r) => r.region_country === "EU27" ? euColor : "none")
          .attr("stroke-width", (r) => r.region_country === "EU27" ? 2 : 0);
        d3.select(this)
          .attr("fill-opacity", isEU ? 0.3 : 1.0)
          .attr("stroke", isDarkRef.current ? "#94a3b8" : "#1e293b")
          .attr("stroke-width", isEU ? 2 : 1.5);
        const rank = filtered.findIndex((r) => r.region_country === d.region_country) + 1;
        setTooltip({ country: dn(d.region_country), sales: d.ev_sales, sharePct: total > 0 ? (d.ev_sales / total) * 100 : 0, rank, isAggregate: isEU });
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
      })
      .on("pointermove", function (event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
      })
      .on("pointerleave", function () {
        barsSel
          .attr("fill-opacity", (d) => d.region_country === "EU27" ? EU27_OPACITY : BAR_OPACITY)
          .attr("stroke", (d) => d.region_country === "EU27" ? euColor : "none")
          .attr("stroke-width", (d) => d.region_country === "EU27" ? 2 : 0);
        setTooltip(null);
        setTooltipPos(null);
      })
      .on("click", (_event, d) => {
        setTooltip(null);
        setTooltipPos(null);
        setExcluded((prev) => new Set([...prev, d.region_country]));
      });

    barsSel
      .attr("tabindex", "0")
      .attr("role", "button")
      .attr("aria-label", (d) => `${dn(d.region_country)}: ${fmtEvSales(d.ev_sales)} vehicles — click to hide`)
      .on("keydown", function (event, d) {
        const e = event as KeyboardEvent;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setTooltip(null);
          setTooltipPos(null);
          setExcluded((prev) => new Set([...prev, d.region_country]));
        }
      })
      .on("focus", function () { d3.select(this).style("outline", `2px solid ${isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light}`).style("outline-offset", "2px"); })
      .on("blur", function () { d3.select(this).style("outline", null).style("outline-offset", null); });

    barsSel
      .attr("width", animate ? 0 : (d) => x(d.ev_sales))
      .transition().duration(animate ? 600 : 0).ease(d3.easeCubicOut)
      .attr("width", (d) => x(d.ev_sales));

    g.selectAll(".bar-label")
      .data(displayRows)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", animate ? 0 : (d) => x(d.ev_sales) + 5)
      .attr("y", (d) => (y(displayNameMap.get(d.region_country) ?? dn(d.region_country)) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", axisFontSize)
      .attr("fill", isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light)
      .attr("opacity", animate ? 0 : 1)
      .attr("pointer-events", "none")
      .text((d) => fmtEvSales(d.ev_sales))
      .transition().duration(animate ? 600 : 0).ease(d3.easeCubicOut)
      .attr("x", (d) => x(d.ev_sales) + 5)
      .attr("opacity", 1);

    g.append("g")
      .attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .selectAll<SVGTextElement, string>("text")
      .attr("dx", -6)
      .attr("font-size", axisFontSize)
      .attr("fill", isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light)
      .attr("cursor", "pointer")
      .attr("tabindex", "0")
      .attr("role", "button")
      .attr("aria-label", (countryDisplay) => `Hide ${countryDisplay}`)
      .on("click", (_event, countryDisplay) => {
        const row = displayRows.find((d) => dn(d.region_country) === countryDisplay);
        if (row) {
          setTooltip(null);
          setTooltipPos(null);
          setExcluded((prev) => new Set([...prev, row.region_country]));
        }
      })
      .on("keydown", function (event, countryDisplay) {
        const e = event as KeyboardEvent;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const row = displayRows.find((d) => dn(d.region_country) === countryDisplay);
          if (row) {
            setTooltip(null);
            setTooltipPos(null);
            setExcluded((prev) => new Set([...prev, row.region_country]));
          }
        }
      })
      .on("focus", function () { d3.select(this).style("outline", `2px solid ${isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light}`).style("outline-offset", "2px"); })
      .on("blur", function () { d3.select(this).style("outline", null).style("outline-offset", null); })
      .each(function (countryDisplay) {
        if (countryDisplay !== dn("EU27")) return;
        d3.select(this)
          .append("tspan")
          .attr("dy", "-1px")
          .attr("dx", "1px")
          .attr("font-size", "14px")
          .attr("aria-hidden", "true")
          .text("*");
      });
  }, [displayRows, preview, containerWidth, total]);

  // Update only colours when theme changes — no redraw, no animation restart
  useEffect(() => {
    if (!svgRef.current || containerWidth === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll(".chart-grid-line").attr("stroke", isDark ? "#334155" : "#e2e8f0");
    svg.selectAll<SVGTextElement, unknown>(".bar-label").attr("fill", isDark ? CHART_TEXT.dark : CHART_TEXT.light);
    svg.selectAll<SVGTextElement, unknown>(".chart-axis text").attr("fill", isDark ? CHART_TEXT.dark : CHART_TEXT.light);
    const euColor = isDark ? "#6699ff" : (COUNTRY_COLORS["EU27"] ?? "#003399");
    svg.selectAll<SVGRectElement, EvRow>(".bar")
      .filter((d) => d.region_country === "EU27")
      .attr("fill", euColor)
      .attr("stroke", euColor);
  }, [isDark]);

  // Keep excluded-count label accurate for EU27
  const excludedCountries = useMemo(
    () => [...excluded].filter((r) => r !== "EU27"),
    [excluded]
  );
  const eu27Hidden = excluded.has("EU27");

  const leader = filtered[0];

  const ariaLabel = useMemo(() => {
    if (!leader) return "EV sales rankings: no data available.";
    const projected = year >= forecastBoundary ? "Projected " : "";
    const eu27Note = eu27Row ? ` EU regional total: ${fmtEvSales(eu27Row.ev_sales)}.` : "";
    return `${projected}EV sales rankings for ${year}: ${dn(leader.region_country)} leads with ${fmtEvSales(leader.ev_sales)} vehicles. Top ${topN} countries combined: ${fmtEvSales(total)}.${eu27Note}`;
  }, [year, forecastBoundary, leader, topN, total, eu27Row]);

  const isProjected = year >= forecastBoundary;
  const excludedLabel = excludedCountries.length > 0 ? ` (excl. ${excludedCountries.length})` : "";

  const yearSlider = years.length > 0 ? (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Year</span>
        <span className={`ml-auto text-sm font-mono font-bold w-10 text-right ${isDark ? "text-teal-400" : "text-teal-600"}`}>{year}</span>
        <ForecastBadge isForecast={isProjected} isDark={isDark} />
      </div>
      <input
        type="range"
        min={years[0]}
        max={years[years.length - 1]}
        step="1"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="w-full focus:outline-none focus:ring-2 focus:ring-slate-500"
        aria-label="Select year"
      />
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

      {(excludedCountries.length > 0 || eu27Hidden) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
            {[
              excludedCountries.length > 0 && `${excludedCountries.length} ${excludedCountries.length === 1 ? "country" : "countries"} hidden`,
              eu27Hidden && "EU hidden",
            ].filter(Boolean).join(" · ")} — click a bar or name to hide, or
          </span>
          <button
            type="button"
            aria-label="Reset all hidden countries"
            onClick={() => setExcluded(new Set())}
            className={`text-xs font-medium px-2 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDark ? "bg-white/10 text-white/70 hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Reset
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full relative" style={{ touchAction: "manipulation" }}>
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center gap-3 py-16 rounded-xl border ${isDark ? "border-white/10 text-white/40" : "border-slate-200 text-slate-400"}`}>
            <span className="text-sm">All countries hidden.</span>
            <button
              type="button"
              aria-label="Reset all hidden countries"
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
            aria-hidden="true"
            className={`absolute rounded-xl px-4 py-3 flex flex-col gap-1 pointer-events-none min-w-36 shadow-sm border ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
            style={tooltipStyle(tooltipPos.x, tooltipPos.y, containerWidth, containerHeight, 110)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>{tooltip.country}</span>
              <div className="flex items-center gap-1.5">
                {tooltip.isAggregate && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>Aggregate</span>
                )}
                {!tooltip.isAggregate && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${isDark ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"}`}>#{tooltip.rank}</span>
                )}
              </div>
            </div>
            <p className={`font-bold text-base mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
              {fmtEvSales(tooltip.sales)} <span className={`text-xs font-normal ${isDark ? "text-white/40" : "text-slate-400"}`}>vehicles</span>
            </p>
            {tooltip.isAggregate ? (
              <p className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
                Regional aggregate — overlaps with individual EU countries shown
              </p>
            ) : (
              <p className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
                {tooltip.sharePct.toFixed(1)}% of top {topN} countries' combined sales
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
