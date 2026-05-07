"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { OilRow } from "@/lib/data";
import RegionPicker, { PresetItem } from "@/components/ui/RegionPicker";

interface Props {
  data: OilRow[];
  preview?: boolean;
  datasetLabel?: string;
  chartPresets?: PresetItem[];
}

interface Pinned {
  year: number;
  isForecast: boolean;
  entries: { country: string; value: number; color: string }[];
}

const COUNTRY_COLORS: Record<string, string> = {
  // Imports
  China: "#e85d04", India: "#059669", Japan: "#0891b2",
  USA: "#2563eb", Korea: "#7c3aed", Mexico: "#ca8a04",
  Netherlands: "#db2777", Singapore: "#0284c7", Australia: "#16a34a",
  France: "#9333ea",
  // Net trade & exports
  "Saudi Arabia": "#b45309", Russia: "#dc2626", Canada: "#0d9488",
  UAE: "#1d4ed8", Iraq: "#be185d", Kuwait: "#d97706", Norway: "#0e7490",
  Germany: "#64748b", Iran: "#7c2d12", UK: "#6d28d9", Qatar: "#0f766e",
  Nigeria: "#166534", Algeria: "#92400e", Angola: "#c2410c",
  Indonesia: "#4d7c0f", Libya: "#1e3a5f", Venezuela: "#7f1d1d",
  Brazil: "#15803d", Kazakhstan: "#a16207", Spain: "#9f1239",
};

const DEFAULT_FORECAST_BOUNDARY = 2024;
const PREVIEW_COUNTRIES = ["China", "India", "USA", "Japan", "Korea"];

const OIL_PRESETS: PresetItem[] = [
  {
    label: "Top 5 Importers",
    description: "The five largest end-consumer oil importers",
    detail: "China, India, USA, Japan, and South Korea are the five largest oil importers by domestic consumption. Singapore and the Netherlands import more by volume but are re-export hubs — their figures don't reflect domestic demand, so they're excluded here.",
    regions: ["China", "India", "USA", "Japan", "Korea"],
  },
  {
    label: "Europe",
    description: "European nations in the dataset",
    detail: "France, Germany, the Netherlands, and Spain — the four European countries in the IEA oil dataset. All have active EV markets and significant oil import dependency.",
    regions: ["France", "Germany", "Netherlands", "Spain"],
  },
  {
    label: "All Countries",
    description: "All 10 major oil importing nations",
    detail: "All 10 countries in the dataset: China, India, USA, Japan, South Korea, France, Germany, Netherlands, Singapore, and Spain. Together they account for the majority of global oil import demand.",
    regions: null,
  },
];

