"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";

interface Props {
  data: EvRow[];
}

interface Pinned {
  year: number;
  sales: number;
  yoy: number | null;
  isForecast: boolean;
}

const DEFAULT_forecastBoundary = 2025;

function fmtSales(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
}

export default function EvTrendChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pinned, setPinned] = useState<Pinned | null>(null);

  const countries = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_country))).filter((c) => c !== "World").sort(),
    [data]
  );

  const [country, setCountry] = useState(() => countries[0] ?? "");

  useEffect(() => {
    if (countries.length && !countries.includes(country)) setCountry(countries[0]);
  }, [countries, country]);

  useEffect(() => {
    setPinned(null);
  }, [country]);

  const countryData = useMemo(
    () => data.filter((d) => d.region_country === country).sort((a, b) => a.year - b.year),
    [data, country]
  );

  const forecastBoundary = useMemo(
    () => countryData.find((d) => d.type === "Forecast")?.year ?? DEFAULT_forecastBoundary,
    [countryData]
  );

  const history = useMemo(() => countryData.filter((d) => d.year <= forecastBoundary), [countryData, forecastBoundary]);
  const forecast = useMemo(() => countryData.filter((d) => d.year >= forecastBoundary), [countryData, forecastBoundary]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !countryData.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 16, right: 24, bottom: 32, left: 60 };
    const totalH = 300;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(countryData, (d) => d.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, (d3.max(countryData, (d) => d.ev_sales) ?? 1) * 1.1])
      .nice()
      .range([height, 0]);

    g.selectAll(".grid-h")
      .data(y.ticks(5))
      .enter().append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    if (forecast.length > 0) {
      g.append("line")
        .attr("x1", x(forecastBoundary)).attr("x2", x(forecastBoundary))
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#94a3b8").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);

      g.append("text")
        .attr("x", x(forecastBoundary) + 4).attr("y", 12)
        .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
        .attr("fill", "#94a3b8").text("Forecast →");
    }

    const line = d3.line<EvRow>()
      .x((d) => x(d.year))
      .y((d) => y(d.ev_sales))
      .curve(d3.curveMonotoneX);

    const area = d3.area<EvRow>()
      .x((d) => x(d.year))
      .y0(height)
      .y1((d) => y(d.ev_sales))
      .curve(d3.curveMonotoneX);

    if (history.length > 1) {
      g.append("path").datum(history)
        .attr("fill", "#0d9488").attr("opacity", 0.08)
        .attr("d", area);

      g.append("path").datum(history)
        .attr("fill", "none").attr("stroke", "#0d9488")
        .attr("stroke-width", 2.5).attr("d", line);
    }

    if (forecast.length > 1) {
      g.append("path").datum(forecast)
        .attr("fill", "none").attr("stroke", "#0d9488")
        .attr("stroke-width", 2.5).attr("stroke-dasharray", "6 3")
        .attr("d", line);
    }

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => {
        const n = +v;
        return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : `${n}`;
      }).ticks(5));

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
        const currentRow = countryData.find((d) => d.year === year);
        const prevRow = countryData.find((d) => d.year === year - 1);
        const sales = currentRow?.ev_sales ?? 0;
        const yoy = currentRow && prevRow && prevRow.ev_sales > 0
          ? ((sales - prevRow.ev_sales) / prevRow.ev_sales) * 100
          : null;
        setPinned({ year, sales, yoy, isForecast: year >= forecastBoundary });
      })
      .on("mouseleave", function () {
        crosshair.style("visibility", "hidden");
      });
  }, [countryData, forecastBoundary, containerWidth]);

  const historicalRows = countryData.filter((d) => d.type === "Historical");
  const peak = historicalRows.length > 0
    ? historicalRows.reduce((best, d) => d.ev_sales > best.ev_sales ? d : best, historicalRows[0])
    : null;
  const latest = historicalRows[historicalRows.length - 1] ?? null;
  const first = historicalRows.find((d) => d.ev_sales > 0) ?? null;
  const cagr = first && latest && latest.year > first.year
    ? ((Math.pow(latest.ev_sales / first.ev_sales, 1 / (latest.year - first.year)) - 1) * 100).toFixed(1)
    : null;
  const forecast2030 = countryData.find((d) => d.year === 2030);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="trend-country-select" className="text-xs font-mono uppercase tracking-widest text-slate-400">Country</label>
        <select
          id="trend-country-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">{latest?.year ?? "—"} Sales</p>
          <p className="text-lg font-bold text-teal-600">
            {latest ? fmtSales(latest.ev_sales) : "—"}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Peak Year</p>
          <p className="text-lg font-bold text-blue-600">{peak ? peak.year : "—"}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Annual Growth Rate</p>
          <p className="text-lg font-bold text-amber-600">{cagr ? `${cagr}%` : "—"}</p>
          <p className="text-xs text-slate-400">CAGR since first sale</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">2030 Forecast</p>
          <p className="text-lg font-bold text-teal-600">
            {forecast2030 ? fmtSales(forecast2030.ev_sales) : "—"}
          </p>
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Line chart of EV sales over time with S-curve forecast" />
      </div>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {pinned ? (
          <div className="px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500">{pinned.year}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${pinned.isForecast ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {pinned.isForecast ? "Projected forecast" : "Historical data"}
              </span>
            </div>
            <p className="text-xl font-bold text-teal-600 mt-1">
              {fmtSales(pinned.sales)} <span className="text-sm font-normal text-slate-500">electric vehicles sold</span>
            </p>
            {pinned.yoy !== null && (
              <p className={`text-sm font-semibold ${pinned.yoy >= 0 ? "text-green-600" : "text-red-500"}`}>
                {pinned.yoy >= 0 ? "↑" : "↓"} {Math.abs(pinned.yoy).toFixed(1)}% vs previous year
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-mono px-4 py-4 text-center">
            Hover over the chart to explore sales by year
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 font-mono">
        Solid = Historical data · Dashed = S-curve projected forecast · Unit: vehicles/year
      </p>
    </div>
  );
}
