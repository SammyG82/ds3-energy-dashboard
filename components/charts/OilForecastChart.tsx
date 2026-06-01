"use client";

import { useEffect, useRef, useState, useMemo, useId } from "react";
import * as d3 from "d3";
import type { OilRow } from "@/lib/data";
import { COUNTRY_COLORS } from "@/lib/data";
import RegionPicker, { PresetItem } from "@/components/ui/RegionPicker";
import { tooltipStyle, useContainerSize, toggleSelection, drawHorizontalGridLines, drawForecastBoundary, useThemeRef, useChartTheme, drawCrosshair, drawTickDot } from "@/lib/ui-utils";
import ForecastBadge from "@/components/ui/ForecastBadge";
import StatCard from "@/components/ui/StatCard";
import ChartLegend from "@/components/ui/ChartLegend";
import PreviewTooltip from "@/components/ui/PreviewTooltip";
import { OIL_IMPORT_PRESETS } from "@/lib/oil-presets";

const OIL_DISPLAY: Record<string, string> = { Korea: "South Korea" };
const dn = (c: string) => OIL_DISPLAY[c] ?? c;

interface Props {
  data: OilRow[];
  preview?: boolean;
  isDark?: boolean;
  datasetLabel?: "Oil Imports (KBD)" | "Net Trade (KBD)" | "Oil Exports (KBD)";
  chartPresets?: PresetItem[];
  statYear?: number;
}

interface Pinned {
  year: number;
  isForecast: boolean;
  entries: { country: string; value: number; color: string }[];
}

const PREVIEW_COUNTRIES = ["China", "India", "USA", "Japan", "Korea"];


