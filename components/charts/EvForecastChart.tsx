"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EvRow } from "@/lib/data";

interface Props {
  data: EvRow[];
  preview?: boolean;
}

const REGION_COLORS = [
  "#2563eb", "#0891b2", "#7c3aed", "#e85d04",
  "#059669", "#db2777", "#ca8a04", "#dc2626",
];

const FORECAST_BOUNDARY = 2024;

const PREVIEW_REGIONS = ["China", "USA", "Europe", "India", "World"];

export default function EvForecastChart({ data, preview = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const allRegions = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_country))).sort(),
    [data]
  );

  const colorScale = useMemo(
    () => d3.scaleOrdinal<string>().domain(allRegions).range(REGION_COLORS),
    [allRegions]
  );

  const defaultRegions = useMemo(
    () => preview
      ? allRegions.filter((r) => PREVIEW_REGIONS.includes(r)).slice(0, 5)
      : allRegions.slice(0, 6),
    [allRegions, preview]
  );

  const [selected, setSelected] = useState<string[]>(() => defaultRegions);

  useEffect(() => {
    setSelected(defaultRegions);
  }, [defaultRegions]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || containerWidth === 0 || !selected.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 12, right: 24, bottom: 32, left: 56 };
    const totalH = preview ? 220 : 340;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const regionData = selected.map((r) => ({
      region: r,
      values: data.filter((d) => d.region_country === r).sort((a, b) => a.year - b.year),
    }));

    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(regionData.flatMap((r) => r.values), (d) => d.ev_sales) ?? 1])
      .nice()
      .range([height, 0]);

    g.selectAll(".grid-h")
      .data(y.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    g.append("line")
      .attr("x1", x(FORECAST_BOUNDARY)).attr("x2", x(FORECAST_BOUNDARY))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#94a3b8").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);

    g.append("text")
      .attr("x", x(FORECAST_BOUNDARY) + 4).attr("y", 12)
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#94a3b8")
      .text("Forecast →");

    const line = d3.line<EvRow>()
      .x((d) => x(d.year))
      .y((d) => y(d.ev_sales))
      .curve(d3.curveMonotoneX);

    regionData.forEach(({ region, values }) => {
      const color = colorScale(region);
      const actual = values.filter((d) => d.year <= FORECAST_BOUNDARY);
      const forecast = values.filter((d) => d.year >= FORECAST_BOUNDARY);

      if (actual.length > 1) {
        g.append("path").datum(actual)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line);
      }
      if (forecast.length > 1) {
        g.append("path").datum(forecast)
          .attr("fill", "none").attr("stroke", color)
          .attr("stroke-width", 2).attr("stroke-dasharray", "6 3").attr("d", line);
      }
    });

    g.append("g")
      .attr("class", "chart-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));

    g.append("g")
      .attr("class", "chart-axis")
      .call(
        d3.axisLeft(y).tickFormat((v) => {
          const n = +v;
          return n >= 1_000_000 ? (n / 1_000_000).toFixed(0) + "M"
            : n >= 1_000 ? (n / 1_000).toFixed(0) + "k"
            : n.toFixed(0);
        }).ticks(5)
      );

    if (!preview) {
      const legend = g.append("g").attr("transform", `translate(${width - 140}, 4)`);
      selected.slice(0, 8).forEach((r, i) => {
        legend.append("line")
          .attr("x1", 0).attr("x2", 16).attr("y1", i * 18 + 6).attr("y2", i * 18 + 6)
          .attr("stroke", colorScale(r)).attr("stroke-width", 2);
        legend.append("text")
          .attr("x", 20).attr("y", i * 18 + 10)
          .attr("font-size", "11px").attr("fill", "#475569")
          .text(r);
      });
    }
  }, [data, selected, preview, colorScale, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      {!preview && (
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="region-select" className="text-xs font-mono uppercase tracking-widest text-slate-400">Regions</label>
          <select
            id="region-select"
            multiple
            value={selected}
            onChange={(e) =>
              setSelected(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            size={5}
          >
            {allRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {preview && (
        <div className="flex flex-wrap gap-3">
          {selected.map((r) => (
            <span key={r} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-block w-6 h-0.5" style={{ backgroundColor: colorScale(r) }} />
              {r}
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Multi-line S-curve chart of EV sales by region" />
      </div>

      <p className="text-xs text-slate-400 font-mono">
        Solid = Actual &nbsp;·&nbsp; Dashed = Forecast (2024–2035)
      </p>
    </div>
  );
}
