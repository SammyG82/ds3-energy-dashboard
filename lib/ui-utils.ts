import { useState, useEffect, useRef, useMemo, type RefObject, type MutableRefObject } from "react";
import type { CSSProperties } from "react";
import * as d3 from "d3";
import type { Selection } from "d3";
import type { EvRow } from "@/lib/data";

export const HEADER_HEIGHT_PX = 96;

// Counts client-side pushState calls since module init. Resets to 0 on every hard
// page reload (the module re-initialises). Stays > 0 through any client-side navigation.
// useHashScroll reads this at component mount time to distinguish a hard load from a
// Next.js Link navigation — the performance navigation API can't make this distinction
// because it reflects the original hard-load type for the entire browser session.
let _clientNavs = 0;
if (typeof window !== "undefined") {
  const _origPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    _clientNavs++;
    return _origPushState(...args);
  };
}

export function tooltipStyle(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  clampN: number,
  tipWidth = 220
): CSSProperties {
  return {
    left: x < containerWidth * 0.6 ? Math.min(x + 14, Math.max(0, containerWidth - tipWidth)) : undefined,
    right: x >= containerWidth * 0.6 ? Math.min(Math.max(0, containerWidth - x + 14), Math.max(0, containerWidth - tipWidth)) : undefined,
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
    .attr("stroke", isDark ? "#334155" : "#e2e8f0").attr("stroke-dasharray", "3").attr("opacity", 0.7);
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
        setError(err instanceof Error ? err.message || "Failed to load data." : String(err) || "Failed to load data.");
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

export function drawCrosshair(
  g: GSelection,
  height: number,
  isDarkRef: MutableRefObject<boolean>
) {
  return g.append("line")
    .attr("class", "chart-crosshair")
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", isDarkRef.current ? "#94a3b8" : "#64748b")
    .attr("stroke-width", 1).attr("stroke-dasharray", "4 2")
    .style("visibility", "hidden").style("pointer-events", "none");
}

export function drawTickDot(
  g: GSelection,
  cx: number,
  cy: number,
  color: string,
  isDarkRef: MutableRefObject<boolean>,
  opacity?: number
): void {
  const dot = g.append("circle")
    .attr("class", "tick-dot")
    .attr("cx", cx).attr("cy", cy).attr("r", 3)
    .attr("fill", isDarkRef.current ? "#000" : "#fff")
    .attr("stroke", color).attr("stroke-width", 2)
    .style("pointer-events", "none");
  if (opacity !== undefined) dot.attr("opacity", opacity);
}

export function useEvForecastBoundary(data: EvRow[]): number {
  return useMemo(() => {
    const fcYears = data.filter((d) => d.type === "Forecast").map((d) => d.year);
    return fcYears.length > 0 ? Math.min(...fcYears) : Infinity;
  }, [data]);
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

// Scrolls to the URL hash once the chart is drawn after data loads.
// `isChartDrawn` receives the hash string and returns true when the target
// SVG content exists. `ready` should flip true when the minimum required
// data has loaded.
export function useHashScroll(
  isChartDrawn: (hash: string) => boolean,
  ready: boolean,
  headerHeightPx = HEADER_HEIGHT_PX
): void {
  const scrolledRef = useRef(false);
  const isChartDrawnRef = useRef(isChartDrawn);
  isChartDrawnRef.current = isChartDrawn;
  // Captured at mount time: any pushState before this component mounted means we
  // arrived via a Next.js Link, not a hard page load. Hard reload resets _clientNavs
  // to 0 (module re-initialises), so this is false only on genuine hard loads.
  const arrivedViaClientNav = useRef(_clientNavs > 0);

  useEffect(() => {
    if (scrolledRef.current || !ready) return;
    const hash = window.location.hash;
    if (!arrivedViaClientNav.current) {
      // Hard page load — on reload, return to top rather than jumping to the hash anchor.
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navEntry?.type === "reload") {
        scrolledRef.current = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (!hash) return;
    scrolledRef.current = true;

    const doScroll = () => {
      const el = document.querySelector(hash);
      if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - headerHeightPx, behavior: "instant" });
    };

    if (isChartDrawnRef.current(hash)) { doScroll(); return; }

    let safeTid: ReturnType<typeof setTimeout> | undefined;
    const intervalId = setInterval(() => {
      if (isChartDrawnRef.current(hash)) {
        clearInterval(intervalId);
        clearTimeout(safeTid);
        doScroll();
      }
    }, 50);
    safeTid = setTimeout(() => { clearInterval(intervalId); doScroll(); }, 2000);

    return () => { clearInterval(intervalId); clearTimeout(safeTid); };
  }, [ready, headerHeightPx]);
}

// Applies theme colours to a chart SVG whenever `isDark` changes.
// Covers the standard class set: .grid-h, .tick-dot, .chart-axis, .chart-crosshair.
export function useChartTheme(svgRef: RefObject<SVGSVGElement | null>, isDark: boolean): void {
  useEffect(() => {
    if (!svgRef.current) return;
    applyThemeToChart(d3.select(svgRef.current), isDark);
  }, [svgRef, isDark]);
}
