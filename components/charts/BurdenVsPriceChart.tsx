"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { EnergyAccessRow } from "@/lib/data";

interface Props {
  data: EnergyAccessRow[];
}

export default function BurdenVsPriceChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 20, right: 30, bottom: 48, left: 56 };
    const totalH = 380;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.avg_price_cents_kwh) ?? 0, d3.max(data, (d) => d.avg_price_cents_kwh) ?? 1])
      .nice().range([0, width]);

    const y = d3.scaleLinear()
      .domain([d3.min(data, (d) => d.energy_burden_pct) ?? 0, d3.max(data, (d) => d.energy_burden_pct) ?? 1])
      .nice().range([height, 0]);

    const incomes = data.map((d) => d.median_income_2024).filter((v): v is number => v !== null);
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([d3.min(incomes) ?? 0, d3.max(incomes) ?? 1]);

    const rScale = d3.scaleSqrt()
      .domain([0, d3.max(data, (d) => d.avg_customers ?? 0) ?? 1])
      .range([5, 22]);

    // Grid
    g.selectAll(".grid-h").data(y.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    g.selectAll(".grid-v").data(x.ticks(5)).enter()
      .append("line").attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    // Dots
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.avg_price_cents_kwh))
      .attr("cy", (d) => y(d.energy_burden_pct))
      .attr("r", (d) => rScale(d.avg_customers ?? 0))
      .attr("fill", (d) => d.median_income_2024 != null ? colorScale(d.median_income_2024) : "#94a3b8")
      .attr("opacity", 0.8)
      .attr("stroke", "white").attr("stroke-width", 1);

    // State labels for outliers
    g.selectAll(".state-label")
      .data(data.filter((d) => d.energy_burden_pct > 2.8 || d.avg_price_cents_kwh > 35 || d.energy_burden_pct < 1.3))
      .enter()
      .append("text")
      .attr("x", (d) => x(d.avg_price_cents_kwh) + 6)
      .attr("y", (d) => y(d.energy_burden_pct) + 4)
      .attr("font-size", "10px").attr("fill", "#475569")
      .text((d) => d.state);

    // Axes
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat((d) => `${d}¢`).ticks(6));

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((d) => `${d}%`).ticks(5));

    // Axis labels
    svg.append("text")
      .attr("x", margin.left + width / 2).attr("y", totalH - 6)
      .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#64748b")
      .text("Average Electricity Price (¢/kWh)");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + height / 2)).attr("y", 14)
      .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#64748b")
      .text("Energy Burden (%)");
  }, [data, containerWidth]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
        <span>Color: income (green = high, red = low)</span>
        <span>·</span>
        <span>Size: customer count</span>
      </div>
      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Scatter plot of energy burden vs electricity price by US state" />
      </div>
    </div>
  );
}
