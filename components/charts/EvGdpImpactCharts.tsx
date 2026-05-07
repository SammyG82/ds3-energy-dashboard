"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow, GdpMeta } from "@/lib/data";

export type { GdpMeta };

interface Props {
  evData: EvRow[];
  gdpMeta: GdpMeta[];
}

const GALLONS_PER_EV = 1300;
const BARRELS_PER_GALLON = 1 / 42;

function compute(evRegion: string, year: number, adoption: number, meta: GdpMeta, evData: EvRow[]) {
  const row = evData.find((d) => d.region_country === evRegion && d.year === year);
  const sales = (row?.ev_sales ?? 0) * adoption;
  const oilDisplaced = (sales * GALLONS_PER_EV * BARRELS_PER_GALLON) / 1_000_000;
  const costSavings = (oilDisplaced * 1_000_000 * meta.costPerBarrel) / 1_000_000_000;
  const gdpPercent = (costSavings / meta.gdp) * 100;
  return { sales, oilDisplaced, costSavings, gdpPercent };
}

export default function EvGdpImpactCharts({ evData, gdpMeta }: Props) {
  const evSvg = useRef<SVGSVGElement>(null);
  const oilSvg = useRef<SVGSVGElement>(null);
  const gdpSvg = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const countries = useMemo(() => gdpMeta.map((m) => m.country), [gdpMeta]);
  const years = useMemo(
    () => Array.from(new Set(evData.map((d) => d.year))).filter((y) => y >= 2024 && y <= 2030).sort(),
    [evData]
  );

  const [country, setCountry] = useState(() => countries[0] ?? "");
  const [year, setYear] = useState(() => years[0] ?? 2024);

  useEffect(() => {
    if (countries.length) setCountry(countries[0]);
  }, [countries]);

  useEffect(() => {
    if (years.length) setYear(years[0]);
  }, [years]);

  const [adoption, setAdoption] = useState(1.0);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const meta = gdpMeta.find((m) => m.country === country);
  const { sales, oilDisplaced, costSavings, gdpPercent } = meta
    ? compute(meta.region, year, adoption, meta, evData)
    : { sales: 0, oilDisplaced: 0, costSavings: 0, gdpPercent: 0 };

  const drawAreaChart = useCallback(
    (
      svgEl: SVGSVGElement | null,
      getY: (yr: number) => number,
      color: string,
      yFmt: (v: number) => string,
      maxY?: number
    ) => {
      if (!svgEl || containerWidth === 0) return;
      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();

      const totalW = containerWidth / 2 - 16;
      const margin = { top: 12, right: 12, bottom: 28, left: 52 };
      const totalH = 220;
      const width = Math.max(totalW - margin.left - margin.right, 80);
      const height = totalH - margin.top - margin.bottom;

      svg.attr("width", totalW).attr("height", totalH);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const allYears = Array.from(new Set(evData.map((d) => d.year)))
        .filter((y) => y <= year)
        .sort();
      if (!allYears.length) return;
      const chartData = allYears.map((yr) => ({ yr, val: getY(yr) }));

      const x = d3.scaleLinear().domain(d3.extent(allYears) as [number, number]).range([0, width]);
      const yScale = d3.scaleLinear()
        .domain([0, maxY ?? d3.max(chartData, (d) => d.val) ?? 1])
        .nice().range([height, 0]);

      g.selectAll(".grid-h").data(yScale.ticks(4)).enter()
        .append("line").attr("x1", 0).attr("x2", width)
        .attr("y1", (d) => yScale(d)).attr("y2", (d) => yScale(d))
        .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

      const area = d3.area<{ yr: number; val: number }>()
        .x((d) => x(d.yr)).y0(height).y1((d) => yScale(d.val))
        .curve(d3.curveMonotoneX);

      g.append("path").datum(chartData)
        .attr("fill", color).attr("opacity", 0.15).attr("d", area);

      const line = d3.line<{ yr: number; val: number }>()
        .x((d) => x(d.yr)).y((d) => yScale(d.val)).curve(d3.curveMonotoneX);

      g.append("path").datum(chartData)
        .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);

      g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(4));

      g.append("g").attr("class", "chart-axis")
        .call(d3.axisLeft(yScale).ticks(4).tickFormat(yFmt as (v: d3.NumberValue) => string));
    },
    [evData, year, containerWidth]
  );

  useEffect(() => {
    if (!meta) return;
    drawAreaChart(
      evSvg.current,
      (yr) => compute(meta.region, yr, adoption, meta, evData).sales,
      "#0891b2",
      (v) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : (v / 1_000).toFixed(0) + "k"
    );
    drawAreaChart(
      oilSvg.current,
      (yr) => compute(meta.region, yr, adoption, meta, evData).oilDisplaced,
      "#d97706",
      (v) => v.toFixed(0) + "M"
    );
  }, [meta, year, adoption, evData, drawAreaChart]);

  useEffect(() => {
    if (!gdpSvg.current || containerWidth === 0 || !gdpMeta.length) return;

    const svg = d3.select(gdpSvg.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 16, right: 16, bottom: 56, left: 56 };
    const totalH = 260;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const chartData = gdpMeta.map((m) => ({
      country: m.country,
      pct: compute(m.region, year, adoption, m, evData).gdpPercent,
    })).sort((a, b) => b.pct - a.pct);

    const x = d3.scaleBand().domain(chartData.map((d) => d.country)).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, (d) => d.pct) ?? 0.01]).nice().range([height, 0]);

    g.selectAll(".grid-h").data(y.ticks(4)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    g.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.country) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => d.country === country ? "#d97706" : "#0891b2")
      .attr("opacity", (d) => d.country === country ? 1 : 0.7)
      .attr("y", height).attr("height", 0)
      .transition().duration(500)
      .attr("y", (d) => y(d.pct))
      .attr("height", (d) => height - y(d.pct));

    g.selectAll(".val-label").data(chartData).enter()
      .append("text")
      .attr("x", (d) => (x(d.country) ?? 0) + x.bandwidth() / 2)
      .attr("y", height)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .attr("opacity", 0)
      .text((d) => d.pct.toFixed(3) + "%")
      .transition().duration(500)
      .attr("y", (d) => y(d.pct) - 5)
      .attr("opacity", 1);

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end").attr("font-size", "11px");

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((d) => `${(+d).toFixed(3)}%`).ticks(4));
  }, [gdpMeta, year, adoption, country, evData, containerWidth]);

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">EV Adoption Rate</span>
            <span className="text-sm font-bold text-teal-600">{adoption.toFixed(1)}x</span>
          </div>
          <input
            type="range" min="0.5" max="3" step="0.1" value={adoption}
            aria-label="EV Adoption Rate multiplier"
            onChange={(e) => setAdoption(parseFloat(e.target.value))}
            className="w-full accent-teal-600"
          />
          <p className="text-xs text-slate-400 font-mono mt-1">0.5x = slower · 2x = double rate</p>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Analysis Year</span>
            <span className="text-sm font-bold text-teal-600">{year}</span>
          </div>
          <input
            type="range"
            min={years.length ? years[0] : 2024}
            max={years.length ? years[years.length - 1] : 2030}
            step="1" value={year}
            aria-label="Analysis Year"
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full accent-teal-600"
          />
          <p className="text-xs text-slate-400 font-mono mt-1">Select 2024 – 2030</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="gdp-country-select" className="text-xs font-mono uppercase tracking-widest text-slate-400">Country</label>
          <select
            id="gdp-country-select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">EV Sales</p>
          <p className="text-xl font-bold text-teal-600">
            {sales >= 1_000_000 ? (sales / 1_000_000).toFixed(2) + "M" : (sales / 1_000).toFixed(0) + "k"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{country} {year}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Oil Saved</p>
          <p className="text-xl font-bold text-amber-600">{oilDisplaced.toFixed(0)}M</p>
          <p className="text-xs text-slate-400 mt-0.5">bbl / year</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">GDP Savings</p>
          <p className="text-xl font-bold text-teal-600">{gdpPercent.toFixed(3)}%</p>
          <p className="text-xs text-slate-400 mt-0.5">of GDP</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Cost Saved</p>
          <p className="text-xl font-bold text-blue-600">${costSavings.toFixed(1)}B</p>
          <p className="text-xs text-slate-400 mt-0.5">annually</p>
        </div>
      </div>

      {/* Two area charts side by side */}
      <div ref={containerRef} className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Trajectory</p>
          <p className="text-sm font-bold text-slate-800 mb-3">EV Sales Volume</p>
          <svg ref={evSvg} className="w-full" role="img" aria-label="Area chart of EV sales trajectory over time" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Displacement</p>
          <p className="text-sm font-bold text-slate-800 mb-3">Oil Displaced (M Bbl/Yr)</p>
          <svg ref={oilSvg} className="w-full" role="img" aria-label="Area chart of oil displaced by EVs over time" />
        </div>
      </div>

      {/* GDP bar chart full width */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Comparative</p>
        <p className="text-sm font-bold text-slate-800 mb-3">% of GDP Saved on Oil Imports by Country</p>
        <svg ref={gdpSvg} className="w-full" role="img" aria-label="Bar chart of GDP savings from oil displacement by country" />
      </div>

      <p className="text-xs text-slate-400 font-mono bg-blue-50 border border-blue-100 rounded-lg p-3">
        <strong className="text-blue-600 font-mono">Methodology</strong> — EV forecasts via logistic S-curve.
        Each EV displaces ~1,300 gallons/year (≈31 barrels). GDP savings use country-specific import cost per barrel and nominal GDP.
        Adoption rate multiplier scales projected sales linearly.
      </p>
    </div>
  );
}
