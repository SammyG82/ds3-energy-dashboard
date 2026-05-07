"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { EnergyAccessRow } from "@/lib/data";

interface Props {
  data: EnergyAccessRow[];
}

function burdenColor(b: number) {
  if (b < 2.0) return "#16a34a";
  if (b < 2.5) return "#d97706";
  return "#dc2626";
}

export default function EnergyBurdenChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.energy_burden_pct - a.energy_burden_pct).slice(0, 40),
    [data]
  );

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !sorted.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 8, right: 80, bottom: 8, left: 40 };
    const barH = 22;
    const gap = 4;
    const height = sorted.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(sorted, (d) => d.energy_burden_pct) ?? 1]).range([0, width]);
    const y = d3.scaleBand().domain(sorted.map((d) => d.state)).range([0, height]).padding(0.15);

    [2.0, 2.5].forEach((v) => {
      if (x(v) <= width) {
        g.append("line")
          .attr("x1", x(v)).attr("x2", x(v))
          .attr("y1", 0).attr("y2", height)
          .attr("stroke", "#94a3b8").attr("stroke-dasharray", "3").attr("opacity", 0.6);
      }
    });

    g.selectAll(".bar")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.state) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => burdenColor(d.energy_burden_pct))
      .attr("opacity", 0.8)
      .attr("width", 0)
      .transition().duration(700).delay((_, i) => i * 12)
      .attr("width", (d) => x(d.energy_burden_pct));

    g.selectAll(".val-label")
      .data(sorted)
      .enter()
      .append("text")
      .attr("x", 0)
      .attr("y", (d) => (y(d.state) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .attr("opacity", 0)
      .text((d) => `${d.energy_burden_pct.toFixed(2)}%`)
      .transition().duration(700).delay((_, i) => i * 12)
      .attr("x", (d) => x(d.energy_burden_pct) + 5)
      .attr("opacity", 1);

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .selectAll("text").attr("dx", -4).attr("font-size", "11px").attr("fill", "#475569");
  }, [sorted, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-xs font-mono">
        {[
          { label: "< 2.0% — Low", color: "#16a34a" },
          { label: "2.0–2.5% — Medium", color: "#d97706" },
          { label: "> 2.5% — High", color: "#dc2626" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Horizontal bar chart of energy burden by US state" />
      </div>

      <p className="text-xs text-slate-400 font-mono">Energy burden = annual electricity bill as % of household income (2024){data.length > sorted.length ? ` · Showing top ${sorted.length} of ${data.length} states` : ""}</p>
    </div>
  );
}
