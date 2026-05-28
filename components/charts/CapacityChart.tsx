"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import type { TargetRow } from "@/lib/data";
import { tooltipStyle, useContainerSize, drawHorizontalGridLines } from "@/lib/ui-utils";

interface Props {
  data: TargetRow[];
}

interface Pinned {
  countryName: string;
  countryCode: string;
  gw: number;
  sharePct: number | null;
  rank: number;
}

export default function CapacityChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [pinnedPos, setPinnedPos] = useState<{ x: number; y: number } | null>(null);

  const ariaLabel = useMemo(() => {
    if (!data.length) return "Renewable capacity targets: no data available.";
    const top = data[0];
    return `2030 renewable capacity targets: ${top.country_name} leads with ${top.capacity_target_gw} GW. Showing top ${data.length} countries.`;
  }, [data]);

  useEffect(() => {
    setPinned(null);
    setPinnedPos(null);
  }, [data, containerWidth]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const totalW = containerWidth;
    const margin = { top: 16, right: 16, bottom: 64, left: 56 };
    const totalH = 300;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    svg.attr("width", totalW).attr("height", totalH);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const sorted = [...data].sort((a, b) => b.capacity_target_gw - a.capacity_target_gw);

    const x = d3.scaleBand()
      .domain(sorted.map((d) => d.country_code))
      .range([0, width])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(sorted, (d) => d.capacity_target_gw) ?? 1])
      .nice().range([height, 0]);

    drawHorizontalGridLines(g, y, width);

    const barsSel = g.selectAll<SVGRectElement, TargetRow>(".bar")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.country_code) ?? 0)
      .attr("width", x.bandwidth())
      .attr("rx", 3)
      .attr("fill", "#16a34a")
      .attr("opacity", 0.8)
      .attr("y", height)
      .attr("height", 0);

    barsSel
      .on("mouseover", function (event, d) {
        barsSel.attr("opacity", 0.3).attr("stroke", "none");
        d3.select(this).attr("opacity", 1.0).attr("stroke", "#14532d").attr("stroke-width", 1.5);
        const rank = sorted.findIndex((r) => r.country_code === d.country_code) + 1;
        setPinned({ countryName: d.country_name, countryCode: d.country_code, gw: d.capacity_target_gw, sharePct: d.share_target_pct, rank });
        const [cx, cy] = d3.pointer(event, containerRef.current);
        setPinnedPos({ x: cx, y: cy });
      })
      .on("mousemove", function (event) {
        const [cx, cy] = d3.pointer(event, containerRef.current);
        setPinnedPos({ x: cx, y: cy });
      })
      .on("mouseleave", function () {
        barsSel.attr("opacity", 0.8).attr("stroke", "none");
        setPinned(null);
        setPinnedPos(null);
      });

    barsSel
      .transition().duration(700).delay((_, i) => i * 45)
      .attr("y", (d) => y(d.capacity_target_gw))
      .attr("height", (d) => height - y(d.capacity_target_gw));

    g.selectAll(".val-label")
      .data(sorted)
      .enter()
      .append("text")
      .attr("class", "val-label")
      .attr("x", (d) => (x(d.country_code) ?? 0) + x.bandwidth() / 2)
      .attr("y", height)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-family", "ui-monospace, monospace")
      .attr("fill", "#475569")
      .attr("opacity", 0)
      .attr("pointer-events", "none")
      .text((d) => `${d.capacity_target_gw} GW`)
      .transition().duration(700).delay((_, i) => i * 45)
      .attr("y", (d) => y(d.capacity_target_gw) - 5)
      .attr("opacity", 1);

    g.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end")
      .attr("font-size", containerWidth < 400 ? "9px" : "11px");

    g.append("g").attr("class", "chart-axis")
      .call(d3.axisLeft(y).tickFormat((d) => `${d} GW`).ticks(5));
  }, [data, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full" role="img" aria-label={ariaLabel} />
        {pinned && pinnedPos && (
          <div
            className="absolute bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 pointer-events-none shadow-sm z-10"
            style={tooltipStyle(pinnedPos.x, pinnedPos.y, containerWidth, containerHeight, 120)}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 mb-0.5">
              <span className="text-sm font-bold text-slate-800">{pinned.countryName}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">#{pinned.rank}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Renewable capacity target by 2030</p>
              <p className="text-sm font-semibold text-green-700">{pinned.gw} GW</p>
            </div>
            {pinned.sharePct !== null && (
              <div>
                <p className="text-xs text-slate-400">Share of electricity from renewables (target)</p>
                <p className="text-sm font-semibold text-slate-800">{pinned.sharePct.toFixed(0)}%</p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        GW = gigawatts &nbsp;·&nbsp; 1 GW powers roughly 750,000 homes
      </p>
    </div>
  );
}
