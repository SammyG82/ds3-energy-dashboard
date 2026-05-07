"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { TargetRow } from "@/lib/data";

interface Props {
  data: TargetRow[];
}

export default function CapacityChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const top15 = useMemo(
    () => [...data].sort((a, b) => b.capacity_target_gw - a.capacity_target_gw).slice(0, 15),
    [data]
  );

  useEffect(() => {
    const obs = new ResizeObserver((entries) => setContainerWidth(Math.floor(entries[0].contentRect.width)));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !top15.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 16, right: 16, bottom: 64, left: 56 };
    const totalH = 300;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(top15.map((d) => d.country_code))
      .range([0, width])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(top15, (d) => d.capacity_target_gw) ?? 1])
      .nice().range([height, 0]);

    // Grid
    g.selectAll(".grid-h").data(y.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);

    // Bars
    g.selectAll(".bar")
      .data(top15)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.country_code) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 3)
      .attr("fill", "#16a34a")
      .attr("y", height)
      .attr("height", 0)
      .transition().duration(700).delay((_, i) => i * 45)
      .attr("y", (d) => y(d.capacity_target_gw))
      .attr("height", (d) => height - y(d.capacity_target_gw));

    // Value labels — animate in sync with bars
    g.selectAll(".val-label")
      .data(top15)
      .enter()
      .append("text")
      .attr("x", (d) => (x(d.country_code) ?? 0) + x.bandwidth() / 2)
      .attr("y", height)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#475569")
      .attr("opacity", 0)
      .text((d) => `${d.capacity_target_gw}GW`)
      .transition().duration(700).delay((_, i) => i * 45)
      .attr("y", (d) => y(d.capacity_target_gw) - 5)
      .attr("opacity", 1);

    // Axes
    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end")
      .attr("font-size", "11px");

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((d) => `${d}GW`).ticks(5));
  }, [top15, containerWidth]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" role="img" aria-label="Bar chart of top 15 countries by 2030 renewable capacity target" />
    </div>
  );
}
