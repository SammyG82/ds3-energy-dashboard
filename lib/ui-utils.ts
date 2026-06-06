import { useState, useEffect, useRef, useMemo, type RefObject, type MutableRefObject } from "react";
import type { CSSProperties } from "react";
import * as d3 from "d3";
import type { Selection } from "d3";
import type { EvRow, OilRow } from "@/lib/data";

export const HEADER_HEIGHT_PX = 96;

export const CHART_TEXT = { dark: "#94a3b8", light: "#64748b" } as const;
export const GRID_STROKE = { dark: "#334155", light: "#e2e8f0" } as const;
export const FORECAST_DASH = "6 3";

// Counts client-side pushState/replaceState calls since module init. Resets to 0 on every
// hard page reload (the module re-initialises). Stays > 0 through any client-side navigation.
// useHashScroll reads this inside the scroll effect to distinguish a hard load from a
// Next.js Link navigation — the performance navigation API can't make this distinction
// because it reflects the original hard-load type for the entire browser session.
// pushState dispatches "ds3-nav" to re-trigger the scroll effect.
// replaceState only increments _clientNavs (for reload detection) — NOT "ds3-nav", because
// Next.js calls replaceState multiple times for state management during navigation, and each
// dispatch would re-run the scroll effect and cancel the verify timer before it fires.
let _clientNavs = 0;
if (typeof window !== "undefined") {
  type PatchableNavFn = typeof history.pushState & { __ds3Patched?: boolean };
  if (!(history.pushState as PatchableNavFn).__ds3Patched) {
    const _orig = history.pushState.bind(history);
    history.pushState = Object.assign(
      function (...args: Parameters<typeof history.pushState>) {
        _clientNavs++; window.dispatchEvent(new CustomEvent("ds3-nav")); return _orig(...args);
      },
      { __ds3Patched: true as const }
    );
  }
  if (!(history.replaceState as PatchableNavFn).__ds3Patched) {
    const _orig = history.replaceState.bind(history);
    history.replaceState = Object.assign(
      function (...args: Parameters<typeof history.replaceState>) {
        _clientNavs++; return _orig(...args);
      },
      { __ds3Patched: true as const }
    );
  }
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
    .attr("stroke", isDark ? GRID_STROKE.dark : GRID_STROKE.light).attr("stroke-dasharray", "3").attr("opacity", 0.7);
}

export function drawForecastBoundary(
  g: GSelection,
  x: (v: number) => number,
  boundary: number,
  height: number,
  isDark = false
): void {
  const color = isDark ? CHART_TEXT.dark : CHART_TEXT.light;
  g.append("line")
    .attr("class", "chart-forecast-boundary")
    .attr("x1", x(boundary)).attr("x2", x(boundary))
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", color).attr("stroke-dasharray", FORECAST_DASH).attr("stroke-width", 1);
  g.append("text")
    .attr("class", "chart-forecast-boundary")
    .attr("x", x(boundary) + 4).attr("y", 12)
    .attr("font-size", "10px")
    .attr("fill", color)
    .text("Forecast →");
}

// fn is stored in a ref so the effect body never sees a stale closure.
// The effect intentionally runs only on mount — callers must pass stable (module-level) functions.
export function useDataFetch<T>(fn: () => Promise<T>, initial: T): { data: T; error: string | null; } {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    let mounted = true;
    setError(null);
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
  svg.selectAll(".grid-h").attr("stroke", isDark ? GRID_STROKE.dark : GRID_STROKE.light);
  svg.selectAll(".tick-dot").attr("fill", isDark ? "#000" : "#fff");
  svg.selectAll<SVGTextElement, unknown>(".chart-axis text").attr("fill", isDark ? CHART_TEXT.dark : CHART_TEXT.light);
  svg.selectAll(".chart-crosshair").attr("stroke", isDark ? CHART_TEXT.dark : CHART_TEXT.light);
  const boundaryColor = isDark ? CHART_TEXT.dark : CHART_TEXT.light;
  svg.selectAll<SVGLineElement, unknown>("line.chart-forecast-boundary").attr("stroke", boundaryColor);
  svg.selectAll<SVGTextElement, unknown>("text.chart-forecast-boundary").attr("fill", boundaryColor);
}

export function drawCrosshair(
  g: GSelection,
  height: number,
  isDarkRef: MutableRefObject<boolean>
): Selection<SVGLineElement, unknown, any, unknown> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return g.append("line")
    .attr("class", "chart-crosshair")
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", isDarkRef.current ? CHART_TEXT.dark : CHART_TEXT.light)
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