export default function OilForecastChart({ data, preview = false, isDark = false, datasetLabel = "Oil Imports (KBD)", chartPresets, statYear }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = `oil-ci-clip-${useId().replace(/:/g, "")}`;
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const isDarkRef = useThemeRef(isDark);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [previewTooltip, setPreviewTooltip] = useState<Pinned | null>(null);
  const [previewTooltipPos, setPreviewTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const allCountries = useMemo(
    () => Array.from(new Set(data.map((d) => d.Country))).sort(),
    [data]
  );

  const forecastBoundary = useMemo(
    () => data.find((d) => d.Type === "Forecast")?.Year,
    [data]
  );

  const [selected, setSelected] = useState<string[]>(
    () => preview ? allCountries.filter((c) => PREVIEW_COUNTRIES.includes(c)) : allCountries
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    setSelected(preview ? allCountries.filter((c) => PREVIEW_COUNTRIES.includes(c)) : allCountries);
  }, [allCountries, preview]);

  useEffect(() => {
    setPinned(null);
    setPreviewTooltip(null);
    setPreviewTooltipPos(null);
  }, [data, selectedSet, containerWidth]);

  const { latestHistYear, statDisplayYear } = useMemo(() => {
    const histYear = forecastBoundary !== undefined
      ? forecastBoundary - 1
      : data.reduce((max, d) => d.Type === "Historical" && d.Year > max ? d.Year : max, 0);
    return { latestHistYear: histYear, statDisplayYear: statYear ?? histYear };
  }, [data, forecastBoundary, statYear]);

  const { latestTotal, leader } = useMemo(() => {
    const latest = data.filter((d) => d.Year === statDisplayYear && selectedSet.has(d.Country));
    const total = latest.reduce((s, d) => s + (Number.isFinite(d.value) ? d.value : 0), 0);
    const top = [...latest].sort((a, b) => b.value - a.value)[0];
    return { latestTotal: total, leader: top };
  }, [data, selectedSet, statDisplayYear]);

  const ariaLabel = useMemo(() => {
    if (!selected.length || !data.length) return `${datasetLabel}: no countries selected.`;
    const regionNames = selected.map(dn).join(", ");
    const maxDataYear = Math.max(...data.map((d) => d.Year));
    if (!leader) return `${datasetLabel} for ${regionNames}. Forecast with 95% confidence intervals through ${maxDataYear}.`;
    return `${datasetLabel} for ${regionNames}: ${dn(leader.Country)} leads at ${leader.value.toLocaleString()} KBD in ${statDisplayYear}. Forecast with 95% confidence intervals through ${maxDataYear}.`;
  }, [datasetLabel, selected, leader, statDisplayYear, data]);

  const { netLargestImporter, netLargestExporter, netBaseYear, staticNetDeficit, staticNetSurplus } = useMemo(() => {
    const historical = data.filter((d) => d.Type === "Historical" && selectedSet.has(d.Country) && d.Year <= statDisplayYear);
    const importerRows = historical.filter((d) => d.value < 0);
    const exporterRows = historical.filter((d) => d.value > 0);
    const maxImporterYear = importerRows.length > 0 ? Math.max(...importerRows.map((d) => d.Year)) : statDisplayYear;
    const maxExporterYear = exporterRows.length > 0 ? Math.max(...exporterRows.map((d) => d.Year)) : statDisplayYear;
    const topImporter = importerRows.filter((d) => d.Year === maxImporterYear).sort((a, b) => a.value - b.value)[0] ?? null;
    const topExporter = exporterRows.filter((d) => d.Year === maxExporterYear).sort((a, b) => b.value - a.value)[0] ?? null;
    const baseYear = Math.max(maxImporterYear, maxExporterYear);
    const deficit = Math.abs(importerRows.filter((d) => d.Year === maxImporterYear).reduce((s, d) => s + d.value, 0));
    const surplus = exporterRows.filter((d) => d.Year === maxExporterYear).reduce((s, d) => s + d.value, 0);
    return { netLargestImporter: topImporter, netLargestExporter: topExporter, netBaseYear: baseYear, staticNetDeficit: deficit, staticNetSurplus: surplus };
  }, [data, selectedSet, statDisplayYear]);

  const toggle = (c: string) => setSelected((prev) => toggleSelection(prev, c));

  const displayYear = pinned ? pinned.year : statDisplayYear;
  const displayIsForecast = pinned?.isForecast ?? (forecastBoundary !== undefined && statDisplayYear >= forecastBoundary);
  const displayTotal = pinned ? pinned.entries.reduce((s, e) => s + e.value, 0) : latestTotal;
  const displayLeader = pinned ? (pinned.entries[0]?.country ?? null) : (leader?.Country ?? null);
  const netPinnedLast = pinned?.entries.at(-1) ?? null;
  const netPinnedFirst = pinned?.entries[0] ?? null;
  const displayNetImporter = pinned
    ? (netPinnedLast && netPinnedLast.value < 0 ? netPinnedLast.country : null)
    : (netLargestImporter?.Country ?? null);
  const displayNetExporterName = pinned
    ? (netPinnedFirst && netPinnedFirst.value > 0 ? netPinnedFirst.country : null)
    : (netLargestExporter?.Country ?? null);
  const displayNetDeficit = pinned
    ? Math.abs(pinned.entries.filter((e) => e.value < 0).reduce((s, e) => s + e.value, 0))
    : staticNetDeficit;
  const displayNetSurplus = pinned
    ? pinned.entries.filter((e) => e.value > 0).reduce((s, e) => s + e.value, 0)
    : staticNetSurplus;
  const netDisplayYear = pinned ? pinned.year : netBaseYear;
  const hasImporters = displayNetDeficit > 0 && displayNetDeficit >= displayNetSurplus;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0 || forecastBoundary === undefined) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const activeCountries = allCountries.filter((c) => selectedSet.has(c));
    const activeData = data.filter((d) => selectedSet.has(d.Country));
    if (activeCountries.length === 0 || activeData.length === 0) return;

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: containerWidth < 380 ? 44 : 60 };
    const totalH = preview ? 300 : (containerWidth < 480 ? 280 : 360);
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [minYear = 1971, maxYear = 2030] = d3.extent(data, (d) => d.Year);
    const x = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, width]);

    const CI_RATIO = 1.5;
    const capCIHigh = (val: number, ci: number) => Math.min(ci, val + Math.abs(val) * CI_RATIO);
    const capCILow  = (val: number, ci: number) => Math.max(ci, val - Math.abs(val) * CI_RATIO);

    const yMax = Math.max(0, d3.max(activeData, (d) => {
      const hi = d.ciHigh !== null ? capCIHigh(d.value, d.ciHigh) : d.value;
      return Math.max(d.value, hi) * 1.05;
    }) ?? 1);
    const yScaleMin = Math.min(0, d3.min(activeData, (d) => {
      const lo = d.ciLow !== null ? capCILow(d.value, d.ciLow) : d.value;
      return Math.min(d.value, lo) * 1.05;
    }) ?? 0);
    const y = d3.scaleLinear().domain([yScaleMin, yMax]).nice().range([height, 0]);

    g.append("defs").append("clipPath").attr("id", clipId)
      .append("rect").attr("width", width).attr("height", height);

    drawHorizontalGridLines(g, y, width, 5, isDarkRef.current);

    drawForecastBoundary(g, x, forecastBoundary, height);

    activeCountries.forEach((country) => {
      const rows = activeData.filter((d) => d.Country === country).sort((a, b) => a.Year - b.Year);
      const color = COUNTRY_COLORS[country] ?? "#64748b";

      const history = rows.filter((d) => d.Year <= forecastBoundary);
      const forecast = rows.filter((d) => d.Year >= forecastBoundary);

      const forecastWithCI = forecast.filter((d) => d.ciLow !== null && d.ciHigh !== null);
      if (forecastWithCI.length > 1) {
        const area = d3.area<OilRow>()
          .x((d) => x(d.Year))
          .y0((d) => y(capCILow(d.value, d.ciLow!)))
          .y1((d) => y(capCIHigh(d.value, d.ciHigh!)))
          .curve(d3.curveMonotoneX);
        g.append("path").datum(forecastWithCI)
          .attr("fill", color).attr("opacity", 0.1)
          .attr("clip-path", `url(#${clipId})`)
          .attr("d", area);
      }

      const line = d3.line<OilRow>()
        .x((d) => x(d.Year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);

      if (history.length >= 2)
        g.append("path").datum(history).attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("clip-path", `url(#${clipId})`).attr("d", line);

      if (forecast.length >= 2)
        g.append("path").datum(forecast).attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("stroke-dasharray", "6 3").attr("clip-path", `url(#${clipId})`).attr("d", line);
    });

    const tickYears = Array.from(new Set(data.map((d) => d.Year))).filter((yr) => yr % 10 === 0);
    activeCountries.forEach((country) => {
      const color = COUNTRY_COLORS[country] ?? "#64748b";
      const rows = activeData.filter((d) => d.Country === country);
      tickYears.forEach((yr) => {
        const row = rows.find((d) => d.Year === yr);
        if (!row) return;
        drawTickDot(g, x(yr), y(row.value), color, isDarkRef);
      });
    });

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(containerWidth < 380 ? 4 : 6))
      .selectAll("text").attr("fill", isDarkRef.current ? "#94a3b8" : "#64748b");

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => {
        const n = +v;
        if (n === 0) return "0";
        return n >= 1000 || n <= -1000 ? `${(n / 1000).toFixed(0)}k` : `${Math.round(n)}`;
      }).ticks(5))
      .selectAll("text").attr("fill", isDarkRef.current ? "#94a3b8" : "#64748b");

    const crosshair = drawCrosshair(g, height, isDarkRef);

    const dataIndex = new Map(activeData.map((d) => [`${d.Country}|${d.Year}`, d]));

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "transparent").style("pointer-events", "all")
      .on("pointermove", function (event) {
        const [mx] = d3.pointer(event);
        const [xMin, xMax] = x.domain();
        const year = Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx))));
        crosshair.style("visibility", "visible").attr("x1", x(year)).attr("x2", x(year));
        const isForecast = year >= forecastBoundary;
        const entries = activeCountries
          .flatMap((country) => {
            const row = dataIndex.get(`${country}|${year}`);
            if (!row) return [];
            return [{ country, value: row.value, color: COUNTRY_COLORS[country] ?? "#64748b" }];
          })
          .sort((a, b) => b.value - a.value);
        if (!entries.length) {
          crosshair.style("visibility", "hidden");
          return;
        }
        if (preview) {
          if (!containerRef.current) return;
          const [cmx, cmy] = d3.pointer(event, containerRef.current);
          setPreviewTooltip({ year, isForecast, entries });
          setPreviewTooltipPos({ x: cmx, y: cmy });
        } else {
          setPinned({ year, isForecast, entries });
        }
      })
      .on("pointerleave", function () {
        crosshair.style("visibility", "hidden");
        if (preview) {
          setPreviewTooltip(null);
          setPreviewTooltipPos(null);
        }
      });
  }, [data, selectedSet, preview, forecastBoundary, containerWidth, allCountries]);

  useChartTheme(svgRef, isDark);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {datasetLabel === "Net Trade (KBD)" ? (
              <>
                <StatCard size="xl"
                  label={`${displayIsForecast ? "Projected " : ""}${netDisplayYear} ${hasImporters ? "Import Deficit" : "Export Surplus"}`}
                  value={hasImporters
                    ? (displayNetDeficit > 0 ? `${Math.round(displayNetDeficit).toLocaleString()} KBD` : "—")
                    : (displayNetSurplus > 0 ? `${Math.round(displayNetSurplus).toLocaleString()} KBD` : "—")}
                  accent="blue" isDark={isDark} />
                <StatCard size="xl"
                  label={`${displayIsForecast ? "Projected " : ""}${hasImporters ? "Largest Net Importer" : "Largest Net Exporter"}`}
                  value={hasImporters ? (displayNetImporter ? dn(displayNetImporter) : "—") : (displayNetExporterName ? dn(displayNetExporterName) : "—")}
                  accent="teal" isDark={isDark} />
              </>
            ) : (
              <>
                <StatCard size="xl" label={`${displayIsForecast ? "Projected " : ""}${displayYear} Total`} value={`${Math.round(displayTotal).toLocaleString()} KBD`} accent="blue" isDark={isDark} />
                <StatCard size="xl" label={`${displayIsForecast ? "Projected " : ""}${datasetLabel === "Oil Exports (KBD)" ? "Largest Exporter" : "Largest Importer"}`} value={displayLeader ? dn(displayLeader) : "—"} accent="teal" isDark={isDark} />
              </>
            )}
          </div>

          <RegionPicker
            options={allCountries}
            selected={selected}
            onToggle={toggle}
            onSelectGroup={(regions) => setSelected(regions.length > 0 ? regions : allCountries)}
            colorMap={COUNTRY_COLORS}
            displayNames={OIL_DISPLAY}
            presets={chartPresets ?? OIL_IMPORT_PRESETS}
            isDark={isDark}
          />
        </>
      )}

      <ChartLegend isDark={isDark} showCI />

      <div ref={containerRef} className="w-full relative" style={{ touchAction: "pan-y" }}>
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        {preview && previewTooltip && previewTooltipPos && (
          <PreviewTooltip
            year={previewTooltip.year}
            isForecast={previewTooltip.isForecast}
            entries={previewTooltip.entries.map(({ country, value, color }) => ({
              key: country,
              label: dn(country),
              value: Math.round(value).toLocaleString(),
              unit: "KBD",
              color,
            }))}
            isDark={isDark}
            footer="KBD = thousands of barrels/day"
            style={tooltipStyle(previewTooltipPos.x, previewTooltipPos.y, containerWidth, containerHeight, 150, 240)}
          />
        )}
      </div>

      {!preview && (
        <div className={`rounded-xl overflow-hidden border ${isDark ? "bg-white/10 border-white/10" : "bg-white border-slate-200"}`}>
          {pinned ? (
            <>
              <div className={`px-4 py-2 border-b flex items-center justify-between ${isDark ? "border-white/10" : "border-slate-100"}`}>
                <span className={`text-xs font-mono font-bold ${isDark ? "text-white/60" : "text-slate-500"}`}>{pinned.year}</span>
                <div className="flex items-center gap-2">
                  <ForecastBadge isForecast={pinned.isForecast} isDark={isDark} />
                  <span className={`text-xs hidden sm:inline ${isDark ? "text-white/40" : "text-slate-400"}`}>Thousands of barrels per day</span>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "clamp(120px, 25vh, 220px)" }}>
                {pinned.entries.map(({ country, value, color }) => (
                  <div key={country} className={`flex items-center gap-3 px-4 py-2 border-b last:border-0 ${isDark ? "border-white/5" : "border-slate-50"}`}>
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`text-sm flex-1 ${isDark ? "text-white/70" : "text-slate-700"}`}>{dn(country)}</span>
                    <span className={`text-sm font-mono font-semibold whitespace-nowrap ${isDark ? "text-white" : "text-slate-900"}`}>
                      {Math.round(value).toLocaleString()}<span className={`text-xs font-normal ml-1 ${isDark ? "text-white/40" : "text-slate-400"}`}>KBD</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className={`text-xs px-4 py-2 border-t ${isDark ? "text-white/40 border-white/10" : "text-slate-400 border-slate-100"}`}>
                KBD = thousands of barrels per day
              </p>
            </>
          ) : (
            <p className={`text-xs px-4 py-4 text-center ${isDark ? "text-white/40" : "text-slate-400"}`}>
              Tap or hover the chart to explore oil volumes by year
            </p>
          )}
        </div>
      )}

    </div>
  );
}
