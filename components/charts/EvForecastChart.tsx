"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { EV_DISPLAY_NAMES, fmtEvSales, COUNTRY_COLORS, dn } from "@/lib/data";
import { tooltipStyle, useContainerSize, toggleSelection, drawHorizontalGridLines, drawForecastBoundary } from "@/lib/ui-utils";
import RegionPicker from "@/components/ui/RegionPicker";
import ForecastBadge from "@/components/ui/ForecastBadge";
import { TOP_5_MARKETS } from "@/lib/data";

interface Props {
  data: EvRow[];
  preview?: boolean;
  isDark?: boolean;
  onYearChange?: (year: number | null) => void;
  onSelectionChange?: (regions: string[]) => void;
}

interface PinnedState {
  year: number;
  entries: { region: string; value: number; color: string }[];
}

const REGION_COLORS = [
  "#2563eb", "#0891b2", "#7c3aed", "#e85d04",
  "#059669", "#db2777", "#ca8a04", "#dc2626",
  "#0284c7", "#9333ea", "#16a34a", "#ea580c",
  "#0d9488", "#be185d", "#d97706", "#b91c1c",
  "#1d4ed8", "#0e7490", "#6d28d9", "#065f46",
];

export default function EvForecastChart({ data, preview = false, isDark = false, onYearChange, onSelectionChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onYearChangeRef = useRef(onYearChange);
  useEffect(() => { onYearChangeRef.current = onYearChange; }, [onYearChange]);
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const [pinned, setPinned] = useState<PinnedState | null>(null);
  const [previewTooltip, setPreviewTooltip] = useState<PinnedState | null>(null);
  const [previewTooltipPos, setPreviewTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const allRegions = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_country))).sort(),
    [data]
  );

  const colorScale = useMemo(
    () => d3.scaleOrdinal<string>().domain(allRegions).range(REGION_COLORS),
    [allRegions]
  );

  const colorMap = useMemo(
    () => Object.fromEntries(allRegions.map((r) => [r, COUNTRY_COLORS[r] ?? colorScale(r)])),
    [allRegions, colorScale]
  );

  const defaultRegions = useMemo(() => {
    if (preview) return allRegions.filter((r) => TOP_5_MARKETS.includes(r));
    const top5 = TOP_5_MARKETS.filter((r) => allRegions.includes(r));
    return top5.length > 0 ? top5 : allRegions.slice(0, 5);
  }, [allRegions, preview]);

  const forecastBoundary = useMemo(() => {
    const years = data.filter((d) => d.type === "Forecast").map((d) => d.year);
    return years.length > 0 ? Math.min(...years) : Infinity;
  }, [data]);

  const [selected, setSelected] = useState<string[]>(() => defaultRegions);

  const ariaLabel = useMemo(() => {
    if (!selected.length || !data.length) return "EV sales forecast: no regions selected.";
    const histYear = isFinite(forecastBoundary) ? forecastBoundary - 1 : null;
    if (histYear === null) return `EV sales forecast for ${selected.map(dn).join(", ")}. Data from 2010, projected to 2035.`;
    const leaderEntry = selected
      .map((r) => {
        const row = data.find((d) => d.region_country === r && d.year === histYear);
        return row ? { region: r, value: row.ev_sales } : null;
      })
      .filter((e): e is { region: string; value: number } => e !== null)
      .sort((a, b) => b.value - a.value)[0];
    const regionNames = selected.map(dn).join(", ");
    if (!leaderEntry) return `EV sales forecast for ${regionNames}. Data from 2010, projected to 2035.`;
    return `EV sales forecast for ${regionNames}: ${dn(leaderEntry.region)} leads with ${fmtEvSales(leaderEntry.value)} vehicles in ${histYear}. Projected through 2035.`;
  }, [data, selected, forecastBoundary]);

  const regionData = useMemo(
    () => selected.map((r) => ({
      region: r,
      values: data.filter((d) => d.region_country === r).sort((a, b) => a.year - b.year),
    })),
    [data, selected]
  );

  useEffect(() => {
    setSelected(defaultRegions);
    onSelectionChangeRef.current?.(defaultRegions);
  }, [defaultRegions]);
  useEffect(() => { setPinned(null); }, [selected, containerWidth, data]);
  useEffect(() => { setPreviewTooltip(null); setPreviewTooltipPos(null); }, [data, selected, containerWidth]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0 || !selected.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: 56 };
    const totalH = preview ? 300 : 340;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [minYear = 2010, maxYear = 2035] = d3.extent(data, (d) => d.year);
    const x = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(regionData.flatMap((r) => r.values), (d) => d.ev_sales) ?? 1])
      .nice()
      .range([height, 0]);

    drawHorizontalGridLines(g, y, width, 5, isDark);

    if (isFinite(forecastBoundary)) {
      drawForecastBoundary(g, x, forecastBoundary, height);
    }

    const line = d3.line<EvRow>()
      .x((d) => x(d.year))
      .y((d) => y(d.ev_sales))
      .curve(d3.curveMonotoneX);

    regionData.forEach(({ region, values }) => {
      const color = colorMap[region];
      const actual = values.filter((d) => d.year <= forecastBoundary);
      const forecast = values.filter((d) => d.year >= forecastBoundary);
      if (actual.length > 1)
        g.append("path").datum(actual)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);
      if (forecast.length > 1)
        g.append("path").datum(forecast)
          .attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("stroke-dasharray", "6 3").attr("d", line);
    });

    const tickYears = Array.from(new Set(data.map((d) => d.year))).filter((yr) => yr % 5 === 0);
    regionData.forEach(({ region, values }) => {
      const color = colorMap[region];
      tickYears.forEach((yr) => {
        const row = values.find((d) => d.year === yr);
        if (!row) return;
        g.append("circle")
          .attr("cx", x(yr)).attr("cy", y(row.ev_sales)).attr("r", 3)
          .attr("fill", isDark ? "#000" : "#fff").attr("stroke", color).attr("stroke-width", 2)
          .style("pointer-events", "none");
      });
    });

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => fmtEvSales(+v)).ticks(5));

    const crosshair = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#64748b").attr("stroke-width", 1).attr("stroke-dasharray", "4 2")
      .style("visibility", "hidden").style("pointer-events", "none");

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "none").attr("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const rawYear = x.invert(mx);
        const [xMin, xMax] = x.domain();
        const year = Math.round(Math.max(xMin, Math.min(xMax, rawYear)));
        const px = x(year);

        crosshair.style("visibility", "visible").attr("x1", px).attr("x2", px);

        const entries = regionData
          .map(({ region, values }) => ({
            region,
            value: values.find((d) => d.year === year)?.ev_sales ?? 0,
            color: colorMap[region],
          }))
          .filter((e) => e.value > 0)
          .sort((a, b) => b.value - a.value);

        if (!entries.length) {
          crosshair.style("visibility", "hidden");
          if (preview) { setPreviewTooltip(null); setPreviewTooltipPos(null); }
          else { setPinned(null); onYearChangeRef.current?.(null); }
          return;
        }

        if (preview) {
          const [cmx, cmy] = d3.pointer(event, containerRef.current);
          setPreviewTooltip({ year, entries });
          setPreviewTooltipPos({ x: cmx, y: cmy });
        } else {
          setPinned({ year, entries });
          onYearChangeRef.current?.(year);
        }
      })
      .on("mouseleave", function () {
        crosshair.style("visibility", "hidden");
        if (preview) {
          setPreviewTooltip(null);
          setPreviewTooltipPos(null);
        } else {
          onYearChangeRef.current?.(null);
        }
      });
  }, [regionData, data, preview, isDark, colorMap, forecastBoundary, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <div className="flex flex-col gap-2">
          <p className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Regions</p>
          <RegionPicker
            options={allRegions}
            selected={selected}
            onToggle={(r) =>
              setSelected((prev) => {
                const next = toggleSelection(prev, r);
                onSelectionChangeRef.current?.(next);
                return next;
              })
            }
            onSelectGroup={(regions) => {
              const next = regions.length > 0 ? regions : allRegions.slice(0, 1);
              setSelected(next);
              onSelectionChangeRef.current?.(next);
            }}
            colorMap={colorMap}
            displayNames={EV_DISPLAY_NAMES}
            isDark={isDark}
          />
        </div>
      )}

      <div className={`flex justify-end text-[11px] ${isDark ? "text-white/40" : "text-slate-400"}`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="block w-4 h-[1.5px] rounded-full bg-current" aria-hidden="true" />
            Historical
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="3" viewBox="0 0 16 3" className="shrink-0" aria-hidden="true">
              <line x1="0" y1="1.5" x2="16" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2.5" strokeLinecap="round" />
            </svg>
            IEA STEPS Forecast
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        {preview && previewTooltip && previewTooltipPos && (
          <div
            className={`absolute rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm border ${isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200"}`}
            style={tooltipStyle(previewTooltipPos.x, previewTooltipPos.y, containerWidth, containerHeight, 150)}
          >
            <div className={`flex items-center gap-2 border-b pb-1.5 mb-0.5 ${isDark ? "border-white/10" : "border-slate-100"}`}>
              <p className={`text-xs font-mono font-bold ${isDark ? "text-white/60" : "text-slate-500"}`}>{previewTooltip.year}</p>
              <ForecastBadge isForecast={previewTooltip.year >= forecastBoundary} isDark={isDark} />
            </div>
            {previewTooltip.entries.map(({ region, value, color }) => (
              <div key={region} className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className={`text-xs flex-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{dn(region)}</span>
                <span className={`text-xs font-mono font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{fmtEvSales(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!preview && (
        <div className={`border rounded-xl overflow-hidden ${isDark ? "border-white/10 bg-slate-800" : "border-slate-200 bg-white"}`}>
          {pinned ? (
            <>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${isDark ? "border-white/10" : "border-slate-100"}`}>
                <span className={`text-xs font-mono font-bold ${isDark ? "text-white/60" : "text-slate-500"}`}>{pinned.year}</span>
                <ForecastBadge isForecast={pinned.year >= forecastBoundary} isDark={isDark} />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "clamp(120px, 25vh, 220px)" }}>
                {pinned.entries.map(({ region, value, color }) => (
                  <div key={region} className={`flex items-center gap-3 px-4 py-2 border-b last:border-0 ${isDark ? "border-white/5" : "border-slate-50"}`}>
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`text-sm flex-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{dn(region)}</span>
                    <span className={`text-sm font-mono font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{fmtEvSales(value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={`text-xs px-4 py-4 text-center ${isDark ? "text-white/40" : "text-slate-400"}`}>
              Hover over the chart to explore values by year
            </p>
          )}
        </div>
      )}

    </div>
  );
}
