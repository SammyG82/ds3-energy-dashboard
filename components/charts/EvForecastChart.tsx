"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { EV_DISPLAY_NAMES, fmtEvSales, COUNTRY_COLORS, dn } from "@/lib/data";
import { tooltipStyle, useContainerSize, toggleSelection, drawHorizontalGridLines } from "@/lib/ui-utils";
import RegionPicker from "@/components/ui/RegionPicker";
import ForecastBadge from "@/components/ui/ForecastBadge";
import { TOP_5_MARKETS } from "@/lib/ev-presets";

interface Props {
  data: EvRow[];
  preview?: boolean;
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

export default function EvForecastChart({ data, preview = false, onYearChange, onSelectionChange }: Props) {
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
  useEffect(() => { setPinned(null); }, [selected, containerWidth]);
  useEffect(() => { setPreviewTooltip(null); setPreviewTooltipPos(null); }, [data, containerWidth]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0 || !selected.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: 56 };
    const totalH = preview ? 220 : 340;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(regionData.flatMap((r) => r.values), (d) => d.ev_sales) ?? 1])
      .nice()
      .range([height, 0]);

    drawHorizontalGridLines(g, y, width);

    if (isFinite(forecastBoundary)) {
      g.append("line")
        .attr("x1", x(forecastBoundary)).attr("x2", x(forecastBoundary))
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#94a3b8").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);

      g.append("text")
        .attr("x", x(forecastBoundary) + 4).attr("y", 12)
        .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
        .attr("fill", "#94a3b8")
        .text("Forecast →");
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
  }, [regionData, data, preview, colorMap, forecastBoundary, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Regions</p>
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
          />
        </div>
      )}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        {preview && previewTooltip && previewTooltipPos && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm"
            style={tooltipStyle(previewTooltipPos.x, previewTooltipPos.y, containerWidth, containerHeight, 150)}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-0.5">
              <p className="text-xs font-mono font-bold text-slate-500">{previewTooltip.year}</p>
              <ForecastBadge isForecast={previewTooltip.year >= forecastBoundary} />
            </div>
            {previewTooltip.entries.map(({ region, value, color }) => (
              <div key={region} className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-700 flex-1">{dn(region)}</span>
                <span className="text-xs font-mono font-semibold text-slate-900">{fmtEvSales(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!preview && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          {pinned ? (
            <>
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500">{pinned.year}</span>
                <ForecastBadge isForecast={pinned.year >= forecastBoundary} />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "clamp(120px, 25vh, 220px)" }}>
                {pinned.entries.map(({ region, value, color }) => (
                  <div key={region} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0">
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm text-slate-700 flex-1">{dn(region)}</span>
                    <span className="text-sm font-mono font-semibold text-slate-900">{fmtEvSales(value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 font-mono px-4 py-4 text-center">
              Hover over the chart to explore values by year
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 font-mono">
        Solid = Historical data &nbsp;·&nbsp; Dashed = IEA STEPS projected forecast
      </p>
    </div>
  );
}
