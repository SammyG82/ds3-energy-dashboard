"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow, GdpMeta } from "@/lib/data";


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

function fmtSales(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
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

  // Pinned years for each area chart (recomputed live from current meta/adoption)
  const [evPinnedYear, setEvPinnedYear] = useState<number | null>(null);
  const [oilPinnedYear, setOilPinnedYear] = useState<number | null>(null);
  // Pinned country for GDP bar chart
  const [gdpPinnedCountry, setGdpPinnedCountry] = useState<string | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const meta = useMemo(
    () => gdpMeta.find((m) => m.country === country),
    [gdpMeta, country]
  );

  useEffect(() => { setEvPinnedYear(null); setOilPinnedYear(null); }, [meta]);
  useEffect(() => { setGdpPinnedCountry(null); }, [year, adoption, country]);

  const { sales, oilDisplaced, costSavings, gdpPercent } = meta
    ? compute(meta.region, year, adoption, meta, evData)
    : { sales: 0, oilDisplaced: 0, costSavings: 0, gdpPercent: 0 };

  // Fixed y-axis domains so the charts don't rescale as the year slider moves
  const maxEvY = useMemo(
    () => meta ? (d3.max(years, (yr) => compute(meta.region, yr, adoption, meta, evData).sales) ?? undefined) : undefined,
    [meta, adoption, evData, years]
  );
  const maxOilY = useMemo(
    () => meta ? (d3.max(years, (yr) => compute(meta.region, yr, adoption, meta, evData).oilDisplaced) ?? undefined) : undefined,
    [meta, adoption, evData, years]
  );

  // Compute pinned values live from current meta/adoption for area charts
  const evPinnedVal = evPinnedYear !== null && meta
    ? compute(meta.region, evPinnedYear, adoption, meta, evData).sales
    : null;
  const oilPinnedVal = oilPinnedYear !== null && meta
    ? compute(meta.region, oilPinnedYear, adoption, meta, evData).oilDisplaced
    : null;

  // Compute pinned values for GDP bar chart
  const gdpPinnedMeta = gdpPinnedCountry ? gdpMeta.find((m) => m.country === gdpPinnedCountry) : null;
  const gdpPinnedData = gdpPinnedMeta
    ? compute(gdpPinnedMeta.region, year, adoption, gdpPinnedMeta, evData)
    : null;

  const drawAreaChart = useCallback(
    (
      svgEl: SVGSVGElement | null,
      currentYear: number,
      getY: (yr: number) => number,
      color: string,
      yFmt: (v: number) => string,
      onHover: (yr: number) => void,
      onClear: () => void,
      maxY?: number
    ) => {
      if (!svgEl || containerWidth === 0) return;
      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();

      const totalW = (containerWidth - 16) / 2 - 32;
      const margin = { top: 12, right: 12, bottom: 28, left: 52 };
      const totalH = 220;
      const width = Math.max(totalW - margin.left - margin.right, 80);
      const height = totalH - margin.top - margin.bottom;

      svg.attr("width", totalW).attr("height", totalH);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const allYears = Array.from(new Set(evData.map((d) => d.year)))
        .filter((y) => y <= currentYear)
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
          const yr = Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx))));
          crosshair.style("visibility", "visible").attr("x1", x(yr)).attr("x2", x(yr));
          onHover(yr);
        })
        .on("mouseleave", function () {
          crosshair.style("visibility", "hidden");
          onClear();
        });
    },
    [evData, containerWidth]
  );

  useEffect(() => {
    if (!meta) return;
    drawAreaChart(
      evSvg.current,
      year,
      (yr) => compute(meta.region, yr, adoption, meta, evData).sales,
      "#0891b2",
      (v) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : (v / 1_000).toFixed(0) + "k",
      setEvPinnedYear,
      () => setEvPinnedYear(null),
      maxEvY
    );
    drawAreaChart(
      oilSvg.current,
      year,
      (yr) => compute(meta.region, yr, adoption, meta, evData).oilDisplaced,
      "#d97706",
      (v) => v >= 1 ? v.toFixed(1) + "M" : v.toFixed(2) + "M",
      setOilPinnedYear,
      () => setOilPinnedYear(null),
      maxOilY
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

    const barsSel = g.selectAll<SVGRectElement, { country: string; pct: number }>(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.country) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => d.country === country ? "#d97706" : "#0891b2")
      .attr("opacity", (d) => d.country === country ? 1 : 0.7)
      .attr("y", height).attr("height", 0);

    barsSel
      .on("mouseover", function (_, d) {
        barsSel.interrupt().attr("opacity", 0.25).attr("stroke", "none");
        g.selectAll(".val-label").interrupt();
        d3.select(this).attr("opacity", 1.0).attr("stroke", "#1e293b").attr("stroke-width", 1.5);
        setGdpPinnedCountry(d.country);
      })
      .on("mouseleave", function () {
        barsSel
          .attr("opacity", (d) => d.country === country ? 1 : 0.7)
          .attr("stroke", "none");
        setGdpPinnedCountry(null);
      });

    barsSel
      .transition().duration(500)
      .attr("y", (d) => y(d.pct))
      .attr("height", (d) => height - y(d.pct));

    g.selectAll(".val-label").data(chartData).enter()
      .append("text")
      .attr("class", "val-label")
      .attr("x", (d) => (x(d.country) ?? 0) + x.bandwidth() / 2)
      .attr("y", height)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .attr("opacity", 0)
      .attr("pointer-events", "none")
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
          <p className="text-xs text-slate-400 font-mono mt-1">0.5x = slower growth · 2x = double the projected rate</p>
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
          <p className="text-xl font-bold text-teal-600">{fmtSales(sales)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{country} {year}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Oil Saved</p>
          <p className="text-xl font-bold text-amber-600">{oilDisplaced.toFixed(0)}M</p>
          <p className="text-xs text-slate-400 mt-0.5">barrels per year</p>
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Trajectory</p>
          <p className="text-sm font-bold text-slate-800">EV Sales Volume</p>
          <svg ref={evSvg} className="w-full" role="img" aria-label="Area chart of EV sales trajectory over time" />
          <div className="border border-slate-100 rounded-lg bg-slate-50 px-3 py-2 min-h-[40px] flex items-center">
            {evPinnedYear !== null && evPinnedVal !== null ? (
              <span className="text-xs text-slate-700">
                <span className="font-mono font-bold">{evPinnedYear}</span>
                {" — "}
                <span className="font-semibold">{fmtSales(evPinnedVal)}</span>
                {" electric vehicles sold"}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">Hover the chart to see values by year</span>
            )}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Displacement</p>
          <p className="text-sm font-bold text-slate-800">Oil Displaced</p>
          <svg ref={oilSvg} className="w-full" role="img" aria-label="Area chart of oil displaced by EVs over time" />
          <div className="border border-slate-100 rounded-lg bg-slate-50 px-3 py-2 min-h-[40px] flex items-center">
            {oilPinnedYear !== null && oilPinnedVal !== null ? (
              <span className="text-xs text-slate-700">
                <span className="font-mono font-bold">{oilPinnedYear}</span>
                {" — "}
                <span className="font-semibold">{oilPinnedVal.toFixed(1)}M barrels of oil saved per year</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">Hover the chart to see values by year</span>
            )}
          </div>
        </div>
      </div>

      {/* GDP bar chart full width */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Comparative</p>
        <p className="text-sm font-bold text-slate-800 mb-3">% of GDP Saved on Oil Imports by Country</p>
        <svg ref={gdpSvg} className="w-full" role="img" aria-label="Bar chart of GDP savings from oil displacement by country" />
        <div className="border border-slate-100 rounded-lg bg-slate-50 px-4 py-3 mt-3 relative">
          {!gdpPinnedData && (
            <div className="absolute inset-0 flex items-center px-4">
              <span className="text-xs text-slate-400 font-mono">Hover a country bar to see its oil savings breakdown</span>
            </div>
          )}
          <div className={`flex flex-wrap gap-x-8 gap-y-1 ${!gdpPinnedData ? "invisible" : ""}`}>
            <span className="font-bold text-slate-800 w-full">{gdpPinnedCountry ?? "Country Name"}</span>
            <span className="text-xs text-slate-600">Oil saved: <span className="font-semibold">{gdpPinnedData?.oilDisplaced.toFixed(1) ?? "0.0"}M barrels per year</span></span>
            <span className="text-xs text-slate-600">Cost saved: <span className="font-semibold">${gdpPinnedData?.costSavings.toFixed(1) ?? "0.0"}B per year on oil imports</span></span>
            <span className="text-xs text-slate-600">=&nbsp;<span className="font-semibold">{gdpPinnedData?.gdpPercent.toFixed(3) ?? "0.000"}%</span> of the country&apos;s entire economy (GDP)</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 font-mono bg-blue-50 border border-blue-100 rounded-lg p-3">
        <strong className="text-blue-600 font-mono">Methodology</strong> — EV forecasts via logistic S-curve.
        Each EV displaces ~1,300 gallons/year (≈31 barrels). GDP savings use country-specific import cost per barrel and nominal GDP.
        Adoption rate multiplier scales projected sales linearly.
      </p>
    </div>
  );
}
