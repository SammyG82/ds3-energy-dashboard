"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export interface OilRow {
  Country: string;
  Year: number;
  Type: string;
  value: number;
  ciLow: number | null;
  ciHigh: number | null;
}

interface Props {
  data: OilRow[];
  preview?: boolean;
  datasetLabel?: string;
}

const COUNTRY_COLORS: Record<string, string> = {
  China: "#e85d04", India: "#059669", Japan: "#0891b2",
  USA: "#2563eb", Korea: "#7c3aed", Mexico: "#ca8a04",
  Netherlands: "#db2777", Singapore: "#0284c7", Australia: "#16a34a",
  France: "#9333ea",
};

const FORECAST_BOUNDARY = 2024;

export default function OilForecastChart({ data, preview = false, datasetLabel = "Oil Imports (KBD)" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allCountries = Array.from(new Set(data.map((d) => d.Country))).sort();
  const defaultSelected = new Set(preview ? allCountries.slice(0, 5) : allCountries);
  const [selected, setSelected] = useState<Set<string>>(defaultSelected);

  const toggle = (c: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c) && next.size > 1) next.delete(c);
      else next.add(c);
      return next;
    });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const activeCountries = allCountries.filter((c) => selected.has(c));
    const activeData = data.filter((d) => selected.has(d.Country));

    const totalW = containerRef.current.offsetWidth;
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
    const yMin = Math.min(0, d3.min(activeData, (d) => (d.ciLow ?? d.value) * 1.05) ?? 0);
    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([height, 0]);

    // Grid
    g.selectAll(".grid-h")
      .data(y.ticks(5))
      .enter().append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    // Forecast boundary
    g.append("line")
      .attr("x1", x(FORECAST_BOUNDARY)).attr("x2", x(FORECAST_BOUNDARY))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#94a3b8").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);

    g.append("text")
      .attr("x", x(FORECAST_BOUNDARY) + 4).attr("y", 12)
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#94a3b8").text("Forecast →");

    activeCountries.forEach((country) => {
      const rows = data.filter((d) => d.Country === country).sort((a, b) => a.Year - b.Year);
      const color = COUNTRY_COLORS[country] ?? "#64748b";

      const history = rows.filter((d) => d.Year <= FORECAST_BOUNDARY);
      const forecast = rows.filter((d) => d.Year >= FORECAST_BOUNDARY);

      // CI band on forecast
      const forecastWithCI = forecast.filter((d) => d.ciLow !== null && d.ciHigh !== null);
      if (forecastWithCI.length > 1) {
        const area = d3.area<OilRow>()
          .x((d) => x(d.Year))
          .y0((d) => y(d.ciLow!))
          .y1((d) => y(d.ciHigh!))
          .curve(d3.curveMonotoneX);
        g.append("path")
          .datum(forecastWithCI)
          .attr("fill", color)
          .attr("opacity", 0.1)
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

    // Axes
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => `${v as number}k`).ticks(5));
  }, [data, selected, preview, allCountries]);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (svgRef.current) svgRef.current.dispatchEvent(new Event("resize"));
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Summary stats
  const latest = data.filter((d) => d.Year === 2023);
  const total2023 = latest.reduce((s, d) => s + d.value, 0);
  const leader = latest.sort((a, b) => b.value - a.value)[0];

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

          {/* Country chips */}
          <div className="flex flex-wrap gap-2">
            {allCountries.map((c) => (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                  selected.has(c)
                    ? "text-white border-transparent"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
                style={selected.has(c) ? { backgroundColor: COUNTRY_COLORS[c] ?? "#2563eb" } : {}}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      <p className="text-xs text-slate-400 font-mono">
        Solid = Historical &nbsp;·&nbsp; Dashed = ARIMA Forecast &nbsp;·&nbsp; Band = 95% CI &nbsp;·&nbsp; {datasetLabel}
      </p>
    </div>
  );
}
