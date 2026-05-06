"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export interface ReliabilityRow {
  state: string;
  saidi: number;
  saifi: number;
  energy_burden_pct?: number;
}

interface Props {
  data: ReliabilityRow[];
}

function rating(saidi: number) {
  if (saidi < 100) return { label: "Good", color: "#16a34a" };
  if (saidi < 200) return { label: "Fair", color: "#d97706" };
  return { label: "Poor", color: "#dc2626" };
}

export default function ReliabilityChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = [...data].sort((a, b) => b.saidi - a.saidi).slice(0, 40);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !sorted.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerRef.current.offsetWidth;
    const margin = { top: 8, right: 80, bottom: 8, left: 40 };
    const barH = 22;
    const gap = 4;
    const height = sorted.length * (barH + gap);
    const width = totalW - margin.left - margin.right;

    svg.attr("width", totalW).attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(sorted, (d) => d.saidi) ?? 1]).range([0, width]);
    const y = d3.scaleBand().domain(sorted.map((d) => d.state)).range([0, height]).padding(0.15);

    // Reference lines at 100 and 200
    [100, 200].forEach((v) => {
      if (x(v) <= width) {
        g.append("line")
          .attr("x1", x(v)).attr("x2", x(v))
          .attr("y1", 0).attr("y2", height)
          .attr("stroke", "#94a3b8").attr("stroke-dasharray", "3").attr("opacity", 0.6);
      }
    });

    // Bars
    g.selectAll(".bar")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.state) ?? 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => rating(d.saidi).color)
      .attr("opacity", 0.8)
      .attr("width", 0)
      .transition().duration(700).delay((_, i) => i * 12)
      .attr("width", (d) => x(d.saidi));

    // Labels
    g.selectAll(".val-label")
      .data(sorted)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.saidi) + 5)
      .attr("y", (d) => (y(d.state) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#64748b")
      .text((d) => `${d.saidi.toFixed(0)} min`);

    // Y axis
    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .selectAll("text").attr("dx", -4).attr("font-size", "11px").attr("fill", "#475569");
  }, [sorted]);

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex gap-4 text-xs font-mono">
        {[
          { label: "< 100 min — Good", color: "#16a34a" },
          { label: "100–200 min — Fair", color: "#d97706" },
          { label: "> 200 min — Poor", color: "#dc2626" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-600">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      <p className="text-xs text-slate-400 font-mono">SAIDI = System Average Interruption Duration Index (minutes/year)</p>
    </div>
  );
}
