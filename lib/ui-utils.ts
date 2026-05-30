import { useState, useEffect, useRef, type RefObject, type MutableRefObject } from "react";
import type { CSSProperties } from "react";
import type { Selection } from "d3";

export function tooltipStyle(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  clampN: number
): CSSProperties {
  return {
    position: 'absolute' as const,
    left: x < containerWidth * 0.6 ? Math.min(x + 14, Math.max(0, containerWidth - 150)) : undefined,
    right: x >= containerWidth * 0.6 ? containerWidth - x + 14 : undefined,
    top: Math.max(4, Math.min(y - 10, containerHeight - clampN)),
  };
}

export function toggleSelection<T>(prev: T[], item: T, min = 1): T[] {
  return prev.includes(item)
    ? prev.length > min ? prev.filter((x) => x !== item) : prev
    : [...prev, item];
}

type HGridScale = ((v: number) => number) & { ticks: (count: number) => number[] };

// Parent element typed as `any` to accept both SVG and HTML parent contexts without invariance errors
type GSelection = Selection<SVGGElement, unknown, any, unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function drawHorizontalGridLines(
  g: GSelection,
  yScale: HGridScale,
  width: number,
  tickCount = 5,
  isDark = false
): void {
  const gridSel = g.selectAll<SVGLineElement, number>(".grid-h").data(yScale.ticks(tickCount));
  gridSel.exit().remove();
  gridSel.enter().append("line").attr("class", "grid-h").merge(gridSel)
    .attr("x1", 0).attr("x2", width)
    .attr("y1", (d) => yScale(d)).attr("y2", (d) => yScale(d))
    .attr("stroke", isDark ? "#1e293b" : "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);
}

export function drawForecastBoundary(
  g: GSelection,
  x: (v: number) => number,
  boundary: number,
  height: number
): void {
  g.append("line")
    .attr("x1", x(boundary)).attr("x2", x(boundary))
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", "#94a3b8").attr("stroke-dasharray", "6 3").attr("stroke-width", 1);
  g.append("text")
    .attr("x", x(boundary) + 4).attr("y", 12)
    .attr("font-size", "10px")
    .attr("fill", "#94a3b8")
    .text("Forecast →");
}

// fn is stored in a ref so the effect body never sees a stale closure.
// The effect intentionally runs only on mount — callers must pass stable (module-level) functions.
export function useDataFetch<T>(fn: () => Promise<T>, initial: T): { data: T; error: string | null } {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let mounted = true;
    fnRef.current().then((result) => {
      if (mounted) setData(result);
    }).catch((err) => {
      if (mounted) {
        if (process.env.NODE_ENV === "development") console.error(err);
        setError(err instanceof Error ? err.message : String(err) || "Failed to load data.");
      }
    });
    return () => { mounted = false; };
  }, []);
  return { data, error };
}

// Syncs isDark into a ref so D3 draw effects can read the current theme value without
// taking isDark as a dependency (which would trigger expensive full redraws on toggle).
// The separate [isDark] theme-update effect handles colour changes cheaply.
export function useThemeRef(isDark: boolean): MutableRefObject<boolean> {
  const ref = useRef(isDark);
  useEffect(() => { ref.current = isDark; }, [isDark]);
  return ref;
}

type SVGRootSelection = Selection<SVGSVGElement, unknown, null, undefined>;

// Updates chart colours on theme change without a full redraw.
// Assumes the chart uses class names: .grid-h, .tick-dot, .chart-axis, .chart-crosshair.
export function applyThemeToChart(svg: SVGRootSelection, isDark: boolean): void {
  svg.selectAll(".grid-h").attr("stroke", isDark ? "#334155" : "#e2e8f0");
  svg.selectAll(".tick-dot").attr("fill", isDark ? "#000" : "#fff");
  svg.selectAll<SVGTextElement, unknown>(".chart-axis text").attr("fill", isDark ? "#94a3b8" : "#64748b");
  svg.selectAll(".chart-crosshair").attr("stroke", isDark ? "#94a3b8" : "#64748b");
}

export function useContainerSize(ref: RefObject<Element | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    let tid: ReturnType<typeof setTimeout>;
    let mounted = true;
    const obs = new ResizeObserver((entries) => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        if (mounted) {
          const { width, height } = entries[0].contentRect;
          setSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }, 150);
    });
    obs.observe(ref.current);
    return () => { mounted = false; clearTimeout(tid); obs.disconnect(); };
  }, [ref]);
  return size;
}