export function useOilForecastBoundary(data: OilRow[]): number {
  return useMemo(() => {
    const fcYears = data.filter((d) => d.Type === "Forecast").map((d) => d.Year);
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
      if (!entries[0]) return;
      tid = setTimeout(() => {
        if (mounted) {
          const { width, height } = entries[0].contentRect;
          setSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }, 150);
    });
    obs.observe(ref.current);
    // Capture initial size synchronously so charts don't start with width=0 on first render
    const { width, height } = ref.current.getBoundingClientRect();
    if (width > 0) setSize({ width: Math.floor(width), height: Math.floor(height) });
    return () => { mounted = false; clearTimeout(tid); obs.disconnect(); };
  }, []);
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
  const scrolledForNavRef = useRef(-1);
  const isChartDrawnRef = useRef(isChartDrawn);
  isChartDrawnRef.current = isChartDrawn;

  // Bridges the module-level _clientNavs counter into React state so the scroll effect
  // re-runs on each navigation. "ds3-nav" is dispatched by the pushState/replaceState patch
  // above. "popstate" covers browser back/forward navigation. Without navCount, if the
  // component is reused by the Next.js router cache with ready=true already, the scroll
  // effect never re-runs on subsequent navigations.
  const [navCount, setNavCount] = useState(0);
  useEffect(() => {
    const onNav = () => setTimeout(() => setNavCount((c) => c + 1), 0);
    window.addEventListener("ds3-nav", onNav);
    return () => { window.removeEventListener("ds3-nav", onNav); };
  }, []);

  useEffect(() => {
    if (scrolledForNavRef.current === navCount || !ready) return;
    // Normalize: Next.js sometimes produces compound hashes on same-page navigation,
    // e.g. #ev-sales-by-country#ev-sales-projections (oldHash#newHash) or
    // #ev-sales-by-country#ev-sales-by-country (same link twice). Always take the last
    // fragment — it is the intended destination regardless of which case we're in.
    const rawHash = window.location.hash;
    const hash = rawHash ? '#' + rawHash.slice(1).split('#').pop()! : '';
    // _clientNavs is read here (inside the effect) rather than at render time because
    // Next.js App Router calls pushState during the commit phase — after render but
    // before effects. On the first visit, navCount=0 (the "ds3-nav" event fired before
    // the listener was registered), so _clientNavs is the reliable reload-check signal.
    if (!(_clientNavs > 0)) {
      // Hard page load — on reload, return to top rather than jumping to the hash anchor.
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navEntry?.type === "reload") {
        scrolledForNavRef.current = navCount;
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    if (!hash) { scrolledForNavRef.current = navCount; return; }
    scrolledForNavRef.current = navCount;

    let verifyTid: ReturnType<typeof setTimeout> | undefined;
    let onScrollListener: (() => void) | undefined;
    const doScroll = () => {
      const el = document.getElementById(hash.slice(1));
      if (!el) return;
      const targetScrollY = window.scrollY + el.getBoundingClientRect().top - headerHeightPx;
      const targetPathname = window.location.pathname;
      let corrected = false;
      const scrollToTarget = () => { window.scrollTo({ top: targetScrollY, behavior: "instant" }); };
      scrollToTarget();
      onScrollListener = () => {
        const drift = window.scrollY - targetScrollY;
        if (corrected) return;
        // Skip if navigated away — correcting scroll on a different page causes Next.js
        // to push a malformed URL (compound hash) for the return navigation.
        if (window.location.pathname !== targetPathname) return;
        if (Math.abs(drift) > 20) { corrected = true; scrollToTarget(); }
      };
      window.addEventListener("scroll", onScrollListener, { passive: true });
      verifyTid = setTimeout(() => {
        window.removeEventListener("scroll", onScrollListener!);
        onScrollListener = undefined;
      }, 1500);
    };

    // Delay doScroll by 200ms after isChartDrawn is first satisfied. useContainerSize
    // captures width synchronously (getBoundingClientRect, border-box) then ResizeObserver
    // fires 150ms later with contentRect (content-box). These differ on padded containers,
    // triggering a redraw at T+150ms. On cached second visits charts draw fast (~50ms),
    // so without the delay doScroll fires before the ResizeObserver settles and the
    // resulting height change shifts the target after the scroll. 200ms > 150ms debounce.
    let drawTid: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let safeTid: ReturnType<typeof setTimeout> | undefined;

    const scheduleScroll = () => { drawTid = setTimeout(doScroll, 200); };

    if (isChartDrawnRef.current(hash)) {
      // Cached visit: charts already drawn, so Next.js's router scroll restoration
      // (~T=250ms) would override an immediate scroll. Wait 300ms first so doScroll
      // fires at T≈500ms — safely after the restoration settles.
      drawTid = setTimeout(scheduleScroll, 300);
    } else {
      intervalId = setInterval(() => {
        if (isChartDrawnRef.current(hash)) {
          clearInterval(intervalId);
          clearTimeout(safeTid);
          scheduleScroll();
        }
      }, 50);
      safeTid = setTimeout(() => { clearInterval(intervalId); clearTimeout(drawTid); doScroll(); }, 2000);
    }

    return () => {
      clearInterval(intervalId); clearTimeout(safeTid); clearTimeout(drawTid); clearTimeout(verifyTid);
      if (onScrollListener) { window.removeEventListener("scroll", onScrollListener); onScrollListener = undefined; }
    };
  }, [ready, navCount, headerHeightPx]);
}

// Applies theme colours to a chart SVG whenever `isDark` changes.
// Covers the standard class set: .grid-h, .tick-dot, .chart-axis, .chart-crosshair.
export function useChartTheme(svgRef: RefObject<SVGSVGElement | null>, isDark: boolean): void {
  useEffect(() => {
    if (!svgRef.current) return;
    applyThemeToChart(d3.select(svgRef.current), isDark);
  }, [isDark]);
}
