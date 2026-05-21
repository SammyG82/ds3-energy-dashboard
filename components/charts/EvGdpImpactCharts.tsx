"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow, GdpMeta, OilPriceRow } from "@/lib/data";
import { fmtEvSales } from "@/lib/data";
import { useContainerSize } from "@/lib/ui-utils";
import StatCard from "@/components/ui/StatCard";

interface Props {
  evData: EvRow[];
  gdpMeta: GdpMeta[];
  oilPrices: OilPriceRow[];
}

const GALLONS_PER_EV = 1300;
const GALLONS_PER_BARREL = 42;
const FALLBACK_PRICE = 75;

function compute(evRegion: string, year: number, adoption: number, meta: GdpMeta, evData: EvRow[], oilPrice: number) {
  const row = evData.find((d) => d.region_country === evRegion && d.year === year);
  const sales = (row?.ev_sales ?? 0) * adoption;
  const oilDisplaced = (sales * GALLONS_PER_EV) / (GALLONS_PER_BARREL * 1_000_000);
  const costSavings = (oilDisplaced * 1_000_000 * oilPrice) / 1_000_000_000;
  const gdpPercent = (costSavings / meta.gdp) * 100;
  return { sales, oilDisplaced, costSavings, gdpPercent };
}

type Benchmark = "brent" | "wti";

