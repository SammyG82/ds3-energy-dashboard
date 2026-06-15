"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { EV_DISPLAY_NAMES, fmtEvSales, COUNTRY_COLORS, dn, TOP_5_MARKETS } from "@/lib/data";
import { tooltipStyle, useContainerSize, toggleSelection, drawHorizontalGridLines, drawForecastBoundary, useThemeRef, useChartTheme, drawCrosshair, drawTickDot, useEvForecastBoundary, FORECAST_DASH } from "@/lib/ui-utils";
import RegionPicker from "@/components/ui/RegionPicker";
import ChartLegend from "@/components/ui/ChartLegend";
import PreviewTooltip from "@/components/ui/PreviewTooltip";
import PinnedPanel from "@/components/ui/PinnedPanel";

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
    () => Array.from(new Set(data.map((d) => d.region_country)))
      .sort((a, b) => (EV_DISPLAY_NAMES[a] ?? a).localeCompare(EV_DISPLAY_NAMES[b] ?? b)),
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

  // 5-year intervals; EV chart spans ~2010–2035 (25 years)
  const tickYears = useMemo(
    () => Array.from(new Set(data.map((d) => d.year))).filter((yr) => yr % 5 === 0),
    [data]
  );

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
  useEffect(() => {
    setPinned(null);
    lastEmittedYearRef.current = null;
    setPreviewTooltip(null);
    setPreviewTooltipPos(null);
  }, [selected, containerWidth, data]);

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
      const actual: EvRow[] = [];
      const forecast: EvRow[] = [];
      for (const d of values) {
        if (d.year <= forecastBoundary) actual.push(d);
        if (d.year >= forecastBoundary) forecast.push(d);
      }
      if (actual.length >= 2)
        g.append("path").datum(actual)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);
      if (forecast.length >= 2)
        g.append("path").datum(forecast)
          .attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("stroke-dasharray", FORECAST_DASH).attr("d", line);
    });

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
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(containerWidth < 380 ? 4 : 6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => fmtEvSales(+v)).ticks(5));

    const crosshair = drawCrosshair(g, height, isDarkRef);

    let lastPinnedYear: number | null = null;
    const yearEntryMap = new Map<number, { region: string; value: number; color: string }[]>();
    for (const { region, values } of regionData) {
      const color = colorMap[region];
      for (const row of values) {
        const bucket = yearEntryMap.get(row.year);
        if (bucket) bucket.push({ region, value: row.ev_sales, color });
        else yearEntryMap.set(row.year, [{ region, value: row.ev_sales, color }]);
      }
    }
    for (const bucket of yearEntryMap.values()) {
      bucket.sort((a, b) => b.value - a.value);
    }

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

        const entries = yearEntryMap.get(year) ?? [];

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
          if (year !== lastPinnedYear) {
            lastPinnedYear = year;
            setPinned({ year, entries });
          }
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
            onToggle={(r) => {
              const next = toggleSelection(selected, r);
              setSelected(next);
              onSelectionChangeRef.current?.(next);
            }}
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
        <PinnedPanel
          isDark={isDark}
          emptyText="Tap or hover the chart to explore values by year"
          data={pinned ? {
            year: pinned.year,
            isForecast: pinned.year >= forecastBoundary,
            entries: pinned.entries.map(({ region, value, color }) => ({
              key: region,
              label: dn(region),
              value: fmtEvSales(value),
              color,
            })),
          } : null}
        />
      )}

    </div>
  );
}
