"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow, GdpMeta, OilPriceRow } from "@/lib/data";
import { fmtEvSales } from "@/lib/data";
import { useContainerSize, useThemeRef, useChartTheme, drawCrosshair, drawHorizontalGridLines, drawTickDot, useEvForecastBoundary } from "@/lib/ui-utils";
import StatCard from "@/components/ui/StatCard";
import Select from "@/components/ui/Select";
import BehindTheNumbers from "@/components/ui/BehindTheNumbers";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

interface Props {
  evData: EvRow[];
  gdpMeta: GdpMeta[];
  oilPrices: OilPriceRow[];
  oilPricesError?: string | null;
  isDark?: boolean;
}

const GALLONS_PER_EV = 1300;
const GALLONS_PER_BARREL = 42;
const FALLBACK_PRICE = 75;

function compute(evRegion: string, year: number, adoption: number, meta: GdpMeta, evData: EvRow[], oilPrice: number, forecastBoundary: number) {
  const candidates = evData.filter((d) => d.region_country === evRegion && d.year === year);
  const preferredType = year >= forecastBoundary ? "Forecast" : "Actual";
  const row = candidates.find((d) => d.type === preferredType) ?? candidates[0];
  const sales = (row?.ev_sales ?? 0) * adoption;
  const oilDisplaced = (sales * GALLONS_PER_EV) / (GALLONS_PER_BARREL * 1_000_000);
  const costSavings = (oilDisplaced * oilPrice) / 1_000;
  const gdpPercent = meta.gdp > 0 ? (costSavings / meta.gdp) * 100 : 0;
  return { sales, oilDisplaced, costSavings, gdpPercent };
}

type Benchmark = "brent" | "wti";