export default function EvGdpImpactCharts({ evData, gdpMeta, oilPrices }: Props) {
  const evSvg    = useRef<SVGSVGElement>(null);
  const oilSvg   = useRef<SVGSVGElement>(null);
  const gdpSvg   = useRef<SVGSVGElement>(null);
  const priceSvg = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useContainerSize(containerRef);

  const countries = useMemo(() => gdpMeta.map((m) => m.country), [gdpMeta]);
  const years = useMemo(
    () => Array.from(new Set(evData.map((d) => d.year))).filter((y) => y >= 2024 && y <= 2030).sort(),
    [evData]
  );

  const [country,     setCountry]     = useState(() => countries[0] ?? "");
  const [year,        setYear]        = useState(() => years[0] ?? 2024);
  const [adoption,    setAdoption]    = useState(1.0);
  const [benchmark,   setBenchmark]   = useState<Benchmark>("brent");
  const [customPrice, setCustomPrice] = useState<number>(FALLBACK_PRICE);

  useEffect(() => { if (countries.length) setCountry(countries[0]); }, [countries]);
  useEffect(() => { if (years.length)     setYear(years[0]);         }, [years]);

  const [evPinnedYear,      setEvPinnedYear]      = useState<number | null>(null);
  const [oilPinnedYear,     setOilPinnedYear]     = useState<number | null>(null);
  const [gdpPinnedCountry,  setGdpPinnedCountry]  = useState<string | null>(null);
  const [pricePinnedYear,   setPricePinnedYear]   = useState<number | null>(null);

  const meta = useMemo(() => gdpMeta.find((m) => m.country === country), [gdpMeta, country]);

  useEffect(() => { setEvPinnedYear(null);  setOilPinnedYear(null);  }, [meta, adoption, year, containerWidth]);
  useEffect(() => { setGdpPinnedCountry(null); },                      [year, adoption, country, containerWidth]);
  useEffect(() => { setPricePinnedYear(null); },                        [oilPrices, year, benchmark, containerWidth]);

  const forecastBoundary = useMemo(() => evData.find((d) => d.type === "Forecast")?.year ?? 2025, [evData]);
  const isProjected = year >= forecastBoundary;

  const latestDataYear = useMemo(() => oilPrices.length ? oilPrices[oilPrices.length - 1].year : 2026, [oilPrices]);
  const beyondData = year > latestDataYear;

  // When switching benchmark, reset custom price to that benchmark's latest nominal value
  useEffect(() => {
    if (!oilPrices.length) return;
    const lastRow = oilPrices[oilPrices.length - 1];
    setCustomPrice((benchmark === "brent" ? lastRow.brent_nominal : lastRow.wti_nominal) ?? FALLBACK_PRICE);
  }, [benchmark, oilPrices]);

  // For years within data range use actual nominal price; beyond that use the slider
  const currentOilPrice = useMemo(() => {
    if (beyondData) return customPrice;
    if (!oilPrices.length) return FALLBACK_PRICE;
    const priceRow = oilPrices.find((r) => r.year === year) ?? oilPrices[oilPrices.length - 1];
    return (benchmark === "brent" ? priceRow.brent_nominal : priceRow.wti_nominal) ?? FALLBACK_PRICE;
  }, [oilPrices, year, benchmark, beyondData, customPrice]);

  // Label for the oil price stat card
  const priceRefYear = useMemo(() => {
    if (!oilPrices.length) return year;
    return (oilPrices.find((r) => r.year === year) ?? oilPrices[oilPrices.length - 1]).year;
  }, [oilPrices, year]);

  const { sales, oilDisplaced, costSavings, gdpPercent } = meta
    ? compute(meta.region, year, adoption, meta, evData, currentOilPrice)
    : { sales: 0, oilDisplaced: 0, costSavings: 0, gdpPercent: 0 };

  const maxEvY = useMemo(
    () => meta ? (d3.max(years, (yr) => compute(meta.region, yr, adoption, meta, evData, currentOilPrice).sales) ?? undefined) : undefined,
    [meta, adoption, evData, years, currentOilPrice]
  );
  const maxOilY = useMemo(
    () => meta ? (d3.max(years, (yr) => compute(meta.region, yr, adoption, meta, evData, currentOilPrice).oilDisplaced) ?? undefined) : undefined,
    [meta, adoption, evData, years, currentOilPrice]
  );

  const evPinnedVal  = evPinnedYear  !== null && meta ? compute(meta.region, evPinnedYear,  adoption, meta, evData, currentOilPrice).sales         : null;
  const oilPinnedVal = oilPinnedYear !== null && meta ? compute(meta.region, oilPinnedYear, adoption, meta, evData, currentOilPrice).oilDisplaced   : null;

  const gdpPinnedMeta = gdpPinnedCountry ? gdpMeta.find((m) => m.country === gdpPinnedCountry) : null;
  const gdpPinnedData = gdpPinnedMeta
    ? compute(gdpPinnedMeta.region, year, adoption, gdpPinnedMeta, evData, currentOilPrice)
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

      const isTwoCol = containerWidth >= 640;
      const totalW = isTwoCol ? (containerWidth - 16) / 2 - 32 : containerWidth - 32;
      const margin = { top: 12, right: 12, bottom: 28, left: 52 };
      const totalH = 220;
      const width  = Math.max(totalW - margin.left - margin.right, 80);
      const height = totalH - margin.top - margin.bottom;

      svg.attr("width", totalW).attr("height", totalH);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const allYears = Array.from(new Set(evData.map((d) => d.year)))
        .filter((y) => y <= currentYear).sort();
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
        .x((d) => x(d.yr)).y0(height).y1((d) => yScale(d.val)).curve(d3.curveMonotoneX);
      g.append("path").datum(chartData).attr("fill", color).attr("opacity", 0.15).attr("d", area);

      const line = d3.line<{ yr: number; val: number }>()
        .x((d) => x(d.yr)).y((d) => yScale(d.val)).curve(d3.curveMonotoneX);
      g.append("path").datum(chartData).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);

      g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(4));
      g.append("g").attr("class", "chart-axis")
        .call(d3.axisLeft(yScale).ticks(4).tickFormat(yFmt as (v: d3.NumberValue) => string));

      const crosshair = g.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#64748b").attr("stroke-width", 1).attr("stroke-dasharray", "4 2")
        .style("visibility", "hidden").style("pointer-events", "none");

      g.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent")
        .style("pointer-events", "all")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event);
          const [xMin, xMax] = x.domain();
          const yr = Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx))));
          crosshair.style("visibility", "visible").attr("x1", x(yr)).attr("x2", x(yr));
          onHover(yr);
        })
        .on("mouseleave", function () { crosshair.style("visibility", "hidden"); onClear(); });
    },
    [evData, containerWidth]
  );

  useEffect(() => {
    if (!meta) return;
    drawAreaChart(evSvg.current,  year, (yr) => compute(meta.region, yr, adoption, meta, evData, currentOilPrice).sales,        "#0891b2", (v) => fmtEvSales(v),                                       setEvPinnedYear,  () => setEvPinnedYear(null),  maxEvY);
    drawAreaChart(oilSvg.current, year, (yr) => compute(meta.region, yr, adoption, meta, evData, currentOilPrice).oilDisplaced, "#d97706", (v) => v >= 1 ? v.toFixed(1) + "M" : v.toFixed(2) + "M", setOilPinnedYear, () => setOilPinnedYear(null), maxOilY);
  }, [meta, year, adoption, evData, currentOilPrice, drawAreaChart]);

  // GDP bar chart
  useEffect(() => {
    if (!gdpSvg.current || containerWidth === 0 || !gdpMeta.length) return;

    const svg = d3.select(gdpSvg.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth - 32;
    const margin = { top: 16, right: 16, bottom: 80, left: 56 };
    const totalH = 290;
    const width  = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH).attr("overflow", "visible");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const chartData = gdpMeta.map((m) => ({
      country: m.country,
      pct: compute(m.region, year, adoption, m, evData, currentOilPrice).gdpPercent,
    })).sort((a, b) => b.pct - a.pct);

    const x = d3.scaleBand().domain(chartData.map((d) => d.country)).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, (d) => d.pct) ?? 0.01]).nice().range([height, 0]);

    g.selectAll(".grid-h").data(y.ticks(4)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    const barsSel = g.selectAll<SVGRectElement, { country: string; pct: number }>(".bar")
      .data(chartData).enter().append("rect").attr("class", "bar")
      .attr("x", (d) => x(d.country) ?? 0).attr("width", x.bandwidth()).attr("rx", 3)
      .attr("fill",    (d) => d.country === country ? "#d97706" : "#0891b2")
      .attr("opacity", (d) => d.country === country ? 1 : 0.7)
      .attr("y", (d) => y(d.pct)).attr("height", (d) => height - y(d.pct));

    barsSel
      .on("mouseover", function (_, d) {
        barsSel.attr("opacity", 0.25).attr("stroke", "none");
        d3.select(this).attr("opacity", 1.0).attr("stroke", "#1e293b").attr("stroke-width", 1.5);
        setGdpPinnedCountry(d.country);
      })
      .on("mouseleave", function () {
        barsSel.attr("opacity", (d) => d.country === country ? 1 : 0.7).attr("stroke", "none");
        setGdpPinnedCountry(null);
      });

    g.selectAll(".val-label").data(chartData).enter()
      .append("text").attr("class", "val-label")
      .attr("x", (d) => (x(d.country) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.pct) - 5)
      .attr("text-anchor", "middle").attr("font-size", "10px")
      .attr("font-family", "ui-monospace, monospace").attr("fill", "#64748b")
      .attr("pointer-events", "none")
      .text((d) => d.pct.toFixed(3) + "%");

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end").attr("font-size", "11px");
    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((d) => `${(+d).toFixed(3)}%`).ticks(4));
  }, [gdpMeta, year, adoption, country, evData, currentOilPrice, containerWidth]);

  // Historical oil price chart
  useEffect(() => {
    if (!priceSvg.current || containerWidth === 0 || !oilPrices.length) return;

    const svg = d3.select(priceSvg.current);
    svg.selectAll("*").remove();

    const chartData = oilPrices.filter((r) => r.year >= 2017);
    const latestDataYear = oilPrices[oilPrices.length - 1].year;
    const refYear = Math.min(year, latestDataYear);

    const totalW = containerWidth - 32;
    const margin = { top: 16, right: 24, bottom: 28, left: 52 };
    const totalH = 220;
    const width  = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(chartData, (d) => d.year) as [number, number])
      .range([0, width]);

    const allVals = chartData.flatMap((d) => [d.brent_nominal, d.wti_nominal, d.brent_real, d.wti_real]).filter((v): v is number => v !== null);
    const y = d3.scaleLinear().domain([0, d3.max(allVals) ?? 100]).nice().range([height, 0]);

    g.selectAll(".grid-h").data(y.ticks(4)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    type NomKey  = "brent_nominal" | "wti_nominal";
    type RealKey = "brent_real"    | "wti_real";
    const makeLine = (key: NomKey | RealKey) =>
      d3.line<OilPriceRow>()
        .defined((d) => d[key] !== null)
        .x((d) => x(d.year))
        .y((d) => y(d[key] as number))
        .curve(d3.curveMonotoneX);

    const makeArea = (nomKey: NomKey, realKey: RealKey) =>
      d3.area<OilPriceRow>()
        .defined((d) => d[nomKey] !== null && d[realKey] !== null)
        .x((d) => x(d.year))
        .y0((d) => y(d[nomKey] as number))
        .y1((d) => y(d[realKey] as number))
        .curve(d3.curveMonotoneX);

    const series: { nomKey: NomKey; realKey: RealKey; label: Benchmark; color: string }[] = [
      { nomKey: "brent_nominal", realKey: "brent_real", label: "brent", color: "#d97706" },
      { nomKey: "wti_nominal",   realKey: "wti_real",   label: "wti",   color: "#0891b2" },
    ];

    for (const { nomKey, realKey, label, color } of series) {
      const active = label === benchmark;
      const opacity = active ? 1 : 0.3;

      // Shaded area between nominal and real (inflation gap, 2017–2024)
      g.append("path")
        .datum(chartData)
        .attr("fill", color)
        .attr("opacity", active ? 0.12 : 0.05)
        .attr("d", makeArea(nomKey, realKey));

      // Real price — dashed line
      g.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", active ? 1.5 : 1)
        .attr("stroke-dasharray", "4 3")
        .attr("opacity", active ? 0.7 : 0.2)
        .attr("d", makeLine(realKey));

      // Nominal price — solid line
      g.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", active ? 2.5 : 1.5)
        .attr("opacity", opacity)
        .attr("d", makeLine(nomKey));
    }

    // Reference line at the analysis year (capped at latest data)
    g.append("line")
      .attr("x1", x(refYear)).attr("x2", x(refYear))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#64748b").attr("stroke-width", 1).attr("stroke-dasharray", "4 2");

    // Nominal price label at reference year for the active benchmark
    const refRow = oilPrices.find((r) => r.year === refYear) ?? oilPrices[oilPrices.length - 1];
    const refPrice = (benchmark === "brent" ? refRow.brent_nominal : refRow.wti_nominal) ?? null;
    if (refPrice !== null) {
      const labelY = y(refPrice) - 8;
      g.append("text")
        .attr("x", x(refYear) + 5).attr("y", labelY < 10 ? labelY + 18 : labelY)
        .attr("font-size", "11px").attr("font-family", "ui-monospace, monospace")
        .attr("fill", benchmark === "brent" ? "#d97706" : "#0891b2")
        .text(`$${refPrice.toFixed(0)}`);
    }

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));
    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => `$${+d}`));

    // Crosshair
    const crosshair = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "3 2")
      .style("visibility", "hidden").style("pointer-events", "none");

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "transparent").style("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const [xMin, xMax] = x.domain();
        const yr = Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx))));
        crosshair.style("visibility", "visible").attr("x1", x(yr)).attr("x2", x(yr));
        setPricePinnedYear(yr);
      })
      .on("mouseleave", function () {
        crosshair.style("visibility", "hidden");
        setPricePinnedYear(null);
      });
  }, [oilPrices, year, benchmark, containerWidth]);

  return (
    <div className="flex flex-col gap-6">

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">EV Adoption Rate</span>
            <span className="text-sm font-bold text-teal-600">{adoption.toFixed(1)}x</span>
          </div>
          <input type="range" min="0.5" max="3" step="0.1" value={adoption}
            aria-label="EV Adoption Rate multiplier"
            onChange={(e) => setAdoption(parseFloat(e.target.value))}
            className="w-full accent-teal-600" />
          <p className="text-xs text-slate-400 font-mono mt-1">0.5x = slower growth · 2x = double the projected rate</p>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Analysis Year</span>
            <span className="text-sm font-bold text-teal-600">{year}</span>
          </div>
          <input type="range"
            min={years.length ? years[0] : 2024} max={years.length ? years[years.length - 1] : 2030}
            step="1" value={year} aria-label="Analysis Year"
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full accent-teal-600" />
          <p className="text-xs text-slate-400 font-mono mt-1">Select 2024 – 2030</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="gdp-country-select" className="text-xs font-mono uppercase tracking-widest text-slate-400">Country</label>
            <select id="gdp-country-select" value={country} onChange={(e) => setCountry(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300">
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Price Benchmark</span>
            <div className="flex gap-2">
              {(["brent", "wti"] as Benchmark[]).map((b) => (
                <button key={b} onClick={() => setBenchmark(b)}
                  className={`flex-1 text-xs font-mono py-1.5 rounded-lg border transition-colors ${
                    benchmark === b
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-teal-300"
                  }`}>
                  {b === "brent" ? "Brent" : "WTI"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}EV Sales`}    value={fmtEvSales(sales)}                                             sub={`${country} ${year}`}        accent="teal" />
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}Oil Saved`}   value={`${oilDisplaced >= 1 ? oilDisplaced.toFixed(0) : oilDisplaced.toFixed(1)}M`} sub="barrels per year"  accent="amber" />
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}Cost Saved`}  value={`$${costSavings.toFixed(1)}B`}                                 sub="annually"                    accent="blue" />
        <StatCard size="xl" label={`${isProjected ? "Projected " : ""}GDP Savings`} value={`${gdpPercent.toFixed(3)}%`}                                   sub="of GDP"                      accent="teal" />
      </div>

      {/* Stat cards — row 2: oil price + scenario slider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard size="xl"
          label={`${benchmark === "brent" ? "Brent" : "WTI"} Crude${beyondData ? "" : ` (${priceRefYear} avg)`}`}
          value={`$${currentOilPrice.toFixed(2)}/bbl`}
          sub={beyondData ? "custom scenario assumption" : "nominal USD · FRED"}
          accent="amber" />

        <div className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-opacity ${beyondData ? "border-amber-200" : "border-slate-200 opacity-40 pointer-events-none select-none"}`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className={`text-xs font-mono uppercase tracking-widest mb-0.5 ${beyondData ? "text-amber-500" : "text-slate-400"}`}>Price Assumption</p>
              <p className="text-xs text-slate-400 font-mono">
                {beyondData ? `No oil price data beyond ${latestDataYear} — set your own` : `Unlocks for years after ${latestDataYear}`}
              </p>
            </div>
            <span className={`text-xl font-bold tabular-nums ${beyondData ? "text-amber-600" : "text-slate-400"}`}>
              ${beyondData ? customPrice.toFixed(0) : "—"}/bbl
            </span>
          </div>
          <input type="range" min={40} max={150} step={1}
            value={beyondData ? customPrice : FALLBACK_PRICE}
            disabled={!beyondData}
            aria-label="Custom oil price assumption"
            onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
            className={`w-full ${beyondData ? "accent-amber-500" : "accent-slate-300"}`} />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400 font-mono">$40</span>
            <span className="text-xs text-slate-400 font-mono">$150</span>
          </div>
        </div>
      </div>

      {/* Area charts */}
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Trajectory</p>
          <p className="text-sm font-bold text-slate-800">EV Sales Volume</p>
          <svg ref={evSvg} className="w-full" role="img" aria-label="Area chart of EV sales trajectory over time" />
          <div className="border border-slate-100 rounded-lg bg-slate-50 px-3 py-2 min-h-10 flex items-center">
            {evPinnedYear !== null && evPinnedVal !== null ? (
              <span className="text-xs text-slate-700">
                <span className="font-mono font-bold">{evPinnedYear}</span>{" — "}
                <span className="font-semibold">{fmtEvSales(evPinnedVal)}</span>{" electric vehicles sold"}
              </span>
            ) : <span className="text-xs text-slate-400 font-mono">Hover the chart to see values by year</span>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Displacement</p>
          <p className="text-sm font-bold text-slate-800">Oil Displaced</p>
          <svg ref={oilSvg} className="w-full" role="img" aria-label="Area chart of oil displaced by EVs over time" />
          <div className="border border-slate-100 rounded-lg bg-slate-50 px-3 py-2 min-h-10 flex items-center">
            {oilPinnedYear !== null && oilPinnedVal !== null ? (
              <span className="text-xs text-slate-700">
                <span className="font-mono font-bold">{oilPinnedYear}</span>{" — "}
                <span className="font-semibold">{oilPinnedVal.toFixed(1)}M barrels of oil saved per year</span>
              </span>
            ) : <span className="text-xs text-slate-400 font-mono">Hover the chart to see values by year</span>}
          </div>
        </div>
      </div>

      {/* GDP bar chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Comparative</p>
        <p className="text-sm font-bold text-slate-800 mb-3">% of GDP Saved on Oil Imports by Country</p>
        <svg ref={gdpSvg} className="w-full" role="img" aria-label="Bar chart of GDP savings from oil displacement by country" />
        <div className="border border-slate-100 rounded-lg bg-slate-50 px-4 py-3 mt-3 relative">
          {!gdpPinnedData && (
            <div className="absolute inset-0 flex items-center px-4">
              <span className="text-xs text-slate-400 font-mono">Click a country bar to see its oil savings breakdown</span>
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

      {/* Historical oil price chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Price Context</p>
            <p className="text-sm font-bold text-slate-800">
              Historical Crude Oil Prices (2017–{oilPrices.at(-1)?.year ?? "present"})
            </p>
          </div>
          {/* HTML legend — no overlap */}
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#d97706" strokeWidth={benchmark === "brent" ? 2.5 : 1.5} opacity={benchmark === "brent" ? 1 : 0.4} /></svg>
              Brent
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#0891b2" strokeWidth={benchmark === "wti" ? 2.5 : 1.5} opacity={benchmark === "wti" ? 1 : 0.4} /></svg>
              WTI
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
              Real (2024 USD)
            </span>
          </div>
        </div>
        <svg ref={priceSvg} className="w-full" role="img" aria-label="Historical WTI and Brent crude oil prices" />
        <div className="border border-slate-100 rounded-lg bg-slate-50 px-3 py-2 min-h-10 flex items-center mt-2">
          {(() => {
            const row = pricePinnedYear !== null ? oilPrices.find((r) => r.year === pricePinnedYear) : null;
            if (!row) return <span className="text-xs text-slate-400 font-mono">Hover the chart to see prices by year</span>;
            return (
              <span className="text-xs text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-mono font-bold">{row.year}</span>
                <span><span className="text-amber-600 font-semibold">Brent</span> {row.brent_nominal != null ? `$${row.brent_nominal.toFixed(2)}` : "—"} nominal · {row.brent_real != null ? `$${row.brent_real.toFixed(2)}` : "—"} real</span>
                <span><span className="text-cyan-600 font-semibold">WTI</span> {row.wti_nominal != null ? `$${row.wti_nominal.toFixed(2)}` : "—"} nominal · {row.wti_real != null ? `$${row.wti_real.toFixed(2)}` : "—"} real</span>
              </span>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
