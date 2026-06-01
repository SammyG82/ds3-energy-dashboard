"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";
import { fmtEvSales, dn, AGGREGATES } from "@/lib/data";
import { useContainerSize, drawHorizontalGridLines, drawForecastBoundary, useThemeRef, useChartTheme, drawCrosshair, drawTickDot, useEvForecastBoundary } from "@/lib/ui-utils";
import ForecastBadge from "@/components/ui/ForecastBadge";
import ChartLegend from "@/components/ui/ChartLegend";
import StatCard from "@/components/ui/StatCard";

interface Props {
  data: EvRow[];
  isDark?: boolean;
}

interface Pinned {
  year: number;
  sales: number;
  yoy: number | null;
  isForecast: boolean;
}

export default function EvTrendChart({ data, isDark = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useContainerSize(containerRef);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const isDarkRef = useThemeRef(isDark);

  const countries = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_country))).filter((c) => !AGGREGATES.has(c)).sort((a, b) => dn(a).localeCompare(dn(b))),
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

  const forecastBoundary = useEvForecastBoundary(countryData);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !countryData.length || containerWidth === 0) return;

    const history = countryData.filter((d) => d.year <= forecastBoundary);
    const forecast = countryData.filter((d) => d.year >= forecastBoundary);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 16, right: 24, bottom: 32, left: containerWidth < 380 ? 44 : 60 };
    const totalH = containerWidth < 480 ? 240 : 300;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [minYear = 2010, maxYear = 2035] = d3.extent(countryData, (d) => d.year);
    const x = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, (d3.max(countryData, (d) => d.ev_sales) ?? 1) * 1.1])
      .nice()
      .range([height, 0]);

    drawHorizontalGridLines(g, y, width, 5, isDarkRef.current);

    if (forecast.length > 0) {
      drawForecastBoundary(g, x, forecastBoundary, height);
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

    if (history.length >= 1) {
      g.append("path").datum(history)
        .attr("fill", "#0d9488").attr("opacity", 0.08)
        .attr("d", area);

      g.append("path").datum(history)
        .attr("fill", "none").attr("stroke", "#0d9488")
        .attr("stroke-width", 2).attr("d", line);
    }

    if (forecast.length >= 1) {
      g.append("path").datum(forecast)
        .attr("fill", "none").attr("stroke", "#0d9488")
        .attr("stroke-width", 2).attr("stroke-dasharray", "6 3")
        .attr("d", line);
    }

    const byYear = new Map(countryData.map((d) => [d.year, d]));
    const tickYears = Array.from(new Set(countryData.map((d) => d.year))).filter((yr) => yr % 5 === 0);
    tickYears.forEach((yr) => {
      const row = byYear.get(yr);
      if (!row) return;
      drawTickDot(g, x(yr), y(row.ev_sales), "#0d9488", isDarkRef);
    });

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(containerWidth < 380 ? 4 : 6))
      .selectAll("text").attr("fill", isDarkRef.current ? "#94a3b8" : "#64748b");

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((v) => fmtEvSales(+v)).ticks(5))
      .selectAll("text").attr("fill", isDarkRef.current ? "#94a3b8" : "#64748b");

    const crosshair = drawCrosshair(g, height, isDarkRef);

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "transparent").style("pointer-events", "all")
      .on("pointermove", function (event) {
        const [mx] = d3.pointer(event);
        const [xMin, xMax] = x.domain();
        const year = Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx))));
        const currentRow = byYear.get(year);
        if (!currentRow) { crosshair.style("visibility", "hidden"); return; }
        crosshair.style("visibility", "visible").attr("x1", x(year)).attr("x2", x(year));
        const prevRow = byYear.get(year - 1);
        const sales = currentRow.ev_sales;
        const yoy = prevRow && prevRow.ev_sales > 0
          ? ((sales - prevRow.ev_sales) / prevRow.ev_sales) * 100
          : null;
        setPinned({ year, sales, yoy, isForecast: year >= forecastBoundary });
      })
      .on("pointerleave", function () {
        crosshair.style("visibility", "hidden");
      });
  }, [countryData, forecastBoundary, containerWidth]);

  useChartTheme(svgRef, isDark);

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
    const forecast2030 = candidates2030.find((d) => d.type === "Forecast") ?? null;
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
        <label htmlFor="trend-country-select" className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Country</label>
        <div className="relative">
          <select
            id="trend-country-select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={`appearance-none text-sm font-semibold border rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 ${isDark ? "text-slate-200 bg-slate-800 border-slate-700" : "text-slate-700 bg-white border-slate-200"}`}
          >
            {countries.map((c) => (
              <option key={c} value={c}>{dn(c)}</option>
            ))}
          </select>
          <svg className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 6 8 10 12 6" /></svg>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard size="xl" label={`${latest?.year ?? "—"} Sales`} value={latest ? fmtEvSales(latest.ev_sales) : "—"} accent="teal" isDark={isDark} />
        <StatCard size="xl" label="Peak Year" value={peak ? String(peak.year) : "—"} accent="blue" isDark={isDark} />
        <StatCard size="xl" label="Growth Rate (CAGR)" value={cagr ? `${cagr}%` : "—"} accent="amber" isDark={isDark} />
        <StatCard size="xl" label="2030 Forecast" value={forecast2030 ? fmtEvSales(forecast2030.ev_sales) : "—"} accent="teal" isDark={isDark} />
      </div>

      <ChartLegend isDark={isDark} forecastLabel="IEA STEPS Forecast" />

      <div ref={containerRef} className="w-full" style={{ touchAction: "pan-y" }}>
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
      </div>

      <div className={`border rounded-xl overflow-hidden ${isDark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>
        {pinned ? (
          <div className="px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono font-bold ${isDark ? "text-white/50" : "text-slate-500"}`}>{pinned.year}</span>
              <ForecastBadge isForecast={pinned.isForecast} isDark={isDark} />
            </div>
            <p className="text-xl font-bold text-teal-500 mt-1">
              {fmtEvSales(pinned.sales)} <span className={`text-sm font-normal ${isDark ? "text-white/50" : "text-slate-500"}`}>electric vehicles sold</span>
            </p>
            {pinned.yoy !== null && (
              <p className={`text-sm font-semibold ${pinned.yoy >= 0 ? "text-green-500" : "text-red-400"}`}>
                {pinned.yoy >= 0 ? "↑" : "↓"} {Math.abs(pinned.yoy).toFixed(1)}% vs previous year
              </p>
            )}
          </div>
        ) : (
          <p className={`text-xs px-4 py-4 text-center ${isDark ? "text-white/30" : "text-slate-400"}`}>
            Tap or hover the chart to explore sales by year
          </p>
        )}
      </div>

    </div>
  );
}