export default function OilForecastChart({ data, preview = false, datasetLabel = "Oil Imports (KBD)", chartPresets }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [previewTooltip, setPreviewTooltip] = useState<Pinned | null>(null);
  const [previewTooltipPos, setPreviewTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const allCountries = useMemo(
    () => Array.from(new Set(data.map((d) => d.Country))).sort(),
    [data]
  );

  const forecastBoundary = useMemo(
    () => data.find((d) => d.Type === "Forecast")?.Year ?? DEFAULT_FORECAST_BOUNDARY,
    [data]
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preview ? allCountries.filter((c) => PREVIEW_COUNTRIES.includes(c)) : allCountries)
  );

  useEffect(() => {
    setSelected(new Set(preview ? allCountries.filter((c) => PREVIEW_COUNTRIES.includes(c)) : allCountries));
  }, [allCountries, preview]);

  useEffect(() => {
    setPinned(null);
  }, [selected]);

  const { total2023, leader } = useMemo(() => {
    const latest = data.filter((d) => d.Year === 2023);
    const total = latest.reduce((s, d) => s + d.value, 0);
    const top = [...latest].sort((a, b) => b.value - a.value)[0];
    return { total2023: total, leader: top };
  }, [data]);

  const toggle = (c: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c) && next.size > 1) next.delete(c);
      else next.add(c);
      return next;
    });

  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const activeCountries = allCountries.filter((c) => selected.has(c));
    const activeData = data.filter((d) => selected.has(d.Country));

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: 60 };
    const totalH = preview ? 220 : 360;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.Year) as [number, number])
      .range([0, width]);

    const yMax = d3.max(activeData, (d) => (d.ciHigh ?? d.value) * 1.05) ?? 1;
    const yScaleMin = Math.min(0, d3.min(activeData, (d) => (d.ciLow ?? d.value) * 1.05) ?? 0);
    const y = d3.scaleLinear().domain([yScaleMin, yMax]).nice().range([height, 0]);

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
      .attr("fill", "#94a3b8").text("Forecast →");

    activeCountries.forEach((country) => {
      const rows = data.filter((d) => d.Country === country).sort((a, b) => a.Year - b.Year);
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
          .attr("fill", color).attr("opacity", 0.1).attr("d", area);
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

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => `${+v}k`).ticks(5));

    const crosshair = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#64748b").attr("stroke-width", 1).attr("stroke-dasharray", "4 2")
      .style("visibility", "hidden").style("pointer-events", "none");

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
            const row = data.find((d) => d.Country === country && d.Year === year);
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
  }, [data, selected, preview, allCountries, forecastBoundary, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400">2023 Total</p>
              <p className="text-lg font-bold text-blue-600">{total2023.toFixed(0)}k <span className="text-xs font-normal text-slate-400">KBD</span></p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Largest Importer</p>
              <p className="text-lg font-bold text-teal-600">{leader?.Country ?? "—"}</p>
            </div>
          </div>

          <RegionPicker
            options={allCountries}
            selected={selectedArray}
            onToggle={toggle}
            onSelectGroup={(regions) => setSelected(new Set(regions.length > 0 ? regions : allCountries.slice(0, 1)))}
            colorMap={COUNTRY_COLORS}
            presets={chartPresets ?? OIL_PRESETS}
          />
        </>
      )}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Multi-line chart of oil import forecasts by country with 95% CI bands" />
        {preview && previewTooltip && previewTooltipPos && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm"
            style={{
              left: previewTooltipPos.x < containerWidth * 0.6 ? previewTooltipPos.x + 14 : undefined,
              right: previewTooltipPos.x >= containerWidth * 0.6 ? containerWidth - previewTooltipPos.x + 14 : undefined,
              top: Math.max(4, previewTooltipPos.y - 10),
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-0.5">
              <p className="text-xs font-mono font-bold text-slate-500">{previewTooltip.year}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${previewTooltip.isForecast ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {previewTooltip.isForecast ? "Projected forecast" : "Historical data"}
              </span>
            </div>
            {previewTooltip.entries.map(({ country, value, color }) => (
              <div key={country} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-700 flex-1">{country}</span>
                <span className="text-xs font-mono font-semibold text-slate-900">
                  {value.toFixed(0)}<span className="text-slate-400 font-normal ml-0.5">KBD</span>
                </span>
              </div>
            ))}
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-1.5 mt-0.5">KBD = thousands of barrels/day</p>
          </div>
        )}
      </div>

      {!preview && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          {pinned ? (
            <>
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500">{pinned.year}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${pinned.isForecast ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {pinned.isForecast ? "Projected forecast" : "Historical data"}
                  </span>
                  <span className="text-xs text-slate-400">Thousands of barrels per day</span>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                {pinned.entries.map(({ country, value, color }) => (
                  <div key={country} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm text-slate-700 flex-1">{country}</span>
                    <span className="text-sm font-mono font-semibold text-slate-900">
                      {value.toFixed(0)}<span className="text-xs font-normal text-slate-400 ml-1">KBD</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 font-mono px-4 py-2 border-t border-slate-100">
                KBD = thousands of barrels per day
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 font-mono px-4 py-4 text-center">
              Hover over the chart to explore oil volumes by year
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 font-mono">
        Solid = Historical data &nbsp;·&nbsp; Dashed = ARIMA projected forecast &nbsp;·&nbsp; Band = 95% CI &nbsp;·&nbsp; {datasetLabel}
      </p>
    </div>
  );
}
