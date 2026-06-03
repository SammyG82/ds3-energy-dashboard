"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { EV_DISPLAY_NAMES, fmtEvSales, COUNTRY_COLORS, dn, TOP_5_MARKETS } from "@/lib/data";
import { tooltipStyle, useContainerSize, toggleSelection, drawHorizontalGridLines, drawForecastBoundary, useThemeRef, useChartTheme, drawCrosshair, drawTickDot, useEvForecastBoundary, CHART_TEXT, FORECAST_DASH } from "@/lib/ui-utils";
import RegionPicker from "@/components/ui/RegionPicker";
import ForecastBadge from "@/components/ui/ForecastBadge";
import ChartLegend from "@/components/ui/ChartLegend";
import PreviewTooltip from "@/components/ui/PreviewTooltip";

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


export default function EvForecastChart({ data, preview = false, isDark = false, onYearChange, onSelectionChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onYearChangeRef = useRef(onYearChange);
  useEffect(() => { onYearChangeRef.current = onYearChange; }, [onYearChange]);
  const lastEmittedYearRef = useRef<number | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const isDarkRef = useThemeRef(isDark);
  const [pinned, setPinned] = useState<PinnedState | null>(null);
  const [previewTooltip, setPreviewTooltip] = useState<PinnedState | null>(null);
  const [previewTooltipPos, setPreviewTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const allRegions = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_country))).sort(),
    [data]
  );

  const colorMap = useMemo(
    () => Object.fromEntries(allRegions.map((r) => [r, COUNTRY_COLORS[r] ?? "#94a3b8"])),
    [allRegions]
  );

  const defaultRegions = useMemo(() => {
    const top5 = TOP_5_MARKETS.filter((r) => allRegions.includes(r));
    return top5.length > 0 ? top5 : allRegions.slice(0, 5);
  }, [allRegions]);

  const forecastBoundary = useEvForecastBoundary(data);

  const [selected, setSelected] = useState<string[]>(() => defaultRegions);

  const ariaLabel = useMemo(() => {
    if (!selected.length || !data.length) return "EV sales forecast: no regions selected.";
    const [minYear, maxYear] = d3.extent(data, (d) => d.year);
    const regionNames = selected.map(dn).join(", ");
    const histYear = isFinite(forecastBoundary) ? forecastBoundary - 1 : null;
    if (histYear === null) return `EV sales forecast for ${regionNames}. Data from ${minYear ?? 2010}, projected to ${maxYear ?? 2035}.`;
    const leaderEntry = selected
      .map((r) => {
        const row = data.find((d) => d.region_country === r && d.year === histYear);
        return row ? { region: r, value: row.ev_sales } : null;
      })
      .filter((e): e is { region: string; value: number } => e !== null)
      .sort((a, b) => b.value - a.value)[0];
    if (!leaderEntry) return `EV sales forecast for ${regionNames}. Data from ${minYear ?? 2010}, projected to ${maxYear ?? 2035}.`;
    return `EV sales forecast for ${regionNames}: ${dn(leaderEntry.region)} leads with ${fmtEvSales(leaderEntry.value)} vehicles in ${histYear}. Projected to ${maxYear ?? 2035}.`;
  }, [data, selected, forecastBoundary]);

  const regionData = useMemo(
    () => selected.map((r) => ({
      region: r,
      values: data.filter((d) => d.region_country === r).sort((a, b) => a.year - b.year),
    })),
    [data, selected]
  );

  useEffect(() => {
    if (!defaultRegions.length) return;
    setSelected(defaultRegions);
    onSelectionChangeRef.current?.(defaultRegions);
  }, [defaultRegions]);
  useEffect(() => { setPinned(null); lastEmittedYearRef.current = null; }, [selected, containerWidth, data, preview]);
  useEffect(() => { setPreviewTooltip(null); setPreviewTooltipPos(null); }, [data, selected, containerWidth]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0 || !regionData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: containerWidth < 380 ? 42 : 56 };
    const totalH = preview ? 300 : (containerWidth < 480 ? 260 : 340);
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

    drawHorizontalGridLines(g, y, width, 5, isDarkRef.current);

    if (isFinite(forecastBoundary)) {
      drawForecastBoundary(g, x, forecastBoundary, height, isDarkRef.current);
    }

    const line = d3.line<EvRow>()
      .x((d) => x(d.year))
      .y((d) => y(d.ev_sales))
      .curve(d3.curveMonotoneX);

    regionData.forEach(({ region, values }) => {
      const color = colorMap[region];
      const actual = values.filter((d) => d.year <= forecastBoundary);
      const forecast = values.filter((d) => d.year >= forecastBoundary);
      if (actual.length >= 2)
        g.append("path").datum(actual)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);
      if (forecast.length >= 2)
        g.append("path").datum(forecast)
          .attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("stroke-dasharray", FORECAST_DASH).attr("d", line);
    });

    const tickYears = Array.from(new Set(data.map((d) => d.year))).filter((yr) => yr % 5 === 0);
    regionData.forEach(({ region, values }) => {
      const color = colorMap[region];
      const byYr = new Map(values.map((d) => [d.year, d]));
      tickYears.forEach((yr) => {
        const row = byYr.get(yr);
        if (!row) return;
        drawTickDot(g, x(yr), y(row.ev_sales), color, isDarkRef);
      });
    });

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(containerWidth < 380 ? 4 : 6))
      .selectAll("text").attr("fill", isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light);

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => fmtEvSales(+v)).ticks(5))
      .selectAll("text").attr("fill", isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light);

    const crosshair = drawCrosshair(g, height, isDarkRef);

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "none").attr("pointer-events", "all")
      .on("pointermove", function (event) {
        const [mx] = d3.pointer(event);
        const rawYear = x.invert(mx);
        const [xMin, xMax] = x.domain();
        const year = Math.round(Math.max(xMin, Math.min(xMax, rawYear)));
        const px = x(year);

        crosshair.style("visibility", "visible").attr("x1", px).attr("x2", px);

        const entries = regionData
          .flatMap(({ region, values }) => {
            const row = values.find((d) => d.year === year);
            if (!row) return [];
            return [{ region, value: row.ev_sales, color: colorMap[region] }];
          })
          .sort((a, b) => b.value - a.value);

        if (!entries.length) {
          crosshair.style("visibility", "hidden");
          if (preview) { setPreviewTooltip(null); setPreviewTooltipPos(null); }
          // Non-preview: keep pinned frozen at last valid year — do not reset
          return;
        }

        if (preview) {
          const [cmx, cmy] = d3.pointer(event, containerRef.current);
          setPreviewTooltip({ year, entries });
          setPreviewTooltipPos({ x: cmx, y: cmy });
        } else {
          setPinned({ year, entries });
          if (lastEmittedYearRef.current !== year) {
            lastEmittedYearRef.current = year;
            onYearChangeRef.current?.(year);
          }
        }
      })
      .on("pointerleave", function () {
        crosshair.style("visibility", "hidden");
        if (preview) {
          setPreviewTooltip(null);
          setPreviewTooltipPos(null);
        }
      });
  }, [regionData, data, preview, colorMap, forecastBoundary, containerWidth]);

  useChartTheme(svgRef, isDark);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <div className="flex flex-col gap-2">
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
              const next = regions.length > 0 ? regions : defaultRegions.length > 0 ? defaultRegions : allRegions.slice(0, 5);
              setSelected(next);
              onSelectionChangeRef.current?.(next);
            }}
            colorMap={colorMap}
            displayNames={EV_DISPLAY_NAMES}
            isDark={isDark}
          />
        </div>
      )}

      <ChartLegend isDark={isDark} forecastLabel="DS3 S-curve Forecast" />

      <div ref={containerRef} className="w-full relative" style={{ touchAction: "pan-y" }}>
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        {preview && previewTooltip && previewTooltipPos && (
          <PreviewTooltip
            year={previewTooltip.year}
            isForecast={previewTooltip.year >= forecastBoundary}
            entries={previewTooltip.entries.map(({ region, value, color }) => ({
              key: region,
              label: dn(region),
              value: fmtEvSales(value),
              color,
            }))}
            isDark={isDark}
            style={tooltipStyle(previewTooltipPos.x, previewTooltipPos.y, containerWidth, containerHeight, 150, 240)}
          />
        )}
      </div>

      {!preview && (
        <div className={`border rounded-xl overflow-hidden ${isDark ? "border-white/10 bg-white/10" : "border-slate-200 bg-white"}`}>
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
              Tap or hover the chart to explore values by year
            </p>
          )}
        </div>
      )}

    </div>
  );
}
