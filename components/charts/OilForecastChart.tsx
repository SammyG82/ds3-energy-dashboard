"use client";

import { useEffect, useRef, useState, useMemo, useId } from "react";
import * as d3 from "d3";
import type { OilRow } from "@/lib/data";
import { COUNTRY_COLORS } from "@/lib/data";
import RegionPicker, { PresetItem } from "@/components/ui/RegionPicker";
import { tooltipStyle, useContainerSize, toggleSelection, drawHorizontalGridLines, drawForecastBoundary } from "@/lib/ui-utils";
import ForecastBadge from "@/components/ui/ForecastBadge";
import StatCard from "@/components/ui/StatCard";
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
  }, [data, selected, containerWidth]);

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
    if (!leader) return `${datasetLabel} for ${regionNames}. Forecast with 95% confidence intervals through 2030.`;
    return `${datasetLabel} for ${regionNames}: ${dn(leader.Country)} leads at ${leader.value.toLocaleString()} KBD in ${statDisplayYear}. Forecast with 95% confidence intervals through 2030.`;
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
    const deficit = Math.abs(importerRows.filter((d) => d.Year === baseYear).reduce((s, d) => s + d.value, 0));
    const surplus = exporterRows.filter((d) => d.Year === baseYear).reduce((s, d) => s + d.value, 0);
    return { netLargestImporter: topImporter, netLargestExporter: topExporter, netBaseYear: baseYear, staticNetDeficit: deficit, staticNetSurplus: surplus };
  }, [data, selectedSet, statDisplayYear]);

  const toggle = (c: string) => setSelected((prev) => toggleSelection(prev, c));

  const displayYear = pinned ? pinned.year : statDisplayYear;
  const displayIsForecast = pinned?.isForecast ?? (forecastBoundary !== undefined && statDisplayYear >= forecastBoundary);
  const displayTotal = pinned ? pinned.entries.reduce((s, e) => s + e.value, 0) : latestTotal;
  const displayLeader = pinned ? (pinned.entries[0]?.country ?? null) : (leader?.Country ?? null);
  const netPinnedLast = pinned?.entries.at(-1) ?? null;
  const netPinnedFirst = pinned?.entries[0] ?? null;
  const hasImporters = staticNetDeficit >= staticNetSurplus;
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

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0 || forecastBoundary === undefined) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const activeCountries = allCountries.filter((c) => selectedSet.has(c));
    const activeData = data.filter((d) => selectedSet.has(d.Country));

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: 60 };
    const totalH = preview ? 300 : 360;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [minYear = 1971, maxYear = 2030] = d3.extent(data, (d) => d.Year);
    const x = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, width]);

    const yMax = Math.max(0, d3.max(activeData, (d) => d.value * 1.05) ?? 1);
    const yScaleMin = Math.min(0, d3.min(activeData, (d) => d.value * 1.05) ?? 0);
    const y = d3.scaleLinear().domain([yScaleMin, yMax]).nice().range([height, 0]);

    g.append("defs").append("clipPath").attr("id", clipId)
      .append("rect").attr("width", width).attr("height", height);

    drawHorizontalGridLines(g, y, width, 5, isDark);

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
          .y0((d) => y(d.ciLow!))
          .y1((d) => y(d.ciHigh!))
          .curve(d3.curveMonotoneX);
        g.append("path").datum(forecastWithCI)
          .attr("fill", color).attr("opacity", 0.1)
          .attr("clip-path", `url(#${clipId})`)
          .attr("d", area);
      }

      const line = d3.line<OilRow>()
        .x((d) => x(d.Year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);

      if (history.length > 1)
        g.append("path").datum(history).attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("d", line);

      if (forecast.length > 1)
        g.append("path").datum(forecast).attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("stroke-dasharray", "6 3").attr("d", line);
    });

    const tickYears = Array.from(new Set(data.map((d) => d.Year))).filter((yr) => yr % 10 === 0);
    activeCountries.forEach((country) => {
      const color = COUNTRY_COLORS[country] ?? "#64748b";
      const rows = activeData.filter((d) => d.Country === country);
      tickYears.forEach((yr) => {
        const row = rows.find((d) => d.Year === yr);
        if (!row) return;
        g.append("circle")
          .attr("cx", x(yr)).attr("cy", y(row.value)).attr("r", 3)
          .attr("fill", isDark ? "#000" : "#fff").attr("stroke", color).attr("stroke-width", 2)
          .style("pointer-events", "none");
      });
    });

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6))
      .selectAll("text").attr("fill", isDark ? "#94a3b8" : "#64748b");

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => {
        const n = +v;
        if (n === 0) return "0";
        return n >= 1000 || n <= -1000 ? `${(n / 1000).toFixed(0)}k` : `${Math.round(n)}`;
      }).ticks(5))
      .selectAll("text").attr("fill", isDark ? "#94a3b8" : "#64748b");

    const crosshair = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", isDark ? "#94a3b8" : "#64748b").attr("stroke-width", 1).attr("stroke-dasharray", "4 2")
      .style("visibility", "hidden").style("pointer-events", "none");

    const dataIndex = new Map(activeData.map((d) => [`${d.Country}|${d.Year}`, d]));

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "transparent").style("pointer-events", "all")
      .on("mousemove", function (event) {
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
        if (preview) {
          const [cmx, cmy] = d3.pointer(event, containerRef.current);
          setPreviewTooltip({ year, isForecast, entries });
          setPreviewTooltipPos({ x: cmx, y: cmy });
        } else {
          setPinned({ year, isForecast, entries });
        }
      })
      .on("mouseleave", function () {
        crosshair.style("visibility", "hidden");
        if (preview) {
          setPreviewTooltip(null);
          setPreviewTooltipPos(null);
        }
      });
  }, [data, selectedSet, preview, isDark, forecastBoundary, containerWidth, allCountries]);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <>
          {datasetLabel === "Oil Imports (KBD)" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard size="xl" label={`${displayIsForecast ? "Projected " : ""}${displayYear} Total`} value={`${Math.round(displayTotal).toLocaleString()}`} sub="KBD" accent="blue" isDark={isDark} />
              <StatCard size="xl" label={`${displayIsForecast ? "Projected " : ""}Largest Importer`} value={displayLeader ? dn(displayLeader) : "—"} accent="teal" isDark={isDark} />
            </div>
          )}

          {datasetLabel === "Net Trade (KBD)" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            </div>
          )}

          {datasetLabel === "Oil Exports (KBD)" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard size="xl" label={`${displayIsForecast ? "Projected " : ""}${displayYear} Total`} value={`${Math.round(displayTotal).toLocaleString()}`} sub="KBD" accent="blue" isDark={isDark} />
              <StatCard size="xl" label={`${displayIsForecast ? "Projected " : ""}Largest Exporter`} value={displayLeader ? dn(displayLeader) : "—"} accent="teal" isDark={isDark} />
            </div>
          )}

          <RegionPicker
            options={allCountries}
            selected={selected}
            onToggle={toggle}
            onSelectGroup={(regions) => setSelected(regions.length > 0 ? regions : allCountries.slice(0, 1))}
            colorMap={COUNTRY_COLORS}
            displayNames={OIL_DISPLAY}
            presets={chartPresets ?? OIL_IMPORT_PRESETS}
            isDark={isDark}
          />
        </>
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
            Forecast
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block w-4 h-2.5 rounded-sm bg-current opacity-20" aria-hidden="true" />
            95% CI
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        {preview && previewTooltip && previewTooltipPos && (
          <div
            className={`absolute rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm border ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
            style={tooltipStyle(previewTooltipPos.x, previewTooltipPos.y, containerWidth, containerHeight, 150)}
          >
            <div className={`flex items-center gap-2 border-b pb-1.5 mb-0.5 ${isDark ? "border-white/10" : "border-slate-100"}`}>
              <p className={`text-xs font-mono font-bold ${isDark ? "text-white/60" : "text-slate-500"}`}>{previewTooltip.year}</p>
              <ForecastBadge isForecast={previewTooltip.isForecast} isDark={isDark} />
            </div>
            {previewTooltip.entries.map(({ country, value, color }) => (
              <div key={country} className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className={`text-xs flex-1 ${isDark ? "text-white/70" : "text-slate-700"}`}>{dn(country)}</span>
                <span className={`text-xs font-mono font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {Math.round(value).toLocaleString()}<span className={`font-normal ml-0.5 ${isDark ? "text-white/40" : "text-slate-400"}`}>KBD</span>
                </span>
              </div>
            ))}
            <p className={`text-xs border-t pt-1.5 mt-0.5 ${isDark ? "text-white/40 border-white/10" : "text-slate-400 border-slate-100"}`}>KBD = thousands of barrels/day</p>
          </div>
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
                  <span className={`text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>Thousands of barrels per day</span>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "clamp(120px, 25vh, 220px)" }}>
                {pinned.entries.map(({ country, value, color }) => (
                  <div key={country} className={`flex items-center gap-3 px-4 py-2 border-b last:border-0 ${isDark ? "border-white/5" : "border-slate-50"}`}>
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`text-sm flex-1 ${isDark ? "text-white/70" : "text-slate-700"}`}>{dn(country)}</span>
                    <span className={`text-sm font-mono font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
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
              Hover over the chart to explore oil volumes by year
            </p>
          )}
        </div>
      )}

    </div>
  );
}
