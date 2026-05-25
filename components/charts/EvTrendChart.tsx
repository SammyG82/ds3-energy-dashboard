"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { fmtEvSales, dn, AGGREGATES } from "@/lib/data";
import { useContainerSize, drawHorizontalGridLines } from "@/lib/ui-utils";
import ForecastBadge from "@/components/ui/ForecastBadge";
import StatCard from "@/components/ui/StatCard";

interface Props {
  data: EvRow[];
}

interface Pinned {
  year: number;
  sales: number;
  yoy: number | null;
  isForecast: boolean;
}

export default function EvTrendChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useContainerSize(containerRef);
  const [pinned, setPinned] = useState<Pinned | null>(null);

  const countries = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_country))).filter((c) => !AGGREGATES.has(c)).sort(),
    [data]
  );

  const [country, setCountry] = useState(() => countries[0] ?? "");

  useEffect(() => {
    if (countries.length && !countries.includes(country)) setCountry(countries[0]);
  }, [countries, country]);

  useEffect(() => { setPinned(null); }, [country, data, containerWidth]);

  const countryData = useMemo(
    () => data.filter((d) => d.region_country === country).sort((a, b) => a.year - b.year),
    [data, country]
  );

  const forecastBoundary = useMemo(
    () => countryData.find((d) => d.type === "Forecast")?.year ?? Infinity,
    [countryData]
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !countryData.length || containerWidth === 0) return;

    const history = countryData.filter((d) => d.year <= forecastBoundary);
    const forecast = countryData.filter((d) => d.year >= forecastBoundary);

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

    drawHorizontalGridLines(g, y, width);

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
      .call(d3.axisLeft(y).tickFormat((v) => fmtEvSales(+v)).ticks(5));

    const crosshair = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#64748b").attr("stroke-width", 1).attr("stroke-dasharray", "4 2")
      .style("visibility", "hidden").style("pointer-events", "none");

    const byYear = new Map(countryData.map((d) => [d.year, d]));

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "transparent").style("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const [xMin, xMax] = x.domain();
        const year = Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx))));
        crosshair.style("visibility", "visible").attr("x1", x(year)).attr("x2", x(year));
        const currentRow = byYear.get(year);
        const prevRow = byYear.get(year - 1);
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

  const historicalRows = useMemo(() => countryData.filter((d) => d.type === "Actual" && d.year < forecastBoundary), [countryData, forecastBoundary]);

  const { peak, latest, cagr, forecast2030 } = useMemo(() => {
    const peak = historicalRows.length > 0
      ? historicalRows.reduce((best, d) => d.ev_sales > best.ev_sales ? d : best, historicalRows[0])
      : null;
    const latest = historicalRows[historicalRows.length - 1] ?? null;
    const first = historicalRows.find((d) => d.ev_sales > 0) ?? null;
    const cagr = first && latest && latest.year > first.year
      ? ((Math.pow(latest.ev_sales / first.ev_sales, 1 / (latest.year - first.year)) - 1) * 100).toFixed(1)
      : null;
    const candidates2030 = countryData.filter((d) => d.year === 2030);
    const forecast2030 = candidates2030.find((d) => d.type === "Forecast") ?? candidates2030[0] ?? null;
    return { peak, latest, cagr, forecast2030 };
  }, [historicalRows, countryData]);

  const ariaLabel = useMemo(() => {
    if (!latest) return `${dn(country)} EV sales trend: no data available.`;
    const parts: string[] = [`${dn(country)} EV sales trend: ${fmtEvSales(latest.ev_sales)} vehicles in ${latest.year}`];
    if (cagr) parts.push(`${cagr}% annual growth since first sale`);
    if (peak) parts.push(`peak year ${peak.year}`);
    if (forecast2030) parts.push(`2030 forecast: ${fmtEvSales(forecast2030.ev_sales)}`);
    return parts.join(", ") + ".";
  }, [country, latest, cagr, peak, forecast2030]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="trend-country-select" className="text-xs font-mono uppercase tracking-widest text-slate-400">Country</label>
        <select
          id="trend-country-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          {countries.map((c) => (
            <option key={c} value={c}>{dn(c)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard size="xl" label={`${latest?.year ?? "—"} Sales`} value={latest ? fmtEvSales(latest.ev_sales) : "—"} accent="teal" />
        <StatCard size="xl" label="Peak Year" value={peak ? String(peak.year) : "—"} accent="blue" />
        <StatCard size="xl" label="Annual Growth Rate" value={cagr ? `${cagr}%` : "—"} sub="since first sale" accent="amber" />
        <StatCard size="xl" label="2030 Forecast" value={forecast2030 ? fmtEvSales(forecast2030.ev_sales) : "—"} accent="teal" />
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
      </div>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {pinned ? (
          <div className="px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500">{pinned.year}</span>
              <ForecastBadge isForecast={pinned.isForecast} />
            </div>
            <p className="text-xl font-bold text-teal-600 mt-1">
              {fmtEvSales(pinned.sales)} <span className="text-sm font-normal text-slate-500">electric vehicles sold</span>
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
        Solid = Historical data · Dashed = IEA STEPS projected forecast · Unit: vehicles/year
      </p>
    </div>
  );
}
