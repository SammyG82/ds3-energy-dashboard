"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { EV_DISPLAY_NAMES, fmtEvSales } from "@/lib/data";
import RegionPicker from "@/components/ui/RegionPicker";

interface Props {
  data: EvRow[];
  preview?: boolean;
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

const dn = (r: string) => EV_DISPLAY_NAMES[r] ?? r;

const DEFAULT_FORECAST_BOUNDARY = 2025;
const TOP_5_MARKETS = ["China", "USA", "Germany", "France", "United Kingdom"];

export default function EvForecastChart({ data, preview = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
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
    () => Object.fromEntries(allRegions.map((r) => [r, colorScale(r)])),
    [allRegions, colorScale]
  );

  const defaultRegions = useMemo(() => {
    if (preview) return allRegions.filter((r) => TOP_5_MARKETS.includes(r));
    const top5 = TOP_5_MARKETS.filter((r) => allRegions.includes(r));
    return top5.length > 0 ? top5 : allRegions.slice(0, 5);
  }, [allRegions, preview]);

  const forecastBoundary = useMemo(
    () => data.find((d) => d.type === "Forecast")?.year ?? DEFAULT_FORECAST_BOUNDARY,
    [data]
  );

  const [selected, setSelected] = useState<string[]>(() => defaultRegions);

  useEffect(() => { setSelected(defaultRegions); }, [defaultRegions]);
  useEffect(() => { setPinned(null); }, [selected]);
  useEffect(() => { setPinned(null); setPreviewTooltip(null); setPreviewTooltipPos(null); }, [data]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      setContainerWidth(Math.floor(entries[0].contentRect.width));
      setContainerHeight(Math.floor(entries[0].contentRect.height));
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

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

    const regionData = selected.map((r) => ({
      region: r,
      values: data.filter((d) => d.region_country === r).sort((a, b) => a.year - b.year),
    }));

    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(regionData.flatMap((r) => r.values), (d) => d.ev_sales) ?? 1])
      .nice()
      .range([height, 0]);

    g.selectAll(".grid-h")
      .data(y.ticks(5))
      .enter().append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    g.append("line")
      .attr("x1", x(forecastBoundary)).attr("x2", x(forecastBoundary))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#94a3b8").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);

    g.append("text")
      .attr("x", x(forecastBoundary) + 4).attr("y", 12)
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#94a3b8")
      .text("Forecast →");

    const line = d3.line<EvRow>()
      .x((d) => x(d.year))
      .y((d) => y(d.ev_sales))
      .curve(d3.curveMonotoneX);

    regionData.forEach(({ region, values }) => {
      const color = colorScale(region);
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
      .call(d3.axisLeft(y).tickFormat((v) => {
        const n = +v;
        return n >= 1_000_000 ? (n / 1_000_000).toFixed(0) + "M"
          : n >= 1_000 ? (n / 1_000).toFixed(0) + "k"
          : n.toFixed(0);
      }).ticks(5));

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
            color: colorScale(region),
          }))
          .filter((e) => e.value > 0)
          .sort((a, b) => b.value - a.value);

        if (preview) {
          const [cmx, cmy] = d3.pointer(event, containerRef.current);
          setPreviewTooltip({ year, entries });
          setPreviewTooltipPos({ x: cmx, y: cmy });
        } else {
          setPinned({ year, entries });
        }
      })
      .on("mouseleave", function () {
        crosshair.style("visibility", "hidden");
        if (preview) {
          setPreviewTooltip(null);
          setPreviewTooltipPos(null);
        }
      });
  }, [data, selected, preview, colorScale, forecastBoundary, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Regions</p>
          <RegionPicker
            options={allRegions}
            selected={selected}
            onToggle={(r) =>
              setSelected((prev) =>
                prev.includes(r)
                  ? prev.length > 1 ? prev.filter((x) => x !== r) : prev
                  : [...prev, r]
              )
            }
            onSelectGroup={(regions) => setSelected(regions.length > 0 ? regions : allRegions.slice(0, 1))}
            colorMap={colorMap}
            displayNames={EV_DISPLAY_NAMES}
          />
        </div>
      )}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Multi-line S-curve chart of EV sales by region" />
        {preview && previewTooltip && previewTooltipPos && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm"
            style={{
              left: previewTooltipPos.x < containerWidth * 0.6 ? previewTooltipPos.x + 14 : undefined,
              right: previewTooltipPos.x >= containerWidth * 0.6 ? containerWidth - previewTooltipPos.x + 14 : undefined,
              top: Math.max(4, Math.min(previewTooltipPos.y - 10, containerHeight - 150)),
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-0.5">
              <p className="text-xs font-mono font-bold text-slate-500">{previewTooltip.year}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${previewTooltip.year >= forecastBoundary ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {previewTooltip.year >= forecastBoundary ? "Projected forecast" : "Historical data"}
              </span>
            </div>
            {previewTooltip.entries.map(({ region, value, color }) => (
              <div key={region} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${pinned.year >= forecastBoundary ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {pinned.year >= forecastBoundary ? "Projected forecast" : "Historical data"}
                </span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                {pinned.entries.map(({ region, value, color }) => (
                  <div key={region} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
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
        Solid = Historical data &nbsp;·&nbsp; Dashed = S-curve projected forecast
      </p>
    </div>
  );
}