export default function EvGdpImpactCharts({ evData, gdpMeta, oilPrices, oilPricesError, isDark = false }: Props) {
  const priceSvg = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useContainerSize(containerRef);
  const priceInitialisedRef = useRef(false);
  const isDarkRef = useThemeRef(isDark);

  const countries = useMemo(() => gdpMeta.map((m) => m.country), [gdpMeta]);
  const forecastBoundary = useEvForecastBoundary(evData);
  const years = useMemo(() => {
    return Array.from(new Set(evData.map((d) => d.year))).sort((a, b) => a - b);
  }, [evData]);

  // Default to the last historical year so the slider opens on real data, not 2010.
  const defaultYear = useMemo(() => {
    if (!years.length) return 0;
    const lastHist = isFinite(forecastBoundary) ? forecastBoundary - 1 : null;
    return lastHist !== null && years.includes(lastHist) ? lastHist : years[years.length - 1];
  }, [years, forecastBoundary]);

  const [country, setCountry] = useState(() => countries[0] ?? "");
  const [year,    setYear]    = useState(() => defaultYear);
  const [adoption,         setAdoption]         = useState(1.0);
  const [benchmark,        setBenchmark]        = useState<Benchmark>("brent");
  const benchmarkRef = useRef<Benchmark>(benchmark);
  useEffect(() => { benchmarkRef.current = benchmark; }, [benchmark]);
  const [customBrentPrice, setCustomBrentPrice] = useState<number>(FALLBACK_PRICE);
  const [customWtiPrice,   setCustomWtiPrice]   = useState<number>(FALLBACK_PRICE);

  useEffect(() => { if (countries.length) setCountry(countries[0]); }, [countries]);
  useEffect(() => { if (years.length)     setYear(defaultYear);      }, [defaultYear]);

  const [pricePinnedYear, setPricePinnedYear] = useState<number | null>(null);

  // 5-year intervals; oil price chart spans ~1986–2026 (40 years)
  const tickYears = useMemo(
    () => oilPrices.map((d) => d.year).filter((yr) => yr % 5 === 0),
    [oilPrices]
  );

  const meta = useMemo(() => gdpMeta.find((m) => m.country === country), [gdpMeta, country]);

  useEffect(() => { setPricePinnedYear(null); }, [meta, adoption, year, benchmark, containerWidth, oilPrices]);

  const isProjected = year >= forecastBoundary;

  // Infinity means beyondData stays false until real data loads (avoids premature custom-price unlock)
  const latestDataYear = useMemo(() => oilPrices.length ? oilPrices[oilPrices.length - 1].year : Infinity, [oilPrices]);
  const beyondData = year > latestDataYear;

  // Initialise each benchmark's custom price once when oil price data loads
  useEffect(() => {
    if (priceInitialisedRef.current || !oilPrices.length) return;
    priceInitialisedRef.current = true;
    const lastRow = oilPrices[oilPrices.length - 1];
    setCustomBrentPrice(Math.max(40, Math.min(150, lastRow.brent_nominal ?? FALLBACK_PRICE)));
    setCustomWtiPrice(Math.max(40, Math.min(150, lastRow.wti_nominal ?? FALLBACK_PRICE)));
  }, [oilPrices]);

  const customPrice    = benchmark === "brent" ? customBrentPrice : customWtiPrice;
  const setCustomPrice = benchmark === "brent" ? setCustomBrentPrice : setCustomWtiPrice;

  const currentOilPrice = useMemo(() => {
    if (beyondData) return customPrice;
    if (!oilPrices.length) return FALLBACK_PRICE;
    const priceRow = oilPrices.find((r) => r.year === year) ?? oilPrices[oilPrices.length - 1];
    return (benchmark === "brent" ? priceRow.brent_nominal : priceRow.wti_nominal) ?? FALLBACK_PRICE;
  }, [oilPrices, year, benchmark, beyondData, customPrice]);

  const priceDisplayYear = useMemo(() => {
    if (!oilPrices.length) return year;
    return (oilPrices.find((r) => r.year === year) ?? oilPrices[oilPrices.length - 1]).year;
  }, [oilPrices, year]);

  const { sales, oilDisplaced, costSavings, gdpPercent } = useMemo(
    () => meta
      ? compute(meta.region, year, adoption, meta, evData, currentOilPrice, forecastBoundary)
      : { sales: 0, oilDisplaced: 0, costSavings: 0, gdpPercent: 0 },
    [meta, year, adoption, evData, currentOilPrice, forecastBoundary]
  );

  const priceSvgLabel = useMemo(() => {
    const lastRow = oilPrices.length ? oilPrices[oilPrices.length - 1] : null;
    const lastBrent = lastRow?.brent_nominal;
    const lastWti = lastRow?.wti_nominal;
    const priceStr = lastBrent != null && lastWti != null
      ? ` (Brent $${lastBrent.toFixed(0)}/bbl, WTI $${lastWti.toFixed(0)}/bbl in ${latestDataYear})`
      : "";
    return `Historical Brent and WTI crude oil prices: nominal and inflation-adjusted${priceStr}.`;
  }, [latestDataYear, oilPrices]);

  const pinnedPriceRow = useMemo(
    () => pricePinnedYear !== null ? oilPrices.find((r) => r.year === pricePinnedYear) ?? null : null,
    [oilPrices, pricePinnedYear]
  );

  // Historical oil price chart
  useEffect(() => {
    if (!priceSvg.current || containerWidth === 0 || !oilPrices.length) return;

    const svg = d3.select(priceSvg.current);
    svg.selectAll("*").remove();

    const chartData = oilPrices;

    const totalW = containerWidth - 32; // containerRef is on the outer card (p-4 = 16px each side)
    const margin = { top: 16, right: 40, bottom: 28, left: containerWidth < 380 ? 38 : 52 };
    const totalH = containerWidth < 480 ? 170 : 220;
    const width  = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [minYear = 1986, maxYear = 2026] = d3.extent(chartData, (d) => d.year);
    const x = d3.scaleLinear()
      .domain([minYear, maxYear + 0.5])
      .range([0, width]);

    const allVals = chartData.flatMap((d) => [d.brent_nominal, d.wti_nominal, d.brent_real, d.wti_real]).filter((v): v is number => v !== null);
    const y = d3.scaleLinear().domain([0, d3.max(allVals) ?? 100]).nice().range([height, 0]);

    drawHorizontalGridLines(g, y, width, 4, isDarkRef.current);

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
      const active = label === benchmarkRef.current;

      g.append("path")
        .datum(chartData)
        .attr("class", `oil-area-${label}`)
        .attr("fill", color)
        .attr("opacity", active ? 0.12 : 0.05)
        .attr("d", makeArea(nomKey, realKey));

      g.append("path")
        .datum(chartData)
        .attr("class", `oil-real-${label}`)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", active ? 1.5 : 1)
        .attr("stroke-dasharray", "6 3")
        .attr("opacity", active ? 0.7 : 0.2)
        .attr("d", makeLine(realKey));

      g.append("path")
        .datum(chartData)
        .attr("class", `oil-nom-${label}`)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", active ? 2 : 1.5)
        .attr("opacity", active ? 1 : 0.3)
        .attr("d", makeLine(nomKey));
    }

    const tickByYear = new Map(chartData.map((d) => [d.year, d]));
    for (const { nomKey, label, color } of series) {
      const active = label === benchmarkRef.current;
      tickYears.forEach((yr) => {
        const row = tickByYear.get(yr);
        if (!row || row[nomKey] === null) return;
        drawTickDot(g, x(yr), y(row[nomKey] as number), color, isDarkRef, `oil-tick-${label}`, active ? 1 : 0.3);
      });
    }

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(containerWidth < 420 ? 4 : 6));
    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => `$${+d}`));

    const crosshair = drawCrosshair(g, height, isDarkRef);

    g.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", "transparent").style("pointer-events", "all")
      .on("pointermove", function (event) {
        const [mx] = d3.pointer(event);
        const [xMin, xMax] = x.domain();
        const yr = Math.min(maxYear, Math.round(Math.max(xMin, Math.min(xMax, x.invert(mx)))));
        crosshair.style("visibility", "visible").attr("x1", x(yr)).attr("x2", x(yr));
        setPricePinnedYear(yr);
      })
      .on("pointerleave", function () {
        crosshair.style("visibility", "hidden");
      });
  }, [oilPrices, containerWidth]);

  // Benchmark toggle: only opacity/stroke-weight change — no redraw needed
  useEffect(() => {
    if (!priceSvg.current) return;
    const svg = d3.select(priceSvg.current);
    for (const label of ["brent", "wti"] as const) {
      const active = label === benchmark;
      svg.selectAll(`.oil-nom-${label}`).attr("opacity", active ? 1 : 0.3).attr("stroke-width", active ? 2 : 1.5);
      svg.selectAll(`.oil-real-${label}`).attr("opacity", active ? 0.7 : 0.2).attr("stroke-width", active ? 1.5 : 1);
      svg.selectAll(`.oil-area-${label}`).attr("opacity", active ? 0.12 : 0.05);
      svg.selectAll(`.oil-tick-${label}`).attr("opacity", active ? 1 : 0.3);
    }
  }, [benchmark]);

  useChartTheme(priceSvg, isDark);


  return (
    <div ref={containerRef} className={`border rounded-2xl p-4 sm:p-6 flex flex-col gap-6 transition-colors ${isDark ? "bg-black border-white/10" : "bg-white border-slate-200"}`}>

      {/* Title */}
      <div>
        <h2 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>GDP Impact</h2>
        <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>How EV adoption displaces oil spending as a share of each country&apos;s economy.</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <div className="flex justify-between mb-1">
            <label htmlFor="ev-adoption-rate" className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>EV Adoption Rate</label>
            <span className={`text-sm font-mono font-bold ${isDark ? "text-teal-400" : "text-teal-600"}`}>{adoption.toFixed(1)}x</span>
          </div>
          <input id="ev-adoption-rate" type="range" min="0.5" max="3" step="0.1" value={adoption}
            aria-label="EV Adoption Rate multiplier"
            onChange={(e) => setAdoption(parseFloat(e.target.value))}
            className="w-full focus:outline-none focus:ring-2 focus:ring-slate-500" />
          <p className={`text-xs mt-1 ${isDark ? "text-white/50" : "text-slate-400"}`}>0.5x = slower growth · 2x = double the projected rate</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="gdp-country-select" className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Country</label>
          <Select id="gdp-country-select" value={country} onChange={setCountry} options={countries} fullWidth isDark={isDark} />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label htmlFor="analysis-year" className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Analysis Year</label>
            <span className={`text-sm font-mono font-bold ${isDark ? "text-teal-400" : "text-teal-600"}`}>{year}</span>
          </div>
          <input id="analysis-year" type="range"
            min={years[0] ?? year} max={years[years.length - 1] ?? year}
            step="1" value={year} aria-label="Analysis Year"
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full focus:outline-none focus:ring-2 focus:ring-slate-500" />
          {years.length > 0 && <p className={`text-xs mt-1 ${isDark ? "text-white/50" : "text-slate-400"}`}>Select {years[0]} – {years[years.length - 1]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <span id="price-benchmark-label" className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-white/40" : "text-slate-400"}`}>Price Benchmark</span>
          <div role="group" aria-labelledby="price-benchmark-label" className="flex gap-2">
            {(["brent", "wti"] as Benchmark[]).map((b) => (
              <button key={b} type="button" onClick={() => setBenchmark(b)}
                aria-pressed={benchmark === b}
                className={`flex-1 text-xs font-mono py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                  benchmark === b
                    ? "bg-teal-600 text-white border-teal-600"
                    : isDark
                    ? "bg-white/10 text-white/50 border-white/10 hover:border-teal-400/50"
                    : "bg-white text-slate-500 border-slate-200 hover:border-teal-300"
                }`}>
                {b === "brent" ? "Brent" : "WTI"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard size="xl" isDark={isDark} nested={false} label={`${isProjected ? "Projected " : ""}EV Sales`}    value={fmtEvSales(sales)}                                                          sub={`${country} ${year}`} accent="teal" />
        <StatCard size="xl" isDark={isDark} nested={false} label={`${isProjected ? "Projected " : ""}Oil Saved`}   value={oilDisplaced === 0 ? "0" : oilDisplaced >= 1 ? `${oilDisplaced.toFixed(0)}M` : oilDisplaced >= 0.1 ? `${oilDisplaced.toFixed(1)}M` : `${(oilDisplaced * 1000).toFixed(0)}k`} sub="barrels per year"    accent="amber" />
        <StatCard size="xl" isDark={isDark} nested={false} label={`${isProjected ? "Projected " : ""}Cost Saved`}  value={!oilPrices.length && !beyondData ? "—" : `$${costSavings.toFixed(1)}B`}  sub="annually"             accent="blue" />
        <StatCard size="xl" isDark={isDark} nested={false} label={`${isProjected ? "Projected " : ""}GDP Savings`} value={!oilPrices.length && !beyondData ? "—" : `${gdpPercent.toFixed(3)}%`}   sub="of GDP"               accent="teal" />
      </div>

      {/* Oil price stat + scenario slider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard size="xl" isDark={isDark} nested={false}
          label={`${benchmark === "brent" ? "Brent" : "WTI"} Crude${beyondData || !oilPrices.length ? "" : ` (${priceDisplayYear} avg)`}`}
          value={`$${currentOilPrice.toFixed(2)}/bbl`}
          sub={beyondData ? "custom scenario assumption" : !oilPrices.length ? "estimate — data unavailable" : "nominal USD · EIA"}
          accent="amber" />

        <div className={`border rounded-xl p-4 flex flex-col justify-between transition-opacity ${
          beyondData
            ? isDark ? "bg-white/5 border-amber-400/30" : "bg-white border-amber-200"
            : isDark ? "bg-white/5 border-white/10 opacity-40 pointer-events-none select-none" : "bg-white border-slate-200 opacity-40 pointer-events-none select-none"
        }`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <label htmlFor="custom-oil-price" className={`text-xs font-mono uppercase tracking-widest mb-0.5 block ${beyondData ? isDark ? "text-amber-400" : "text-amber-700" : isDark ? "text-white/50" : "text-slate-400"}`}>{benchmark === "brent" ? "Brent" : "WTI"} Price Assumption</label>
              <p className={`text-xs ${isDark ? "text-white/50" : "text-slate-400"}`}>
                {beyondData ? `No oil price data beyond ${latestDataYear} — set your own` : `Unlocks for years after ${latestDataYear}`}
              </p>
              {beyondData && (
                <p className={`text-xs mt-0.5 ${isDark ? "text-white/50" : "text-slate-400"}`}>Due to political factors, oil prices are hard to predict.</p>
              )}
            </div>
            <span className={`text-xl font-bold tabular-nums ${beyondData ? isDark ? "text-amber-400" : "text-amber-600" : isDark ? "text-white/20" : "text-slate-400"}`}>
              ${beyondData ? customPrice.toFixed(0) : "—"}/bbl
            </span>
          </div>
          <input id="custom-oil-price" type="range" min={40} max={150} step={1}
            value={customPrice}
            disabled={!beyondData}
            aria-label={`Custom ${benchmark === "brent" ? "Brent" : "WTI"} oil price assumption`}
            onChange={(e) => setCustomPrice(Math.max(40, Math.min(150, parseFloat(e.target.value))))}
            className="w-full range-amber focus:outline-none focus:ring-2 focus:ring-slate-500" />
          <div className="flex justify-between mt-1">
            <span className={`text-xs font-mono ${isDark ? "text-white/50" : "text-slate-400"}`}>$40</span>
            <span className={`text-xs font-mono ${isDark ? "text-white/50" : "text-slate-400"}`}>$150</span>
          </div>
        </div>
      </div>

      {/* Historical oil price chart */}
      <div className={`border rounded-xl p-4 transition-colors ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
              Historical Crude Oil Prices ({oilPrices[0]?.year ?? 1986}–{oilPrices.at(-1)?.year ?? "present"})
            </p>
          </div>
          <div className={`flex items-center gap-4 text-xs font-mono pt-1 ${isDark ? "text-white/40" : "text-slate-500"}`}>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8" aria-hidden="true"><line x1="0" y1="4" x2="20" y2="4" stroke="#d97706" strokeWidth={benchmark === "brent" ? 2.5 : 1.5} opacity={benchmark === "brent" ? 1 : 0.4} /></svg>
              Brent
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8" aria-hidden="true"><line x1="0" y1="4" x2="20" y2="4" stroke="#0891b2" strokeWidth={benchmark === "wti" ? 2.5 : 1.5} opacity={benchmark === "wti" ? 1 : 0.4} /></svg>
              WTI
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8" aria-hidden="true"><line x1="0" y1="4" x2="20" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
              Real
            </span>
          </div>
        </div>
        {!oilPrices.length
          ? oilPricesError
            ? <ErrorMessage message={oilPricesError} isDark={isDark} />
            : <LoadingPlaceholder text="Loading oil prices…" isDark={isDark} />
          : <div style={{ touchAction: "pan-y" }}><svg ref={priceSvg} className="w-full" role="img" aria-label={priceSvgLabel} /></div>
        }
        <div className={`border rounded-lg px-3 py-2 min-h-10 flex items-center mt-2 ${isDark ? "border-white/10 bg-white/10" : "border-slate-100 bg-slate-50"}`}>
          {pinnedPriceRow ? (
            <span className={`text-xs flex flex-wrap gap-x-6 gap-y-1 ${isDark ? "text-white/70" : "text-slate-700"}`}>
              <span className={`font-mono font-bold ${isDark ? "text-white" : ""}`}>{pinnedPriceRow.year}</span>
              <span><span className={`font-semibold ${isDark ? "text-amber-400" : "text-amber-700"}`}>Brent</span> {pinnedPriceRow.brent_nominal != null ? `$${pinnedPriceRow.brent_nominal.toFixed(2)}` : "—"} nominal · {pinnedPriceRow.brent_real != null ? `$${pinnedPriceRow.brent_real.toFixed(2)}` : "—"} real</span>
              <span><span className={`font-semibold ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>WTI</span> {pinnedPriceRow.wti_nominal != null ? `$${pinnedPriceRow.wti_nominal.toFixed(2)}` : "—"} nominal · {pinnedPriceRow.wti_real != null ? `$${pinnedPriceRow.wti_real.toFixed(2)}` : "—"} real</span>
            </span>
          ) : (
            <span className={`text-xs ${isDark ? "text-white/50" : "text-slate-400"}`}>Tap or hover the chart to see prices by year</span>
          )}
        </div>
      </div>

      {/* Behind the Numbers */}
      <BehindTheNumbers isDark={isDark}>
        <div className="space-y-4">
          {[
            {
              title: "Oil displacement",
              body: (<>Each EV is assumed to displace approximately 1,300 gallons of fuel per year — a mid-range estimate for a typical internal combustion vehicle. At 42 gallons per barrel, the total oil displaced is{" "}<span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isDark ? "bg-white/10" : "bg-black/5"}`}>(EVs × 1,300) ÷ 42 ÷ 1,000,000</span>{" "}million barrels per year. This is an indicative estimate, not a measured figure.</>),
            },
            {
              title: "Cost savings & GDP %",
              body: `Displaced barrels are multiplied by the selected Brent or WTI crude oil price (sourced from EIA for historical years through ${latestDataYear}, or the custom slider for later years) to get the savings in billion USD. That figure is then divided by the country's 2023 nominal GDP (World Bank) to produce the percentage shown.`,
            },
            {
              title: "Adoption rate slider",
              body: "EV sales figures come from DS3's logistic S-curve model, fitted per country to IEA historical BEV sales data and projected through 2035. The slider scales those figures by the selected multiplier — at 1× it uses the model projection directly, at 0.5× it assumes half of projected EVs are actually adopted.",
            },
            {
              title: "Caveats",
              body: "This model isolates the light-vehicle transport sector only. Oil demand is also driven by industry, heating, aviation, and shipping — sectors where electrification is slower. The savings figures are therefore an upper bound for the transport contribution.",
            },
            {
              title: "Historical oil prices & inflation adjustment",
              body: (<>Brent and WTI spot prices come from EIA, averaged to annual figures. The dashed line and shaded area show inflation-adjusted prices in real 2024 USD, using the US Consumer Price Index (BLS CPI-U) from 1986 to 2026. The deflation formula is{" "}<span className={`font-mono text-xs px-1.5 py-0.5 rounded ${isDark ? "bg-white/10" : "bg-black/5"}`}>real = nominal × (CPI₂₀₂₄ ÷ CPI_year)</span>{" "}— so a $97 barrel in 2008 becomes ~$141 in today&apos;s dollars. The shaded gap between the lines represents purchasing power lost to inflation.</>),
            },
          ].map(({ title, body }) => (
            <div key={title}>
              <h4 className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-black"}`}>{title}</h4>
              <p className={`text-sm ${isDark ? "text-white/60" : "text-black/70"}`}>{body}</p>
            </div>
          ))}
        </div>
      </BehindTheNumbers>

    </div>
  );
}
